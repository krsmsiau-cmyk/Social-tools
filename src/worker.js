const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
const json = (data, status=200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
const isIG = h => h === 'instagram.com' || h === 'www.instagram.com';
const isMediaHost = h => h === 'cdninstagram.com' || h.endsWith('.cdninstagram.com') || h === 'fbcdn.net' || h.endsWith('.fbcdn.net');
const decode = s => s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\\u0026/g,'&').replace(/\\\//g,'/');
function pick(html, name) {
  const tags = html.match(/<meta\s+[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[m[1].toLowerCase()] = m[3];
    if (attrs.property === name || attrs.name === name) return decode(attrs.content || '');
  }
  return '';
}
function validateIG(raw) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || !isIG(u.hostname) || !/^\/(p|reel|tv)\/[\w-]+\/?$/.test(u.pathname)) throw Error('請貼上有效的公開 Instagram 貼文或 Reels 網址');
  return `https://www.instagram.com${u.pathname}`;
}
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/resolve' && request.method === 'POST') {
   try {
    const body = await request.json();
    const link = validateIG(String(body.url || ''));
    const response = await fetch(link, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MediaPreview/1.0)', 'accept': 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    if (!response.ok) return json({error: `Instagram 無法讀取此貼文（HTTP ${response.status}）。可能需要登入或限制了自動存取。`}, 422);
    const html = await response.text();
    const candidates = [
      { url: pick(html, 'og:video:secure_url') || pick(html, 'og:video'), type: 'video' },
      { url: pick(html, 'og:image:secure_url') || pick(html, 'og:image'), type: 'image' }
    ];
    const media = [];
    for (const item of candidates) {
      try { const u = new URL(item.url); if (u.protocol === 'https:' && isMediaHost(u.hostname) && !media.some(x => x.url === u.href)) media.push({ ...item, url: u.href }); } catch {}
    }
    if (!media.length) return json({ error: '無法從這篇貼文取得可下載的媒體。Instagram 可能封鎖解析，或只提供頁面預覽。' }, 422);
    return json({ media, notice: '目前只能取得公開頁面所揭露的媒體；輪播貼文可能只取得封面，無法保證所有圖片。' });
   } catch (e) { return json({error: e instanceof SyntaxError ? '請輸入正確資料' : e.message}, 400); }
  }
  if (url.pathname === '/api/media' && request.method === 'GET') {
   try {
    const target = new URL(url.searchParams.get('url') || '');
    if (target.protocol !== 'https:' || !isMediaHost(target.hostname)) return json({error:'不支援的媒體來源'},400);
    const upstream = await fetch(target.href, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if (!upstream.ok) return json({error:`媒體已失效或拒絕存取 (${upstream.status})`},502);
    const type = upstream.headers.get('content-type') || '';
    if (!/^(image\/|video\/|application\/octet-stream)/i.test(type)) return json({error:'來源不是可下載的圖片或影片'},422);
    const headers = new Headers({ 'content-type': type, 'cache-control': 'private, no-store', 'x-content-type-options':'nosniff', 'content-disposition':'attachment; filename="instagram-media"' });
    if (upstream.headers.has('content-length')) headers.set('content-length', upstream.headers.get('content-length'));
    return new Response(upstream.body, {status:200, headers});
   } catch { return json({error:'媒體連結無效或連線失敗'},400); }
  }
  if (url.pathname.startsWith('/api/')) return json({error:'找不到 API'},404);
  return env.ASSETS.fetch(request);
 }
};

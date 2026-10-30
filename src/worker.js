const HEADERS = {'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const isIG = h=>h==='instagram.com'||h==='www.instagram.com';
const isMediaHost = h=>h==='cdninstagram.com'||h.endsWith('.cdninstagram.com')||h==='fbcdn.net'||h.endsWith('.fbcdn.net');
const decode = s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\\u0026/g,'&').replace(/\\\//g,'/');
function pick(html,name){const tags=html.match(/<meta\s+[^>]*>/gi)||[];for(const tag of tags){const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))attrs[m[1].toLowerCase()]=m[3];if(attrs.property===name||attrs.name===name)return decode(attrs.content||'');}return '';}
function validateIG(raw){const u=new URL(raw);if(u.protocol!=='https:'||!isIG(u.hostname)||!/^\/(p|reel|reels|tv)\/[\w-]+\/?$/.test(u.pathname))throw Error('請貼上有效的公開 Instagram 貼文或 Reels 網址');return `https://www.instagram.com${u.pathname}`;}
function validateMedia(raw){const u=new URL(raw);if(u.protocol!=='https:'||!isMediaHost(u.hostname)||u.username||u.password||u.port)throw Error('不支援的媒體來源');return u;}
async function upstreamFetch(target,headers={}){return fetch(target.href,{headers,redirect:'manual',signal:AbortSignal.timeout(20000)});}
export default {async fetch(request,env){const url=new URL(request.url);
if(url.pathname==='/api/resolve'&&request.method==='POST'){
try{const body=await request.json();const link=validateIG(String(body.url||''));const response=await fetch(link,{headers:{'user-agent':'Mozilla/5.0 (compatible; MediaPreview/1.0)','accept':'text/html'},redirect:'follow',signal:AbortSignal.timeout(12000)});
if(!response.ok)return json({error:`Instagram 無法讀取此貼文（HTTP ${response.status}），可能需要登入或限制自動存取。`},422);
const html=await response.text();const candidates=[{url:pick(html,'og:video:secure_url')||pick(html,'og:video')||pick(html,'twitter:player:stream'),type:'video'},{url:pick(html,'og:image:secure_url')||pick(html,'og:image'),type:'image'}];const media=[];
for(const item of candidates){try{const u=validateMedia(item.url);if(!media.some(x=>x.url===u.href))media.push({type:item.type,url:u.href});}catch{}}
if(!media.length)return json({error:'無法從這篇貼文取得媒體。Instagram 可能限制了公開頁面的自動解析。'},422);
const videoAvailable=media.some(x=>x.type==='video');return json({media,source:link,videoAvailable,notice:videoAvailable?'已找到影片來源；若播放失敗，可能是影片網址失效或來源拒絕存取。':'目前只能取得封面圖片，沒有可播放的影片網址。可開啟 Instagram 原貼文觀看。'});
}catch(e){return json({error:e instanceof SyntaxError?'請輸入正確資料':e.message},400);}}
if(url.pathname==='/api/media'&&(request.method==='GET'||request.method==='HEAD')){
try{const target=validateMedia(url.searchParams.get('url')||'');const range=request.headers.get('range');if(range&&!/^bytes=\d*-\d*$/.test(range))return json({error:'不支援的影片範圍'},416);
const upstream=await upstreamFetch(target,range?{'range':range}:{});if(upstream.status>=300&&upstream.status<400)return json({error:'媒體來源重新導向，無法安全取得'},502);
if(!upstream.ok)return json({error:`媒體已失效或拒絕存取 (${upstream.status})`},502);
const type=upstream.headers.get('content-type')||'';if(!/^(image\/|video\/|application\/octet-stream)/i.test(type))return json({error:'來源不是可播放或下載的媒體'},422);
const headers=new Headers({'content-type':type,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':url.searchParams.get('download')==='1'?'attachment; filename="instagram-media"':'inline'});
for(const key of ['content-length','content-range','accept-ranges'])if(upstream.headers.has(key))headers.set(key,upstream.headers.get(key));
return new Response(request.method==='HEAD'?null:upstream.body,{status:upstream.status===206?206:200,headers});
}catch(e){return json({error:e.message||'媒體連結無效或連線失敗'},400);}}
if(url.pathname.startsWith('/api/'))return json({error:'找不到 API'},404);
return env.ASSETS.fetch(request);
}};

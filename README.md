# IG Saver

Cloudflare Workers + static assets Instagram public media preview/download tool.

## 版本

**v1.2.0 — 2026-10-31**

- 網站左上方新增版本號，點擊可查看更新說明。
- 延續 v1.1 的媒體縮圖點擊預覽功能（圖片放大、影片播放器）。
- 延續 v1.1 的一鍵貼上 Instagram 網址按鈕。
- 保留單張下載與 ZIP 下載。

### 已知限制

Instagram 若僅提供封面圖片而無有效影片 URL，網站無法憑封面播放影片。剪貼簿功能需瀏覽器支援及使用者授權。

## 部署

將 `public/index.html`、`src/worker.js` 與 `wrangler.toml` 放在 GitHub 專案對應位置。Cloudflare Workers Builds 使用 `npx wrangler deploy`。


## v1.2.1 (2026-10-31)
- Show a persistent version badge beside IG Saver.
- Keep the clipboard paste button visible on narrow mobile screens.
- Keep image preview and video playback for available video URLs.
- No backend changes.

# IG Saver - Cloudflare Workers

簡約黑白 IG 媒體下載網頁，包含前端、Worker API、單張下載與瀏覽器端 ZIP 打包。

## 部署到 Cloudflare（推薦）

1. 安裝 Node.js 20+。
2. 解壓縮本專案並開啟終端機，進入 `ig-cloudflare` 資料夾。
3. 執行 `npx wrangler login`，在瀏覽器登入 Cloudflare。
4. 執行 `npx wrangler deploy`。
5. Wrangler 會提供一個 `https://ig-media-saver.<你的子網域>.workers.dev` 網址。

本專案不需要 Python、資料庫或 API Key。Cloudflare Workers 靜態資源透過 assets binding 提供。

## 本機測試

`npx wrangler dev`，開啟輸出所顯示的本機網址。

## 重要限制

- 只嘗試解析 Instagram **公開貼文** HTML 中的 `og:image`、`og:video` 標籤，無法保證 Instagram 允許 Cloudflare Workers 讀取。
- 輪播貼文可能只能取得封面，無法保證全部圖片；私人貼文或需登入的貼文不支援。
- 媒體下載 URL 可能過期，且 Instagram CDN 可能拒絕跨站請求。
- ZIP 在使用者瀏覽器記憶體中組裝，過大影片可能導致記憶體不足。ZIP 採用 STORE（不壓縮）模式。
- 下載端點只允許 Instagram 已知 CDN 網域，不是任意 URL 代理。
- 請僅下載你有權保存的媒體，並遵守平台條款及著作權規定。

## 檔案

- `wrangler.toml`：Cloudflare Workers 設定
- `src/worker.js`：解析公開貼文及媒體代理
- `public/index.html`：響應式前端、單張與 ZIP 下載

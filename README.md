# Install and run
1.install mongodb https://www.mongodb.com/try/download/community
2.npm install
3.npm run start



# 跑腿服務平台（MVP）

4 人初學者團隊專案。API 設計文件喺 `doc/0825-document.docx`

## 結構

- `my-express-backend/` —— 後端（Node.js ESM + Express 5 + MongoDB），Port 3000
- `html/` —— 前端（純 HTML/CSS/JS，冇框架、冇 build）
- `doc/` —— 設計文件

## 快速開始

### 1. 起後端

```bash
brew services start mongodb-community
cd my-express-backend
npm install
npm run dev        # http://127.0.0.1:3000
```

### 2. 開前端

後端起咗之後，直接用 browser 開 **http://127.0.0.1:3000/** 就見到介面
（後端會 serve `html/` 靜態頁，健康檢查搬咗去 `/api/health`）。

亦可以唔經 server：double-click `html/index.html`（file:// 開都得，
前端會自動改用絕對 URL fetch 後端，CORS 已全開）。

## 頁面

| 頁面 | 檔案 | 依賴嘅後端 | 狀態 |
|---|---|---|---|
| 任務大廳（tabs：大廳 / 我發佈 / 我接咗 + 篩選 + 分頁） | index.html | GET /errand/tasks | 等 B |
| 登入 | login.html | POST /auth/login | ✅ 可用 |
| 註冊 | register.html | POST /auth/register | ✅ 可用 |
| 發佈任務 | publish.html | POST /errand/tasks + GET /errand/regions | 等 B |
| 任務詳情（接單 / 取消 / 送達 / 確認） | task.html?id=xxx | GET/POST/PATCH /errand/tasks | 等 B/C |

未上線嘅 task 頁面會顯示「呢個 API 未上線」橫幅（後端回 4040 Route Not Found），B/C 完成後**自動轉正，唔使改前端**——前端完全照 doc §3 合約寫。

## 分工（doc §8）

| 人 | 負責 | 狀態 |
|---|---|---|
| A | 基建 + Auth（統一回應、錯誤碼、traceId、JWT） | ✅ 完成 |
| B | 發佈任務 / 列表 / 詳情（後端 `src/routes/taskRoutes.js` 有 TODO 指引） | 進行中 |
| C | 接單 / 狀態變更 | 待開始 |
| D | 地區資料 + node-cron 排程（24h 流標）+ Postman | 待開始 |

## Git 存檔點

```bash
git add -A && git commit -m "存檔點：寫咗乜嘢一句講晒"
```

## 前端開發注意

- **唔可以用 ES modules**（file:// 下 Chrome 擋 import）—— 新 script 一律 classic script + 全域 function，頁面 script 包 IIFE
- API 呼叫全部經 `html/js/api.js` 嘅 `api.get / api.post / api.patch`，攞到嘅直接係 `body`（envelope 拆好咗）
- 成功唯一標準係 `header.code === 0`（唔好睇 HTTP status，register 係 201）
- 所有用戶輸入 render 前要過 `escapeHtml()`（防 XSS）
- 遮罩（接單後可見）由後端做，前端原樣顯示
- 新增共用元件放 `html/js/common.js`；錯誤碼中文訊息表喺 `ERROR_MESSAGES`

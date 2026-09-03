# 跑腿服務平台 API（MVP 精簡版）

規格文件：[doc/0825-document.docx](../doc/0825-document.docx)

## 快速開始

```bash
npm install
cp .env.example .env   # 已有 .env 就跳過，記得改 SESSION_SECRET
npm run dev            # 開發模式（改 code 自動重啟）；或者 npm start
```

需要本機 MongoDB（`brew services start mongodb-community` 或 Atlas），連唔到 server 會直接報錯退出。

## 統一回應格式（doc §0.3）

```json
{
  "header": { "traceId": "uuid", "module": "auth_api", "timespend": 25, "code": 0, "msg": "success" },
  "body": { ... }
}
```

錯誤碼表見 [src/constants/errorCodes.js](src/constants/errorCodes.js) —— 唯一來源，唔好喺其他地方寫死。

## 點樣加新 API（照呢條路行）

1. 需要新錯誤碼 → 加落 `constants/errorCodes.js`
2. 需要新資料 → 加 `models/` schema
3. 業務邏輯（校驗 → 查/改 DB）→ 寫 `services/xxxService.js`，出錯 `throw new AppError(code)`
4. 回應 → `controllers/xxxController.js`，用 `ok(res, body)` 就得
5. 掛 route → `routes/xxxRoutes.js`，記住 `router.use(scope('errand_api'))`
6. 用 Postman 試，成功/失敗格式都 check 一次

寫法參考：Auth 模組（register → login → me）係完整嘅「黃金路徑」示範。

## 分工（doc §8）

| 人 | 負責 | 狀態 |
|---|---|---|
| A | 基建 + Auth 模組 + 錯誤處理 | ✅ 完成，作為示範 |
| B | 發佈任務 / 列表 / 詳情（脫敏） | → `routes/taskRoutes.js` 有 TODO |
| C | 搶單（原子更新）/ 狀態變更 | → `routes/taskRoutes.js` 有 TODO |
| D | 地區資料補齊 + node-cron 排程 + Postman collection + 整合測試 | `constants/regions.js` 有 TODO |

## 團隊決定咗嘅嘢（doc 冇定義，記得同組員講）

- **4040**「Route Not Found」係團隊自訂錯誤碼（doc 表冇）
- **`GET /api/auth/me`** 係團隊自訂（doc 冇，但前端需要知自己係邊個）
- **認證用 session cookie**（`express-session`，2 小時過期）：login/register 設 session + `Set-Cookie`（HttpOnly / SameSite=Lax），`POST /api/auth/logout` 銷毀 session。doc 原文係 JWT Bearer，已全線替換；前端只記「已登入」旗標，唔存 token
- **CSRF 防護**：改動型請求（POST/PATCH/DELETE）帶 Origin 一定要同源，否則 403/4003（doc 冇定義）
- **`timestamps: true`** 代替 doc 手動 createdAt/updatedAt 欄位，Mongoose 自動管理（排程 D 用嘅 updatedAt 會自動更新）
- **手機格式用香港 8 位**（首位 4-9，例：`91234567`）；doc 原文係台灣格式，前端 `register.js`/`publish.js` 嘅 client 校驗都跟住改咗
- **地區資料用香港三大區域 + 18 區**（`constants/regions.js`），doc 原文係台灣示範資料

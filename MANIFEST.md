# Public Repo 檔案清單

更新日期：2026-07-17

## 檔案

| 路徑 | 用途 |
|---|---|
| `index.html` | Prompt-only 公開版主程式與頁面 |
| `src/prompts.js` | 題庫、能力導向與 Prompt B 文字規格模組 |
| `README.md` | 公開版使用說明 |
| `MANIFEST.md` | 本清單 |
| `scripts/smoke-local-parser-validator.js` | 本機 H1 解析、Markdown 表格、題組配分與 Prompt 固定 H1 檢測 |

## Prompt-only 原則

本 repo 只保留公開版前端與本機檢測腳本：

- 不包含 `backend/`。
- 不包含 `tools/`。
- 不包含 API key、token、secret。
- 不包含 Apps Script URL。
- 不包含 `.zip` 或 `.exe` 工具檔。
- 不包含內部審稿紀錄。

## 本機檢測

執行：

```powershell
node .\scripts\smoke-local-parser-validator.js
```

目前同步後檢測結果：

```text
status: pass
total: 46
passed: 46
failed: 0
```

檢測內容包含：

- H1 區塊擷取。
- Markdown 表格解析。
- 題組配分驗算。
- Prompt A 固定 H1。
- Prompt B 固定 H1。
- 找不到區塊、缺欄位、無題組、孤兒子題、分數格式等 edge cases。

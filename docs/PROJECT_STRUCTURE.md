# 📁 項目結構詳細說明

## 🎯 概述

Carbon Management System 採用前後端分離架構，使用 npm workspaces 進行統一管理。本文檔詳細說明項目的目錄結構和各個文件的作用。

## 🏗️ 整體架構

```
carbon-management-system/
├── 📁 backend/           # 後端 API 服務
├── 📁 frontend/          # 前端 UI 應用
├── 📁 shared/            # 共享配置
├── 📁 docs/              # 項目文檔
├── 📁 docker/            # Docker 配置
└── 📄 根目錄文件
```

## 📂 詳細目錄結構

### 🖥️ 後端 (backend/)

```
backend/
├── 📁 src/                    # 源代碼目錄
│   ├── 📁 config/            # 配置文件
│   │   └── 📄 env.ts         # 環境變量配置
│   ├── 📁 db/               # 數據庫相關
│   │   ├── 📄 index.ts      # 數據庫連接
│   │   ├── 📄 schema.ts     # 數據庫表結構定義
│   │   └── 📁 seed/         # 數據庫種子數據
│   │       ├── 📄 fake.ts   # 假數據生成
│   │       ├── 📄 run.ts    # 種子數據執行
│   │       └── 📄 system.ts # 系統初始數據
│   ├── 📁 middleware/       # Express 中間件
│   │   ├── 📄 auth.ts       # JWT 認證中間件
│   │   └── 📄 error.ts      # 錯誤處理中間件
│   ├── 📁 routes/           # API 路由
│   │   ├── 📄 auth.routes.ts    # 認證相關路由
│   │   ├── 📄 carbon.routes.ts  # 碳管理路由
│   │   ├── 📄 admin.routes.ts   # 管理員路由
│   │   └── 📄 index.ts          # 路由整合
│   ├── 📁 types/            # TypeScript 類型定義
│   │   └── 📄 express.d.ts  # Express 類型擴展
│   ├── 📁 utils/            # 工具函數
│   │   ├── 📄 passwords.ts  # 密碼處理工具
│   │   └── 📄 responses.ts  # 統一回應格式
│   ├── 📁 validators/       # 數據驗證
│   │   ├── 📄 auth.validator.ts    # 認證數據驗證
│   │   └── 📄 carbon.validator.ts  # 碳數據驗證
│   ├── 📄 app.ts           # Express 應用配置
│   └── 📄 server.ts        # 服務器啟動文件
├── 📁 tests/               # 測試文件
│   └── 📄 auth.test.ts     # 認證功能測試
├── 📄 package.json         # 後端依賴配置
├── 📄 package-lock.json    # 依賴鎖定文件
├── 📄 tsconfig.json        # TypeScript 配置
└── 📄 drizzle.config.ts    # Drizzle ORM 配置
```

### 🎨 前端 (frontend/)

```
frontend/
├── 📁 src/                     # 源代碼目錄
│   ├── 📁 content/            # 頁面內容
│   │   ├── 📁 page/           # 各種頁面
│   │   │   ├── 📁 page_login/     # 登入頁面
│   │   │   ├── 📁 page_register/  # 註冊頁面
│   │   │   ├── 📁 page_profile/   # 用戶資料頁面
│   │   │   ├── 📁 manager_dashboard/  # 管理員儀表板
│   │   │   ├── 📁 staff_dashboard/    # 員工儀表板
│   │   │   ├── 📁 boss_dashboard/     # 老闆儀表板
│   │   │   ├── 📁 page_projects/      # 專案管理
│   │   │   ├── 📁 page_contacts/      # 聯絡人管理
│   │   │   ├── 📁 page_inbox/         # 訊息收件匣
│   │   │   ├── 📁 page_chat/          # 即時聊天
│   │   │   └── 📁 page_error/         # 錯誤頁面
│   │   ├── 📁 settings/       # 設定頁面
│   │   │   ├── 📁 settings_theme_modes/    # 主題模式設定
│   │   │   ├── 📁 settings_skin_options/   # 外觀設定
│   │   │   ├── 📁 settings_layout_options/ # 版面配置
│   │   │   └── 📁 settings_how_it_works/   # 使用說明
│   │   └── 📁 docs/           # 文檔頁面
│   ├── 📁 custom/            # 自定義資源
│   │   ├── 📁 demo-data/     # 演示數據
│   │   ├── 📁 docs-data/     # 文檔數據
│   │   ├── 📁 lang/          # 多語言文件
│   │   ├── 📁 media/         # 媒體文件
│   │   ├── 📁 plugins/       # 自定義插件
│   │   └── 📁 webfonts/      # 網頁字體
│   ├── 📁 js/               # JavaScript 文件
│   │   ├── 📁 _config/      # 配置文件
│   │   ├── 📁 _modules/     # 模組文件
│   │   ├── 📄 manager-nav.js    # 管理員導航
│   │   ├── 📄 role-nav.js       # 角色導航
│   │   └── 📄 manifest.json     # PWA 清單
│   ├── 📁 scss/             # SCSS 樣式文件
│   │   ├── 📁 _extensions/  # 擴展樣式
│   │   ├── 📁 _imports/     # 導入文件
│   │   ├── 📁 _mixins/      # 混入文件
│   │   ├── 📁 _modules/     # 模組樣式
│   │   ├── 📁 _skins/       # 皮膚樣式
│   │   ├── 📁 _themes/      # 主題樣式
│   │   └── 📄 app.core.scss # 核心樣式
│   ├── 📁 template/         # 模板文件
│   │   ├── 📁 _helpers/     # 助手函數
│   │   ├── 📁 include/      # 包含文件
│   │   ├── 📁 layouts/      # 佈局模板
│   │   └── 📁 pages/        # 頁面模板
│   ├── 📁 img/              # 圖片資源
│   │   ├── 📁 backgrounds/  # 背景圖片
│   │   ├── 📁 card-backgrounds/ # 卡片背景
│   │   ├── 📁 demo/         # 演示圖片
│   │   ├── 📁 favicon/      # 網站圖標
│   │   ├── 📁 loading.gif   # 載入動畫
│   │   ├── 📁 splashscreens/ # 啟動畫面
│   │   ├── 📁 svg/          # SVG 圖標
│   │   └── 📁 thumbs/       # 縮略圖
│   ├── 📄 nav.json          # 導航配置
│   ├── 📄 favicon.ico       # 網站圖標
│   └── 📁 navigation/       # 導航配置
│       └── 📄 routes.json   # 路由配置
├── 📁 build/               # 構建配置
│   ├── 📄 build.js         # 構建腳本
│   ├── 📄 compile.js       # 編譯腳本
│   ├── 📄 connect.js       # 連接腳本
│   └── 📄 watch.js         # 監視腳本
├── 📁 dist/                # 構建輸出目錄
├── 📄 package.json         # 前端依賴配置
├── 📄 package-lock.json    # 依賴鎖定文件
├── 📄 gulpfile.js          # Gulp 構建配置
├── 📄 build.json           # 構建參數配置
├── 📄 plugins-list.txt     # 插件列表
├── 📄 role-validation.js   # 角色驗證
└── 📄 README.md            # 前端說明
```

### 🔧 共享配置 (shared/)

```
shared/
└── 📄 config.js            # 共享配置文件
    ├── API 配置
    ├── 數據庫配置
    ├── 前端配置
    ├── 後端配置
    ├── 環境配置
    └── JWT 配置
```

### 📚 文檔目錄 (docs/)

```
docs/
├── 📄 INTEGRATION_GUIDE.md     # 整合指南
├── 📄 PROJECT_STRUCTURE.md     # 項目結構說明 (本文件)
├── 📄 DOCKER_SETUP.md          # Docker 設置指南
├── 📄 DATABASE_URL_GUIDE.md    # 數據庫連接指南
├── 📄 ENV_SETUP.md             # 環境變量設置指南
└── 📄 API_DOCUMENTATION.md     # API 文檔
```

### 🐳 Docker 配置 (docker/)

```
docker/
├── 📄 Dockerfile              # Docker 映像配置
└── 📄 docker-compose.yml      # Docker Compose 配置
```

## 📄 根目錄文件

### 配置文件
- `package.json` - 根目錄配置 (npm workspaces)
- `package-lock.json` - 依賴鎖定文件
- `.gitignore` - Git 忽略文件
- `env.example` - 環境變量模板

### 文檔文件
- `README.md` - 項目主要說明文檔
- `INTEGRATION_GUIDE.md` - 整合指南 (已移至 docs/)

## 🔍 關鍵文件說明

### 後端關鍵文件

| 文件 | 作用 |
|------|------|
| `backend/src/app.ts` | Express 應用配置，中間件設置 |
| `backend/src/server.ts` | 服務器啟動文件 |
| `backend/src/db/schema.ts` | 數據庫表結構定義 |
| `backend/src/routes/` | API 路由定義 |
| `backend/drizzle.config.ts` | Drizzle ORM 配置 |

### 前端關鍵文件

| 文件 | 作用 |
|------|------|
| `frontend/gulpfile.js` | Gulp 構建配置 |
| `frontend/build.json` | 構建參數配置 |
| `frontend/src/nav.json` | 導航配置 |
| `frontend/src/template/` | Handlebars 模板 |
| `frontend/src/scss/app.core.scss` | 核心樣式文件 |

### 配置關鍵文件

| 文件 | 作用 |
|------|------|
| `package.json` | npm workspaces 配置 |
| `shared/config.js` | 共享配置 |
| `env.example` | 環境變量模板 |
| `.gitignore` | Git 忽略規則 |

## 🚀 開發流程

### 1. 後端開發
- 在 `backend/src/` 中開發 API
- 使用 TypeScript 編寫代碼
- 通過 `npm run dev` 啟動開發服務器

### 2. 前端開發
- 在 `frontend/src/` 中開發 UI
- 使用 SmartAdmin 框架
- 通過 `npm run gulp` 啟動開發服務器

### 3. 數據庫開發
- 在 `backend/src/db/schema.ts` 中定義表結構
- 使用 Drizzle ORM 進行數據庫操作
- 通過 `npm run db:studio` 管理數據庫

## 📝 注意事項

1. **npm workspaces**: 所有依賴安裝到根目錄的 `node_modules`
2. **環境變量**: 複製 `env.example` 到 `.env` 並配置
3. **數據庫**: 確保 PostgreSQL 正在運行
4. **端口配置**: 後端 3000，前端 8080，數據庫管理 4983

---

📖 更多詳細信息請參考 [README.md](../README.md)

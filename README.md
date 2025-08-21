# Carbon Management System

> 碳管理與審查系統 - 前後端分離架構

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-black.svg)](https://expressjs.com/)
[![SmartAdmin](https://img.shields.io/badge/SmartAdmin-4.5.2-orange.svg)](https://www.gotbootstrap.com/)

## 目錄

- [項目概述](#項目概述)
- [技術棧](#技術棧)
- [項目結構](#項目結構)
- [快速開始](#快速開始)
- [開發指南](#開發指南)
- [API 文檔](#api-文檔)
- [部署指南](#部署指南)
- [貢獻指南](#貢獻指南)

## 項目概述

Carbon Management System 是一個現代化的碳管理與審查系統，採用前後端分離架構設計。系統提供完整的碳足跡追蹤、數據分析和報告生成功能。

### 主要功能

- **用戶認證與授權** - JWT 基於的身份驗證
- **碳足跡管理** - 完整的碳數據錄入和管理
- **數據分析** - 圖表化和統計分析
- **報告生成** - 自動化報告生成
- **用戶管理** - 多角色權限管理
- **響應式界面** - 適配各種設備

## 技術棧

### 後端 (Backend)
- **運行時**: Node.js 18+
- **語言**: TypeScript 5.3+
- **框架**: Express.js 4.18+
- **數據庫**: PostgreSQL + Drizzle ORM
- **認證**: JWT (JSON Web Tokens)
- **驗證**: Zod Schema Validation
- **測試**: Jest

### 前端 (Frontend)
- **UI 框架**: SmartAdmin 4.5.2
- **構建工具**: Gulp
- **樣式**: Bootstrap 4.6 + SCSS
- **圖表**: Chart.js, ApexCharts, D3.js
- **表格**: DataTables
- **編輯器**: Summernote (富文本編輯器)

### 開發工具
- **包管理**: npm Workspaces
- **並行運行**: Concurrently
- **代碼檢查**: ESLint
- **版本控制**: Git

## 項目結構

```
carbon-management-system/
├── backend/                 # 後端 API 服務
│   ├── src/                # 源代碼
│   │   ├── config/         # 配置文件
│   │   ├── db/            # 數據庫相關
│   │   ├── middleware/    # 中間件
│   │   ├── routes/        # API 路由
│   │   ├── types/         # TypeScript 類型定義
│   │   ├── utils/         # 工具函數
│   │   ├── validators/    # 數據驗證
│   │   ├── app.ts           # 應用入口
│   │   └── server.ts        # 服務器啟動
│   ├── tests/            # 測試文件
│   ├── package.json         # 後端依賴配置
│   ├── tsconfig.json        # TypeScript 配置
│   └── drizzle.config.ts    # 數據庫配置
│
├── frontend/              # 前端 UI 應用
│   ├── src/              # 源代碼
│   │   ├── content/      # 頁面內容
│   │   ├── custom/       # 自定義組件
│   │   ├── js/          # JavaScript 文件
│   │   ├── scss/        # 樣式文件
│   │   └── template/    # 模板文件
│   ├── build/           # 構建配置
│   ├── dist/            # 構建輸出
│   ├── package.json        # 前端依賴配置
│   ├── gulpfile.js         # Gulp 構建配置
│   └── build.json          # 構建參數
│
├── shared/               # 共享配置
│   └── config.js           # 共享配置文件
│
├── docker/               # Docker 配置
├── docs/                 # 文檔目錄
├── package.json            # 根目錄配置 (Workspaces)
├── .gitignore             # Git 忽略文件
└── README.md              # 項目說明
```

## 快速開始

### 前置要求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 9.0.0 或更高版本
- **PostgreSQL**: 12.0 或更高版本
- **Git**: 2.0.0 或更高版本

### 安裝步驟

#### 1. 克隆項目
```bash
git clone <repository-url>
cd carbon-management-system
```

#### 2. 安裝依賴
```bash
# 安裝所有依賴 (推薦)
npm run install:all

# 或者分別安裝
npm install                    # 根目錄依賴
cd backend && npm install      # 後端依賴
cd frontend && npm install     # 前端依賴
```

#### 3. 環境配置
```bash
# 複製環境變量模板
cp env.example .env

# 編輯 .env 文件，設置您的配置
# 主要配置項：
# - DATABASE_URL: 數據庫連接字符串
# - JWT_SECRET: JWT 密鑰
# - BACKEND_PORT: 後端端口 (默認 3000)
# - FRONTEND_PORT: 前端端口 (默認 8080)
```

#### 4. 數據庫設置
```bash
# 推送數據庫結構
npm run db:push

# 啟動數據庫管理界面 (可選)
npm run db:studio
```

#### 5. 啟動開發服務器
```bash
# 同時運行前後端
npm run dev

# 或者分別運行
npm run dev:backend    # 後端 (http://localhost:3000)
npm run dev:frontend   # 前端 (http://localhost:8080)
```

## 開發指南

### 開發命令

| 命令 | 說明 |
|------|------|
| `npm run dev` | 同時運行前後端開發服務器 |
| `npm run dev:backend` | 只運行後端開發服務器 |
| `npm run dev:frontend` | 只運行前端開發服務器 |
| `npm run build` | 構建所有項目 |
| `npm run build:backend` | 構建後端 |
| `npm run build:frontend` | 構建前端 |
| `npm run start` | 啟動生產環境後端 |
| `npm run test` | 運行測試 |
| `npm run lint` | 代碼檢查 |
| `npm run clean` | 清理構建文件 |

### 開發流程

#### 後端開發
```bash
cd backend
npm run dev
# 訪問 http://localhost:3000
```

#### 前端開發
```bash
cd frontend
npm run gulp
# 訪問 http://localhost:8080
```

#### 數據庫管理
```bash
npm run db:studio
# 訪問 http://localhost:4983
```

### 代碼規範

- **TypeScript**: 使用嚴格模式
- **ESLint**: 代碼風格檢查
- **Prettier**: 代碼格式化
- **Git Hooks**: 提交前自動檢查

## API 文檔

### 認證端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 用戶登錄 |
| POST | `/api/v1/auth/register` | 用戶註冊 |
| POST | `/api/v1/auth/logout` | 用戶登出 |
| GET | `/api/v1/auth/profile` | 獲取用戶資料 |

### 碳管理端點

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/v1/carbon` | 獲取碳數據列表 |
| POST | `/api/v1/carbon` | 創建碳數據記錄 |
| PUT | `/api/v1/carbon/:id` | 更新碳數據 |
| DELETE | `/api/v1/carbon/:id` | 刪除碳數據 |

### 響應格式

```json
{
  "success": true,
  "data": {
    // 響應數據
  },
  "message": "操作成功"
}
```

## 部署指南

### 生產環境部署

#### 1. 構建項目
```bash
npm run build
```

#### 2. 環境變量設置
```bash
NODE_ENV=production
DATABASE_URL=your_production_db_url
JWT_SECRET=your_production_jwt_secret
```

#### 3. 啟動服務
```bash
# 啟動後端
npm run start:backend

# 啟動前端 (如果需要)
npm run start:frontend
```

### Docker 部署

```bash
# 構建 Docker 鏡像
docker build -t carbon-management-system .

# 運行容器
docker run -p 3000:3000 carbon-management-system
```

## 貢獻指南

### 開發流程

1. **Fork 項目**
2. **創建功能分支**: `git checkout -b feature/your-feature`
3. **提交更改**: `git commit -m 'Add some feature'`
4. **推送分支**: `git push origin feature/your-feature`
5. **創建 Pull Request**

### 代碼提交規範

```
feat: 新功能
fix: 修復 bug
docs: 文檔更新
style: 代碼格式調整
refactor: 代碼重構
test: 測試相關
chore: 構建過程或輔助工具的變動
```

## 許可證

本項目採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 支持與聯繫

- **項目維護者**: [您的姓名]
- **郵箱**: [您的郵箱]
- **GitHub**: [您的 GitHub]

## 致謝

- [SmartAdmin](https://www.gotbootstrap.com/) - 優秀的 UI 框架
- [Express.js](https://expressjs.com/) - 強大的 Node.js 框架
- [Drizzle ORM](https://orm.drizzle.team/) - 現代化的 ORM 工具

---

如果這個項目對您有幫助，請給我們一個星標！ 
# 🚀 前後端整合指南

## 📁 項目結構

```
carbon-management-system/
├── backend/           # 後端 API (Express + TypeScript)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/          # 前端 UI (SmartAdmin)
│   ├── src/
│   ├── package.json
│   └── gulpfile.js
├── shared/            # 共享配置
│   └── config.js
├── package.json       # 根目錄管理
└── env.example        # 環境變量示例
```

## 🛠️ 開發環境設置

### 1. 安裝依賴
```bash
# 安裝所有依賴（根目錄）
npm run install:all

# 或者分別安裝
npm install                    # 根目錄
cd backend && npm install      # 後端
cd frontend && npm install     # 前端
```

### 2. 環境變量設置
```bash
# 複製環境變量文件
cp env.example .env

# 編輯 .env 文件，設置您的配置
```

### 3. 數據庫設置
```bash
# 推送數據庫結構
npm run db:push

# 啟動數據庫管理界面
npm run db:studio
```

## 🚀 開發命令

### 同時運行前後端
```bash
npm run dev
```

### 分別運行
```bash
# 後端開發服務器 (端口 3000)
npm run dev:backend

# 前端開發服務器 (端口 8080)
npm run dev:frontend
```

### 構建項目
```bash
# 構建所有
npm run build

# 分別構建
npm run build:backend
npm run build:frontend
```

### 生產環境
```bash
# 啟動後端
npm run start:backend

# 啟動前端
npm run start:frontend
```

## 🔧 配置說明

### 端口配置
- **後端 API**: 3000
- **前端 UI**: 8080
- **數據庫**: 5432

### API 端點
- 後端 API 基礎路徑: `http://localhost:3000/api/v1`
- 前端代理路徑: `/api`

## 📝 開發流程

### 1. 後端開發
- 在 `backend/src/` 中開發 API
- 使用 TypeScript 和 Express
- 數據庫使用 Drizzle ORM

### 2. 前端開發
- 在 `frontend/src/` 中開發 UI
- 使用 SmartAdmin 框架
- 通過 API 調用後端服務

### 3. API 調用示例
```javascript
// 前端調用後端 API
fetch('/api/v1/carbon-data')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 🔍 調試

### 後端調試
```bash
cd backend
npm run dev
# 訪問 http://localhost:3000
```

### 前端調試
```bash
cd frontend
npm run gulp
# 訪問 http://localhost:8080
```

### 數據庫調試
```bash
npm run db:studio
# 訪問 http://localhost:4983
```

## 🐛 常見問題

### 1. 端口衝突
- 檢查端口是否被佔用
- 修改 `.env` 文件中的端口配置

### 2. 數據庫連接
- 確保 PostgreSQL 正在運行
- 檢查 `DATABASE_URL` 配置

### 3. 前端構建失敗
- 檢查 Node.js 版本
- 清理並重新安裝依賴

## 📚 技術棧

### 後端
- Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL
- JWT 認證

### 前端
- SmartAdmin UI
- jQuery
- Bootstrap 4
- Gulp 構建系統

### 開發工具
- Concurrently (並行運行)
- ESLint (代碼檢查)
- Jest (測試)

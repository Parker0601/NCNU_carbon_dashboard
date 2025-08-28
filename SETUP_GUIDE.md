# 🚀 Carbon Management System - 新用戶設置指南

## 📋 前置需求

- Node.js 18+ 
- Docker Desktop
- Git

## 🔧 設置步驟

### 1. 克隆專案
```bash
git clone <your-repository-url>
cd back
```

### 2. 安裝後端依賴
```bash
cd backend
npm install
```

### 3. 設置環境變數檔案

#### 選項 A：使用 Docker（推薦）
如果你要使用 Docker 運行資料庫，**不需要**創建 `.env` 檔案，因為環境變數已經在 `docker-compose.yml` 中配置好了。

#### 選項 B：本地 PostgreSQL
如果你要使用本地 PostgreSQL，需要創建 `.env` 檔案：

```bash
# 在 backend 目錄下創建 .env 檔案
cp ../env.example backend/.env
```

然後編輯 `backend/.env` 檔案，主要修改：
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/carbon_management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 4. 啟動服務

#### 使用 Docker（推薦）
```bash
cd docker
docker-compose up -d
```

這會啟動：
- PostgreSQL 資料庫 (端口 5432)
- 後端 API 服務 (端口 3000)

#### 不使用 Docker
1. 確保本地 PostgreSQL 運行中
2. 創建資料庫：`carbon_management`
3. 運行資料庫遷移：
   ```bash
   cd backend
   npm run db:push
   ```
4. 啟動後端：
   ```bash
   npm run dev
   ```

### 5. 驗證設置

#### 檢查服務狀態
```bash
# 如果使用 Docker
docker-compose ps

# 檢查後端健康狀態
curl http://localhost:3000/api/health
```

#### 測試資料庫連接
```bash
# 如果使用 Docker
docker exec carbon_management_db psql -U postgres -d carbon_management -c "SELECT version();"
```

## 🌐 可用的服務

- **後端 API**: http://localhost:3000
- **健康檢查**: http://localhost:3000/api/health
- **PostgreSQL**: localhost:5432
- **Drizzle Studio** (可選): http://localhost:4983

## 📁 重要檔案位置

- **Docker 配置**: `docker/docker-compose.yml`
- **環境變數範例**: `env.example`
- **後端源碼**: `backend/src/`
- **資料庫配置**: `backend/drizzle.config.ts`

## 🔍 常見問題

### Q: 為什麼不需要創建 .env 檔案？
A: 當使用 Docker 時，所有環境變數都在 `docker-compose.yml` 中配置，包括資料庫連接字串。

### Q: JWT_SECRET 的安全性如何？
A: 在開發環境中，我們使用預設的 JWT_SECRET 是安全的，因為：
- 只在本地開發環境使用
- 不會暴露到網際網路
- 生產環境應該使用強密碼和環境變數管理

**生產環境建議：**
```bash
# 生成強密碼
openssl rand -base64 32

# 在生產環境的 .env 檔案中
JWT_SECRET=your-generated-strong-secret-here
```

### Q: 如何查看服務日誌？
```bash
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs app
docker-compose logs postgres
```

### Q: 如何停止服務？
```bash
docker-compose down
```

### Q: 如何重新建置？
```bash
docker-compose up --build
```

## 🎯 下一步

1. 檢查 API 文檔
2. 運行測試：`npm test`
3. 開始開發！

---

**注意**: 這個設置使用 Docker 來管理資料庫和後端服務，確保環境一致性和易於部署。

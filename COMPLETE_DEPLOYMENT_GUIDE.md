# NCNU 碳管理系統完整部署指南

## 📋 目錄
1. [環境變數設定](#環境變數設定)
2. [資料庫連接說明](#資料庫連接說明)
3. [本地開發環境設定](#本地開發環境設定)
4. [伺服器部署設定](#伺服器部署設定)
5. [資料庫切換方法](#資料庫切換方法)
6. [團隊協作指南](#團隊協作指南)
7. [故障排除](#故障排除)


:::success
![image](https://hackmd.io/_uploads/rJRcMJjtee.png)

你們已經有.env的話就修改DATABASE_URL那行就好
改成   DATABASE_URL=postgresql://postgres:password@163.22.17.110:5432/postgres
:::


## 🔧 環境變數設定

### 環境檔案說明

#### `.env` (主要環境檔案)
- **用途**: 應用程式實際使用的環境變數
- **位置**: 專案根目錄
- **內容**: 包含當前使用的資料庫連接字串和其他配置

#### `.env.server` (伺服器環境範本)
- **用途**: 伺服器部署時的環境變數範本
- **位置**: 專案根目錄
- **內容**: 伺服器資料庫連接配置

#### `.env.local.backup` (本地備份)
- **用途**: 本地開發環境的備份
- **位置**: 專案根目錄
- **內容**: 本地 Docker 資料庫連接配置

#### `env.example` (範例檔案)
- **用途**: 新開發者的環境變數範本
- **位置**: 專案根目錄
- **內容**: 所有必要環境變數的範例格式

### 重要環境變數

```env
# 資料庫連接
DATABASE_URL=postgresql://username:password@host:port/database_name

# JWT 密鑰
JWT_SECRET=your-jwt-secret-key

# 其他配置
NODE_ENV=development
PORT=3000
```

## 🗄️ 資料庫連接說明

### DATABASE_URL 格式解析

```
postgresql://username:password@host:port/database_name
```

#### 各組件說明：
- **username**: 資料庫使用者名稱
- **password**: 資料庫密碼
- **host**: 資料庫主機位址 (localhost 或伺服器 IP)
- **port**: 資料庫連接埠 (預設 5432)
- **database_name**: 資料庫名稱

### 連接字串範例

#### 本地 Docker 資料庫
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/carbon_management
```

#### 伺服器資料庫
```env
DATABASE_URL=postgresql://postgres:password@163.22.17.110:5432/postgres
```

## 💻 本地開發環境設定

### 1. 安裝依賴
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. 設定環境變數
```bash
# 複製環境變數範例
cp env.example .env

# 編輯 .env 檔案，設定本地資料庫連接
DATABASE_URL=postgresql://postgres:password@localhost:5432/carbon_management
JWT_SECRET=dev-jwt-secret-key-2024-carbon-dashboard
```

### 3. 啟動本地資料庫
```bash
# 啟動 Docker 容器
docker-compose -f docker/docker-compose.yml up -d

# 檢查容器狀態
docker ps
```

### 4. 初始化資料庫
```bash
# 推送 schema 到資料庫
npm run db:push

# 開啟 Drizzle Studio (可選)
npm run db:studio
```

### 5. 啟動開發伺服器
```bash
npm run dev
```

## 🚀 伺服器部署設定

### 1. 準備伺服器環境
確保伺服器已安裝：
- Node.js 18+
- PostgreSQL 15+
- Docker (可選)

### 2. 設定伺服器環境變數
```bash
# 使用伺服器環境範本
cp .env.server .env

# 或手動編輯 .env 檔案
DATABASE_URL=postgresql://postgres:password@163.22.17.110:5432/postgres
JWT_SECRET=production-jwt-secret-key-2024-carbon-dashboard
```

### 3. 使用伺服器 Docker 配置
```bash
# 使用伺服器專用的 Docker Compose 檔案
docker-compose -f docker/docker-compose.server.yml up -d
```

### 4. 部署應用程式
```bash
# 安裝依賴
npm install

# 建置應用程式
npm run build

# 啟動生產伺服器
npm start
```

## 🔄 資料庫切換方法

### 手動切換方法

#### 切換到伺服器資料庫
1. 編輯 `.env` 檔案
2. 將 `DATABASE_URL` 修改為伺服器連接字串：
   ```env
   DATABASE_URL=postgresql://postgres:password@163.22.17.110:5432/postgres
   ```
3. 重新啟動應用程式

#### 切換到本地資料庫
1. 編輯 `.env` 檔案
2. 將 `DATABASE_URL` 修改為本地連接字串：
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/carbon_management
   ```
3. 確保本地 Docker 容器正在運行
4. 重新啟動應用程式

### 驗證連接
```bash
# 測試資料庫連接
npm run db:studio

# 或檢查應用程式日誌
docker logs carbon_management_app
```

## 👥 團隊協作指南

### 新成員加入流程

#### 1. 克隆專案
```bash
git clone <repository-url>
cd NCNU_carbon_dashboard
```

#### 2. 設定環境
```bash
# 複製環境變數範例
cp env.example .env

# 根據需要選擇資料庫連接
# 本地開發：使用 localhost
# 伺服器開發：使用伺服器 IP
```

#### 3. 安裝依賴
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

#### 4. 啟動服務
```bash
# 本地資料庫
docker-compose -f docker/docker-compose.yml up -d

# 或使用伺服器資料庫
# 確保 .env 中的 DATABASE_URL 指向伺服器

# 初始化資料庫
npm run db:push

# 啟動開發伺服器
npm run dev
```

### 資料庫協作注意事項

#### Schema 變更
1. 修改 `backend/src/db/schema.ts`
2. 推送變更到資料庫：
   ```bash
   npm run db:push
   ```
3. 通知團隊成員更新

#### 環境變數管理
- 不要將 `.env` 檔案提交到 Git
- 使用 `env.example` 作為範本
- 團隊成員各自設定自己的 `.env` 檔案

## 🔧 故障排除

### 常見問題

#### 1. 資料庫連接失敗
**症狀**: `Error: connect ECONNREFUSED`
**解決方案**:
- 檢查 Docker 容器是否運行：`docker ps`
- 確認資料庫連接字串正確
- 檢查防火牆設定

#### 2. Drizzle Studio 無法連接
**症狀**: `url: undefined`
**解決方案**:
- 確保 `.env` 檔案存在且包含 `DATABASE_URL`
- 手動設定環境變數：`$env:DATABASE_URL="your-connection-string"`

#### 3. 資料庫不存在
**症狀**: `database "database_name" does not exist`
**解決方案**:
- 確認資料庫名稱正確
- 使用 `postgres` 作為預設資料庫名稱
- 檢查伺服器資料庫是否已建立

#### 4. 權限問題
**症狀**: `permission denied`
**解決方案**:
- 確認資料庫使用者權限
- 檢查連接字串中的使用者名稱和密碼

### 診斷命令

#### 檢查 Docker 狀態
```bash
docker ps
docker logs carbon_management_db
```

#### 測試資料庫連接
```bash
# 使用 psql (如果已安裝)
psql postgresql://postgres:password@localhost:5432/carbon_management

# 或使用 Drizzle Studio
npm run db:studio
```

#### 檢查網路連接
```bash
# 測試伺服器連接
ping 163.22.17.110

# 測試資料庫連接埠
Test-NetConnection -ComputerName 163.22.17.110 -Port 5432
```

## 📝 注意事項

1. **環境變數安全**: 永遠不要將包含真實密碼的 `.env` 檔案提交到版本控制
2. **資料庫備份**: 定期備份重要資料
3. **團隊溝通**: 進行資料庫 schema 變更時，務必通知所有團隊成員
4. **測試環境**: 建議在測試環境中驗證變更後再部署到生產環境

## 🔗 相關連結

- [Drizzle ORM 文件](https://orm.drizzle.team/)
- [PostgreSQL 文件](https://www.postgresql.org/docs/)
- [Docker 文件](https://docs.docker.com/)
- [Next.js 文件](https://nextjs.org/docs)

---

**最後更新**: 2024年12月
**維護者**: NCNU 碳管理系統開發團隊

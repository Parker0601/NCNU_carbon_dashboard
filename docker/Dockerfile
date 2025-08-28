FROM node:18-alpine

# 安裝必要的系統依賴
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝所有依賴（包括開發依賴）
RUN npm install

# 複製源碼
COPY . .

# 根據環境變數決定是否建置
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# 如果是生產環境，建置應用程式
RUN if [ "$NODE_ENV" = "production" ]; then npm run build; fi

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 啟動應用程式
CMD ["npm", "run", "dev"] 
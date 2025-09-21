import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from '@/config/env';
import routes from '@/routes';
import pagesRouter from '@/routes/pages.routes';
import { errorHandler, notFoundHandler } from '@/middleware/error';

// ⭐ ESM 模式下自定義 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ------------------ Middleware ------------------
app.use(helmet());

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.use(morgan('combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ------------------ 靜態資源 ------------------
// 指向 FRONTEND/dist，讓前端打包的 CSS/JS/圖片可以正常被取用
app.use(express.static(path.join(__dirname, '../../FRONTEND/dist')));

// ------------------ 頁面路由 ------------------
// /waste_management  → dist/waste_management.html
// /waste_input       → dist/waste_input.html
app.use('/', pagesRouter);

// ------------------ API 路由 ------------------
app.use('/api', routes);

// ------------------ Error Handling ------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

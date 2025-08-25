<<<<<<< HEAD
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { z } from "zod";

// 1) 載入 .env（預設放在 backend/.env）
const envPath = fs.existsSync(path.resolve(process.cwd(), ".env"))
  ? path.resolve(process.cwd(), ".env")
  : undefined;
dotenv.config(envPath ? { path: envPath } : undefined);

// 2) 定義與驗證環境變數
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),

  // 可按需求增減（若暫時沒有，留空即可）
  DATABASE_URL: z.string().min(1).optional(), // e.g. postgres://... 或 mysql://...
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  // 逗號分隔，供 CORS 使用
  CORS_ORIGIN: z.string().optional(),

  // 其他選填
  REDIS_URL: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n  - ");
  throw new Error(`❌ Invalid environment variables:\n  - ${issues}`);
}

const data = parsed.data;

// 3) 方便使用的小工具與導出
const csv = (v?: string) =>
  v?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

export const env = {
  ...data,
  CORS_ORIGINS: csv(data.CORS_ORIGIN),
  isProd: data.NODE_ENV === "production",
  isDev: data.NODE_ENV === "development",
  isTest: data.NODE_ENV === "test",
};

export default env;
=======
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('Invalid environment variables:', envParse.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = envParse.data; 
>>>>>>> 040c480 (feat: 添加環境變數配置文件 env.ts)

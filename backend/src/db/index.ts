import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';

// 建立 PostgreSQL 連接
const client = postgres(env.DATABASE_URL);

// 建立 Drizzle 實例
export const db = drizzle(client);

// 匯出所有 schema
export * from './schema'; 
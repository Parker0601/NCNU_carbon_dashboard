import { pgTable, serial, text, timestamp, integer, decimal, varchar } from 'drizzle-orm/pg-core';

// 廢棄物管理表
export const waste = pgTable('waste', {
  id: serial('id').primaryKey(),
  waste_type: varchar('waste_type', { length: 100 }).notNull(), // 廢棄物類型
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(), // 數量
  unit: varchar('unit', { length: 20 }).notNull(), // 單位 (kg, ton, m³, etc.)
  disposal_method: varchar('disposal_method', { length: 100 }).notNull(), // 處理方式
  disposal_date: timestamp('disposal_date').notNull(), // 處理日期
  location: varchar('location', { length: 200 }).notNull(), // 地點
  responsible_person: varchar('responsible_person', { length: 100 }).notNull(), // 負責人
  cost: decimal('cost', { precision: 10, scale: 2 }), // 成本
  notes: text('notes'), // 備註
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 狀態: pending, processing, completed, cancelled
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// 用戶表 (如果還沒有的話)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // admin, manager, user
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// 碳足跡表 (如果還沒有的話)
export const carbon_footprint = pgTable('carbon_footprint', {
  id: serial('id').primaryKey(),
  source: varchar('source', { length: 100 }).notNull(), // 碳源
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // 數量
  unit: varchar('unit', { length: 20 }).notNull(), // 單位
  date: timestamp('date').notNull(), // 日期
  user_id: integer('user_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}); 
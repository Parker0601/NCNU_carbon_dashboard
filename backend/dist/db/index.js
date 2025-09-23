import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env';
import * as schema from './schema';
if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}
const client = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});
export const db = drizzle(client, { schema });
export * from './schema';
//# sourceMappingURL=index.js.map
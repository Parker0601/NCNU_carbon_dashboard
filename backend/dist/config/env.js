import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { z } from "zod";
const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "..", ".env.local"),
];
let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`✅ 載入環境變量: ${envPath}`);
        envLoaded = true;
        break;
    }
}
if (!envLoaded) {
    console.warn("⚠️  未找到 .env 文件，使用系統環境變量");
}
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default("7d"),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),
    CORS_ORIGIN: z.string().optional(),
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
const csv = (v) => v?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
export const env = {
    ...data,
    CORS_ORIGINS: csv(data.CORS_ORIGIN),
    isProd: data.NODE_ENV === "production",
    isDev: data.NODE_ENV === "development",
    isTest: data.NODE_ENV === "test",
};
export default env;
//# sourceMappingURL=env.js.map
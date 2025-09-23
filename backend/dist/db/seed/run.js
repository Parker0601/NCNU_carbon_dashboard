import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/utils/passwords';
async function seedUsers() {
    try {
        console.log('🌱 開始創建測試用戶...');
        const existingUsers = await db.select().from(users);
        if (existingUsers.length > 0) {
            console.log('⚠️  數據庫中已有用戶，跳過創建');
            return;
        }
        const testUsers = [
            {
                name: '一般員工',
                password: '123456',
                role: '1',
                mail: 'employee@test.com',
                createTime: new Date(),
            },
            {
                name: '主管',
                password: '123456',
                role: '2',
                mail: 'manager@test.com',
                createTime: new Date(),
            },
            {
                name: '老闆',
                password: '123456',
                role: '3',
                mail: 'boss@test.com',
                createTime: new Date(),
            },
        ];
        for (const userData of testUsers) {
            const hashedPassword = await hashPassword(userData.password);
            const [newUser] = await db
                .insert(users)
                .values({
                name: userData.name,
                password: hashedPassword,
                role: userData.role,
                mail: userData.mail,
                createTime: userData.createTime,
            })
                .returning();
            console.log(`✅ 創建用戶: ${newUser.name} (${newUser.mail}) - 角色: ${newUser.role}`);
        }
        console.log('🎉 所有測試用戶創建完成！');
        console.log('\n📋 測試帳號資訊:');
        console.log('一般員工: employee@test.com / 123456');
        console.log('主管: manager@test.com / 123456');
        console.log('老闆: boss@test.com / 123456');
    }
    catch (error) {
        console.error('❌ 創建用戶時發生錯誤:', error);
        throw error;
    }
}
seedUsers()
    .then(() => {
    console.log('✅ Seed 執行完成');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Seed 執行失敗:', error);
    process.exit(1);
});
//# sourceMappingURL=run.js.map
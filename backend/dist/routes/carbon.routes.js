import { Router } from 'express';
import { db } from '../db/index';
import { carbon, carbonCalculations, users } from '../db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken, USER_ROLES, requireRole } from '../middleware/auth';
const router = Router();
function getTaiwanDate() {
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return taiwanTime.toISOString().split('T')[0];
}
function getTaiwanTimestampForDB() {
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return taiwanTime;
}
function processDailyData(calculations) {
    const dailyGroups = {};
    calculations.forEach(record => {
        const date = record.calculationDate;
        if (!dailyGroups[date]) {
            dailyGroups[date] = [];
        }
        dailyGroups[date].push(record);
    });
    const processedDailyGroups = Object.keys(dailyGroups)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(date => {
        const dayRecords = dailyGroups[date];
        const dailyTotalEmission = dayRecords.reduce((sum, record) => sum + record.totalEmission, 0);
        const emissionBreakdown = calculateEmissionBreakdown(dayRecords);
        return {
            date: date,
            records: dayRecords,
            dailyTotalEmission: parseFloat(dailyTotalEmission.toFixed(2)),
            recordCount: dayRecords.length,
            emissionBreakdown: emissionBreakdown
        };
    });
    let totalEmission = 0;
    const dailyGroupsWithCumulative = processedDailyGroups.map(day => {
        totalEmission += day.dailyTotalEmission;
        return {
            ...day,
            cumulativeEmission: parseFloat(totalEmission.toFixed(2))
        };
    });
    const overallEmissionBreakdown = calculateEmissionBreakdown(calculations);
    return {
        dailyGroups: dailyGroupsWithCumulative,
        totalEmission: parseFloat(totalEmission.toFixed(2)),
        emissionBreakdown: overallEmissionBreakdown
    };
}
function calculateEmissionBreakdown(records) {
    const breakdown = {
        co2: { total: 0, percentage: 0 },
        ch4: { total: 0, percentage: 0 },
        n2o: { total: 0, percentage: 0 },
        pfcs: { total: 0, percentage: 0 },
        hfcs: { total: 0, percentage: 0 },
        sf6: { total: 0, percentage: 0 },
        nf3: { total: 0, percentage: 0 }
    };
    records.forEach(record => {
        breakdown.co2.total += record.totalEmission * 0.6;
        breakdown.ch4.total += record.totalEmission * 0.25;
        breakdown.n2o.total += record.totalEmission * 0.15;
    });
    const total = breakdown.co2.total + breakdown.ch4.total + breakdown.n2o.total +
        breakdown.pfcs.total + breakdown.hfcs.total + breakdown.sf6.total + breakdown.nf3.total;
    if (total > 0) {
        breakdown.co2.percentage = parseFloat(((breakdown.co2.total / total) * 100).toFixed(2));
        breakdown.ch4.percentage = parseFloat(((breakdown.ch4.total / total) * 100).toFixed(2));
        breakdown.n2o.percentage = parseFloat(((breakdown.n2o.total / total) * 100).toFixed(2));
        breakdown.pfcs.percentage = parseFloat(((breakdown.pfcs.total / total) * 100).toFixed(2));
        breakdown.hfcs.percentage = parseFloat(((breakdown.hfcs.total / total) * 100).toFixed(2));
        breakdown.sf6.percentage = parseFloat(((breakdown.sf6.total / total) * 100).toFixed(2));
        breakdown.nf3.percentage = parseFloat(((breakdown.nf3.total / total) * 100).toFixed(2));
    }
    return breakdown;
}
const calculateEmissionSchema = z.object({
    carbonId: z.string().min(1, '碳排係數ID不能為空'),
    consumption: z.number().positive('消耗量必須大於0'),
    calculationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須為 YYYY-MM-DD').optional(),
});
router.get('/fuels/class-1', async (_req, res) => {
    try {
        console.log('🔍 取得class=1的燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
            class: carbon.class,
        }).from(carbon).where(eq(carbon.class, '1'));
        console.log(`✅ 成功取得 ${fuels.length} 種class=1的燃料`);
        res.json({
            success: true,
            data: fuels,
            message: `成功取得 ${fuels.length} 種class=1的燃料選單`
        });
    }
    catch (error) {
        console.error('❌ 取得class=1燃料選單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得class=1燃料選單失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/fuels/class-2', async (_req, res) => {
    try {
        console.log('🔍 取得class=2的燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
            class: carbon.class,
        }).from(carbon).where(eq(carbon.class, '2'));
        console.log(`✅ 成功取得 ${fuels.length} 種class=2的燃料`);
        res.json({
            success: true,
            data: fuels,
            message: `成功取得 ${fuels.length} 種class=2的燃料選單`
        });
    }
    catch (error) {
        console.error('❌ 取得class=2燃料選單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得class=2燃料選單失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/fuels/class-3', async (_req, res) => {
    try {
        console.log('🔍 取得class=3的燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
            class: carbon.class,
        }).from(carbon).where(eq(carbon.class, '3'));
        console.log(`✅ 成功取得 ${fuels.length} 種class=3的燃料`);
        res.json({
            success: true,
            data: fuels,
            message: `成功取得 ${fuels.length} 種class=3的燃料選單`
        });
    }
    catch (error) {
        console.error('❌ 取得class=3燃料選單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得class=3燃料選單失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/fuels/class-4', async (_req, res) => {
    try {
        console.log('🔍 取得class=4的燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
            class: carbon.class,
        }).from(carbon).where(eq(carbon.class, '4'));
        console.log(`✅ 成功取得 ${fuels.length} 種class=4的燃料`);
        res.json({
            success: true,
            data: fuels,
            message: `成功取得 ${fuels.length} 種class=4的燃料選單`
        });
    }
    catch (error) {
        console.error('❌ 取得class=4燃料選單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得class=4燃料選單失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/fuels/class-5', async (_req, res) => {
    try {
        console.log('🔍 取得class=5的燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
            class: carbon.class,
        }).from(carbon).where(eq(carbon.class, '5'));
        console.log(`✅ 成功取得 ${fuels.length} 種class=5的燃料`);
        res.json({
            success: true,
            data: fuels,
            message: `成功取得 ${fuels.length} 種class=5的燃料選單`
        });
    }
    catch (error) {
        console.error('❌ 取得class=5燃料選單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得class=5燃料選單失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.post('/recordEnergyConsume', authenticateToken, async (req, res) => {
    try {
        console.log('🧮 開始記錄能源消耗並計算碳排量...');
        console.log('📥 請求資料:', req.body);
        console.log('👤 使用者資訊:', req.user);
        try {
            await db.select().from(carbon).limit(1);
            console.log('✅ 資料庫連線正常');
        }
        catch (dbTestError) {
            console.error('❌ 資料庫連線失敗:', dbTestError);
            return res.status(500).json({
                success: false,
                message: '資料庫連線失敗',
                error: dbTestError instanceof Error ? dbTestError.message : '未知錯誤'
            });
        }
        const validationResult = calculateEmissionSchema.safeParse(req.body);
        if (!validationResult.success) {
            console.error('❌ 資料驗證失敗:', validationResult.error.errors);
            return res.status(400).json({
                success: false,
                message: '輸入資料驗證失敗',
                errors: validationResult.error.errors
            });
        }
        const { carbonId, consumption, calculationDate } = validationResult.data;
        const userId = req.user?.id;
        console.log(`📊 計算參數: carbonId=${carbonId}, consumption=${consumption}, userId=${userId}`);
        if (!userId) {
            console.error('❌ 使用者ID不存在');
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        try {
            const userData = await db.select().from(users).where(eq(users.id, userId));
            console.log(`👤 使用者查詢結果: ${userData.length} 筆資料`);
            if (userData.length === 0) {
                console.error(`❌ 找不到userId=${userId}的使用者`);
                return res.status(404).json({
                    success: false,
                    message: '使用者不存在',
                    debug: { userId }
                });
            }
            console.log(`✅ 使用者存在: ${userData[0].name}`);
        }
        catch (userError) {
            console.error('❌ 查詢使用者失敗:', userError);
            return res.status(500).json({
                success: false,
                message: '查詢使用者失敗',
                error: userError instanceof Error ? userError.message : '未知錯誤'
            });
        }
        console.log(`🔍 查詢carbonId=${carbonId}的燃料資料...`);
        const allCarbonData = await db.select().from(carbon).limit(5);
        console.log(`📋 carbon表總共有 ${allCarbonData.length} 筆資料 (顯示前5筆):`, allCarbonData.map(c => ({ id: c.id, name: c.fuelName })));
        const carbonData = await db.select().from(carbon).where(eq(carbon.id, carbonId));
        console.log(`📋 查詢carbonId=${carbonId}結果: ${carbonData.length} 筆資料`);
        if (carbonData.length === 0) {
            console.error(`❌ 找不到carbonId=${carbonId}的燃料資料`);
            return res.status(404).json({
                success: false,
                message: '找不到指定的碳排係數資料',
                debug: {
                    requestedCarbonId: carbonId,
                    availableCarbonIds: allCarbonData.map(c => c.id)
                }
            });
        }
        const fuel = carbonData[0];
        console.log(`🔍 找到燃料: ${fuel.fuelName}`);
        console.log(`📊 燃料詳細資料:`, fuel);
        const co2Emission = fuel.co2 ? consumption * fuel.co2 : 0;
        const ch4Emission = fuel.ch4 ? consumption * fuel.ch4 : 0;
        const n2oEmission = fuel.n2o ? consumption * fuel.n2o : 0;
        const pfcsEmission = fuel.pfcs ? consumption * fuel.pfcs : 0;
        const hfcsEmission = fuel.hfcs ? consumption * fuel.hfcs : 0;
        const sf6Emission = fuel.sf6 ? consumption * fuel.sf6 : 0;
        const nf3Emission = fuel.nf3 ? consumption * fuel.nf3 : 0;
        console.log('📈 計算排放量:');
        console.log(`  CO2: ${co2Emission} (${fuel.co2} × ${consumption})`);
        console.log(`  CH4: ${ch4Emission} (${fuel.ch4} × ${consumption})`);
        console.log(`  N2O: ${n2oEmission} (${fuel.n2o} × ${consumption})`);
        console.log(`  PFCs: ${pfcsEmission} (${fuel.pfcs} × ${consumption})`);
        console.log(`  HFCs: ${hfcsEmission} (${fuel.hfcs} × ${consumption})`);
        console.log(`  SF6: ${sf6Emission} (${fuel.sf6} × ${consumption})`);
        console.log(`  NF3: ${nf3Emission} (${fuel.nf3} × ${consumption})`);
        const co2GwpEmission = co2Emission * (fuel.co2gwp || 0);
        const ch4GwpEmission = ch4Emission * (fuel.ch4gwp || 0);
        const n2oGwpEmission = n2oEmission * (fuel.n2ogwp || 0);
        const pfcsGwpEmission = pfcsEmission * (fuel.pfcsgwp || 0);
        const hfcsGwpEmission = hfcsEmission * (fuel.hfcsgwp || 0);
        const sf6GwpEmission = sf6Emission * (fuel.sf6gwp || 0);
        const nf3GwpEmission = nf3Emission * (fuel.nf3gwp || 0);
        console.log('⚖️ 計算GWP加權排放量:');
        console.log(`  CO2 GWP: ${co2GwpEmission} (${co2Emission} × ${fuel.co2gwp})`);
        console.log(`  CH4 GWP: ${ch4GwpEmission} (${ch4Emission} × ${fuel.ch4gwp})`);
        console.log(`  N2O GWP: ${n2oGwpEmission} (${n2oEmission} × ${fuel.n2ogwp})`);
        console.log(`  PFCs GWP: ${pfcsGwpEmission} (${pfcsEmission} × ${fuel.pfcsgwp})`);
        console.log(`  HFCs GWP: ${hfcsGwpEmission} (${hfcsEmission} × ${fuel.hfcsgwp})`);
        console.log(`  SF6 GWP: ${sf6GwpEmission} (${sf6Emission} × ${fuel.sf6gwp})`);
        console.log(`  NF3 GWP: ${nf3GwpEmission} (${nf3Emission} × ${fuel.nf3gwp})`);
        const totalEmission = (co2GwpEmission + ch4GwpEmission + n2oGwpEmission + pfcsGwpEmission + hfcsGwpEmission + sf6GwpEmission + nf3GwpEmission);
        console.log(`🎯 總排放量: ${totalEmission}`);
        const insertData = {
            userId: userId,
            carbonId: carbonId,
            fuelName: fuel.fuelName || '',
            consumption: consumption,
            unit: fuel.unit || '',
            totalEmission: totalEmission,
            calculationDate: calculationDate || getTaiwanDate(),
            createdAt: getTaiwanTimestampForDB(),
            notes: `能源消耗記錄: ${fuel.fuelName} 消耗量 ${consumption} ${fuel.unit}，totalEmission總共是 ${totalEmission.toFixed(2)} 公噸/年`
        };
        console.log('💾 準備插入資料:', insertData);
        let calculationResult;
        try {
            console.log('💾 開始插入資料到 carbon_calculations 表...');
            calculationResult = await db.insert(carbonCalculations).values(insertData).returning();
            console.log(`✅ 能源消耗記錄已存入資料庫，total_emission: ${totalEmission}，ID: ${calculationResult[0].id}`);
        }
        catch (dbError) {
            console.error('❌ 資料庫插入失敗:', dbError);
            console.error('❌ 插入資料:', insertData);
            console.error('❌ 錯誤詳情:', dbError instanceof Error ? dbError.message : '未知錯誤');
            return res.status(500).json({
                success: false,
                message: '資料庫插入失敗',
                error: dbError instanceof Error ? dbError.message : '未知錯誤',
                debug: {
                    insertData: insertData,
                    error: dbError instanceof Error ? dbError.message : '未知錯誤'
                }
            });
        }
        res.json({
            success: true,
            data: {
                calculationId: calculationResult[0].id,
                fuelName: fuel.fuelName,
                consumption: consumption,
                unit: fuel.unit,
                totalEmission: totalEmission,
                calculationDate: calculationResult[0].calculationDate,
                details: {
                    emissions: {
                        co2: co2Emission,
                        ch4: ch4Emission,
                        n2o: n2oEmission,
                        pfcs: pfcsEmission,
                        hfcs: hfcsEmission,
                        sf6: sf6Emission,
                        nf3: nf3Emission
                    },
                    gwpEmissions: {
                        co2: co2GwpEmission,
                        ch4: ch4GwpEmission,
                        n2o: n2oGwpEmission,
                        pfcs: pfcsGwpEmission,
                        hfcs: hfcsGwpEmission,
                        sf6: sf6GwpEmission,
                        nf3: nf3GwpEmission
                    }
                }
            },
            message: '能源消耗記錄完成'
        });
    }
    catch (error) {
        console.error('❌ 記錄能源消耗時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '記錄能源消耗失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/my-calculations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const groupByClass = req.query.groupByClass === 'true';
        const range = req.query.range;
        console.log(`🔍 API 請求參數: groupByClass=${groupByClass}, range=${range}`);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        let calculations;
        if (userRole === USER_ROLES.BOSS) {
            console.log(`🔍 老闆 ${userId} 查看所有計算記錄...`);
            calculations = await db.select().from(carbonCalculations)
                .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
        }
        else {
            console.log(`🔍 員工 ${userId} 查看自己的計算記錄...`);
            calculations = await db.select().from(carbonCalculations)
                .where(eq(carbonCalculations.userId, userId))
                .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
        }
        console.log(`✅ 找到 ${calculations.length} 筆計算記錄`);
        if (groupByClass) {
            console.log('📊 按類別分組處理資料...');
            const calculationsWithClass = await db.select({
                id: carbonCalculations.id,
                userId: carbonCalculations.userId,
                carbonId: carbonCalculations.carbonId,
                fuelName: carbonCalculations.fuelName,
                consumption: carbonCalculations.consumption,
                unit: carbonCalculations.unit,
                totalEmission: carbonCalculations.totalEmission,
                calculationDate: carbonCalculations.calculationDate,
                createdAt: carbonCalculations.createdAt,
                notes: carbonCalculations.notes,
                class: carbon.class
            })
                .from(carbonCalculations)
                .innerJoin(carbon, eq(carbonCalculations.carbonId, carbon.id))
                .where(userRole === USER_ROLES.BOSS ? undefined : eq(carbonCalculations.userId, userId))
                .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
            let filteredCalculations = calculationsWithClass;
            if (range === 'week' || range === 'month') {
                const now = new Date();
                let startDate;
                let endDate;
                if (range === 'week') {
                    const dayOfWeek = now.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + mondayOffset);
                    monday.setHours(0, 0, 0, 0);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    sunday.setHours(23, 59, 59, 999);
                    startDate = monday.toISOString().split('T')[0];
                    endDate = sunday.toISOString().split('T')[0];
                }
                else {
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    console.log(`📅 本月計算: 當前時間 ${now.toISOString()}`);
                    console.log(`📅 本月計算: 年份 ${now.getFullYear()}, 月份 ${now.getMonth()}`);
                    console.log(`📅 本月計算: 第一天 ${firstDay.toISOString()}, 最後一天 ${lastDay.toISOString()}`);
                    startDate = firstDay.toISOString().split('T')[0];
                    endDate = lastDay.toISOString().split('T')[0];
                }
                console.log(`📅 篩選日期範圍: ${startDate} 到 ${endDate}`);
                filteredCalculations = calculationsWithClass.filter(calc => calc.calculationDate >= startDate && calc.calculationDate <= endDate);
            }
            const dailyGroupsByClass = {};
            filteredCalculations.forEach(record => {
                const date = record.calculationDate;
                const classKey = `class${record.class}`;
                if (!dailyGroupsByClass[date]) {
                    dailyGroupsByClass[date] = {
                        class1: 0,
                        class2: 0,
                        class3: 0,
                        class4: 0,
                        class5: 0
                    };
                }
                dailyGroupsByClass[date][classKey] += record.totalEmission;
            });
            const generateDateRange = (startDate, endDate) => {
                const dates = [];
                const start = new Date(startDate);
                const end = new Date(endDate);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    dates.push(d.toISOString().split('T')[0]);
                }
                return dates;
            };
            const allDates = Object.keys(dailyGroupsByClass);
            let dailyEmissionsByClass;
            let rangeStartDate;
            let rangeEndDate;
            if (range === 'week' || range === 'month') {
                const now = new Date();
                if (range === 'week') {
                    const dayOfWeek = now.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + mondayOffset);
                    rangeStartDate = monday.toISOString().split('T')[0];
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    rangeEndDate = sunday.toISOString().split('T')[0];
                }
                else {
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    console.log(`📅 本月範圍計算: 當前時間 ${now.toISOString()}`);
                    console.log(`📅 本月範圍計算: 年份 ${now.getFullYear()}, 月份 ${now.getMonth()}`);
                    console.log(`📅 本月範圍計算: 第一天 ${firstDay.toISOString()}, 最後一天 ${lastDay.toISOString()}`);
                    rangeStartDate = firstDay.toISOString().split('T')[0];
                    rangeEndDate = lastDay.toISOString().split('T')[0];
                    console.log(`📅 本月範圍結果: ${rangeStartDate} 到 ${rangeEndDate}`);
                }
            }
            else {
                if (allDates.length === 0) {
                    const now = new Date();
                    rangeStartDate = now.toISOString().split('T')[0];
                    rangeEndDate = now.toISOString().split('T')[0];
                }
                else {
                    const sortedDates = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                    rangeStartDate = sortedDates[0];
                    rangeEndDate = sortedDates[sortedDates.length - 1];
                }
            }
            const fullDateRange = generateDateRange(rangeStartDate, rangeEndDate);
            console.log(`📅 完整日期範圍: ${rangeStartDate} 到 ${rangeEndDate}`);
            console.log(`📅 生成的日期陣列:`, fullDateRange.slice(0, 5), '...', fullDateRange.slice(-5));
            dailyEmissionsByClass = fullDateRange.map((date, index) => {
                const data = dailyGroupsByClass[date] || {
                    class1: 0,
                    class2: 0,
                    class3: 0,
                    class4: 0,
                    class5: 0
                };
                const [year, month, day] = date.split('-');
                const dateLabel = `${parseInt(month)}/${parseInt(day)}`;
                if (index < 5) {
                    console.log(`📅 日期標籤: ${date} -> ${dateLabel}`);
                }
                return {
                    date: date,
                    dateLabel: dateLabel,
                    class1: parseFloat(data.class1.toFixed(2)),
                    class2: parseFloat(data.class2.toFixed(2)),
                    class3: parseFloat(data.class3.toFixed(2)),
                    class4: parseFloat(data.class4.toFixed(2)),
                    class5: parseFloat(data.class5.toFixed(2))
                };
            });
            const summary = {
                class1: { total: 0, avg: 0 },
                class2: { total: 0, avg: 0 },
                class3: { total: 0, avg: 0 },
                class4: { total: 0, avg: 0 },
                class5: { total: 0, avg: 0 }
            };
            dailyEmissionsByClass.forEach(day => {
                summary.class1.total += day.class1;
                summary.class2.total += day.class2;
                summary.class3.total += day.class3;
                summary.class4.total += day.class4;
                summary.class5.total += day.class5;
            });
            const days = dailyEmissionsByClass.length;
            if (days > 0) {
                summary.class1.avg = parseFloat((summary.class1.total / days).toFixed(2));
                summary.class2.avg = parseFloat((summary.class2.total / days).toFixed(2));
                summary.class3.avg = parseFloat((summary.class3.total / days).toFixed(2));
                summary.class4.avg = parseFloat((summary.class4.total / days).toFixed(2));
                summary.class5.avg = parseFloat((summary.class5.total / days).toFixed(2));
            }
            res.json({
                success: true,
                data: {
                    dailyEmissionsByClass: dailyEmissionsByClass,
                    summary: summary
                },
                message: `成功取得 ${filteredCalculations.length} 筆計算記錄，共 ${dailyEmissionsByClass.length} 天，按類別分組`
            });
        }
        else {
            const dailyData = processDailyData(calculations);
            res.json({
                success: true,
                data: {
                    dailyData: dailyData.dailyGroups,
                    totalEmission: dailyData.totalEmission,
                    emissionBreakdown: dailyData.emissionBreakdown,
                    summary: {
                        totalRecords: calculations.length,
                        totalDays: dailyData.dailyGroups.length,
                        averageDailyEmission: dailyData.dailyGroups.length > 0 ?
                            (dailyData.totalEmission / dailyData.dailyGroups.length).toFixed(2) : 0
                    }
                },
                message: `成功取得 ${calculations.length} 筆計算記錄，共 ${dailyData.dailyGroups.length} 天`
            });
        }
    }
    catch (error) {
        console.error('❌ 取得計算記錄時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得計算記錄失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/daily-emissions-summary', authenticateToken, requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]), async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const daysParam = req.query.days || '';
        const mode = (req.query.mode || '').toLowerCase();
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        let calculations;
        console.log(`🔍 ${userRole === USER_ROLES.BOSS ? '老闆' : '主管'} ${userId} 查看所有每日排放加總量...`);
        calculations = await db.select().from(carbonCalculations)
            .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
        const allowedDays = new Set(['7', '30', '365']);
        const toLocalDateStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        let rangeStartDateStr = null;
        let rangeEndDateStr = null;
        if (mode === 'month') {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            rangeStartDateStr = toLocalDateStr(first);
            rangeEndDateStr = toLocalDateStr(last);
            console.log(`📅 mode=month 範圍 ${rangeStartDateStr} ~ ${rangeEndDateStr}`);
        }
        else if (mode === 'year') {
            const now = new Date();
            const first = new Date(now.getFullYear(), 0, 1);
            const last = new Date(now.getFullYear(), 11, 31);
            rangeStartDateStr = toLocalDateStr(first);
            rangeEndDateStr = toLocalDateStr(last);
            console.log(`📅 mode=year 範圍 ${rangeStartDateStr} ~ ${rangeEndDateStr}`);
        }
        else if (allowedDays.has(daysParam)) {
            const days = parseInt(daysParam, 10);
            const now = new Date();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const start = new Date(end);
            start.setDate(end.getDate() - (days - 1));
            rangeStartDateStr = toLocalDateStr(start);
            rangeEndDateStr = toLocalDateStr(end);
            console.log(`📅 days 參數: ${days} 天，範圍 ${rangeStartDateStr} ~ ${rangeEndDateStr}`);
        }
        let filtered = calculations;
        if (rangeStartDateStr && rangeEndDateStr) {
            filtered = calculations.filter(rec => rec.calculationDate >= rangeStartDateStr && rec.calculationDate <= rangeEndDateStr);
        }
        const dailyTotals = {};
        filtered.forEach((rec) => {
            const date = rec.calculationDate;
            if (!dailyTotals[date])
                dailyTotals[date] = { total: 0, count: 0 };
            dailyTotals[date].total += rec.totalEmission;
            dailyTotals[date].count += 1;
        });
        const generateDateRangeLocal = (startDate, endDate) => {
            const dates = [];
            const [sy, sm, sd] = startDate.split('-').map(Number);
            const [ey, em, ed] = endDate.split('-').map(Number);
            const start = new Date(sy, sm - 1, sd);
            const end = new Date(ey, em - 1, ed);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(toLocalDateStr(d));
            }
            return dates;
        };
        let finalStart = rangeStartDateStr;
        let finalEnd = rangeEndDateStr;
        if (!finalStart || !finalEnd) {
            const dates = Object.keys(dailyTotals).sort();
            if (dates.length > 0) {
                finalStart = dates[0];
                finalEnd = dates[dates.length - 1];
            }
            else {
                const today = toLocalDateStr(new Date());
                finalStart = today;
                finalEnd = today;
            }
        }
        const fullDates = generateDateRangeLocal(finalStart, finalEnd);
        let cumulative = 0;
        const dailyEmissionsSummary = fullDates.map(date => {
            const total = dailyTotals[date]?.total || 0;
            const count = dailyTotals[date]?.count || 0;
            cumulative += total;
            const [y, m, d] = date.split('-');
            const dateLabel = `${parseInt(m)}/${parseInt(d)}`;
            return {
                date,
                dateLabel,
                dailyTotalEmission: parseFloat(total.toFixed(2)),
                recordCount: count,
                cumulativeEmission: parseFloat(cumulative.toFixed(2))
            };
        });
        console.log(`✅ 找到 ${dailyEmissionsSummary.length} 天的每日排放加總量（最小~最大: ${finalStart} ~ ${finalEnd}）`);
        res.json({
            success: true,
            data: {
                dailyEmissionsSummary,
                summary: {
                    totalDays: dailyEmissionsSummary.length,
                    totalEmission: parseFloat(dailyEmissionsSummary.reduce((s, d) => s + d.dailyTotalEmission, 0).toFixed(2)),
                    averageDailyEmission: dailyEmissionsSummary.length > 0 ?
                        parseFloat((dailyEmissionsSummary.reduce((s, d) => s + d.dailyTotalEmission, 0) / dailyEmissionsSummary.length).toFixed(2)) : 0
                }
            },
            message: `成功取得 ${dailyEmissionsSummary.length} 天的每日排放加總量`
        });
    }
    catch (error) {
        console.error('❌ 取得每日排放加總量時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得每日排放加總量失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/emissions-breakdown', authenticateToken, requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]), async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({ success: false, message: '使用者未認證' });
        }
        const startDateParam = req.query.startDate || '';
        const endDateParam = req.query.endDate || '';
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const toLocalDateStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const now = new Date();
        const defaultStart = toLocalDateStr(new Date(now.getFullYear(), 0, 1));
        const defaultEnd = toLocalDateStr(new Date(now.getFullYear(), 11, 31));
        let startDate = startDateParam && dateRegex.test(startDateParam) ? startDateParam : defaultStart;
        let endDate = endDateParam && dateRegex.test(endDateParam) ? endDateParam : defaultEnd;
        if (startDate > endDate) {
            const tmp = startDate;
            startDate = endDate;
            endDate = tmp;
        }
        console.log(`📊 emissions-breakdown 查詢區間: ${startDate} ~ ${endDate}`);
        const baseQuery = db
            .select({
            id: carbonCalculations.id,
            carbonId: carbonCalculations.carbonId,
            fuelNameFromCalc: carbonCalculations.fuelName,
            totalEmission: carbonCalculations.totalEmission,
            calculationDate: carbonCalculations.calculationDate,
            fuelName: carbon.fuelName,
        })
            .from(carbonCalculations)
            .innerJoin(carbon, eq(carbonCalculations.carbonId, carbon.id))
            .where(and(gte(carbonCalculations.calculationDate, startDate), lte(carbonCalculations.calculationDate, endDate)))
            .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
        const rows = await baseQuery;
        const byFuel = {};
        let grandTotal = 0;
        rows.forEach(r => {
            const key = String(r.carbonId);
            const name = r.fuelName || r.fuelNameFromCalc || '未知燃料';
            if (!byFuel[key])
                byFuel[key] = { fuelName: name, total: 0 };
            byFuel[key].total += r.totalEmission;
            grandTotal += r.totalEmission;
        });
        const items = Object.keys(byFuel)
            .map(carbonId => ({
            carbonId,
            fuelName: byFuel[carbonId].fuelName,
            totalEmission: parseFloat(byFuel[carbonId].total.toFixed(2)),
        }))
            .sort((a, b) => b.totalEmission - a.totalEmission);
        const withPct = items.map(it => ({
            ...it,
            percentage: grandTotal > 0 ? parseFloat(((it.totalEmission / grandTotal) * 100).toFixed(2)) : 0
        }));
        return res.json({
            success: true,
            data: {
                range: { startDate, endDate },
                totalEmission: parseFloat(grandTotal.toFixed(2)),
                breakdown: withPct
            },
            message: `成功取得 ${withPct.length} 種燃料來源占比`
        });
    }
    catch (error) {
        console.error('❌ 取得來源占比失敗:', error);
        return res.status(500).json({ success: false, message: '取得來源占比失敗', error: error instanceof Error ? error.message : '未知錯誤' });
    }
});
router.get('/fuel-emissions/:carbonId', authenticateToken, requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]), async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { carbonId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        if (!carbonId || typeof carbonId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'carbonId 參數錯誤'
            });
        }
        console.log(`🔍 ${userRole === USER_ROLES.BOSS ? '老闆' : '主管'} ${userId} 查看 carbonId=${carbonId} 的排放記錄...`);
        const calculations = await db.select().from(carbonCalculations)
            .where(eq(carbonCalculations.carbonId, carbonId))
            .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
        if (calculations.length === 0) {
            return res.json({
                success: true,
                data: {
                    carbonId: carbonId,
                    fuelName: '未知燃料',
                    dailyEmissions: [],
                    totalEmission: 0,
                    recordCount: 0
                },
                message: `未找到 carbonId=${carbonId} 的排放記錄`
            });
        }
        const dailyGroups = {};
        calculations.forEach(record => {
            const date = record.calculationDate;
            if (!dailyGroups[date]) {
                dailyGroups[date] = [];
            }
            dailyGroups[date].push(record);
        });
        const dailyEmissions = Object.keys(dailyGroups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map(date => {
            const dayRecords = dailyGroups[date];
            const dailyTotalEmission = dayRecords.reduce((sum, record) => sum + record.totalEmission, 0);
            return {
                date: date,
                dailyTotalEmission: parseFloat(dailyTotalEmission.toFixed(2)),
                recordCount: dayRecords.length,
                records: dayRecords.map((record) => ({
                    id: record.id,
                    consumption: record.consumption,
                    unit: record.unit,
                    totalEmission: record.totalEmission,
                    createdAt: record.createdAt
                }))
            };
        });
        let cumulativeEmission = 0;
        const dailyEmissionsWithCumulative = dailyEmissions
            .slice()
            .reverse()
            .map(day => {
            cumulativeEmission += day.dailyTotalEmission;
            return {
                ...day,
                cumulativeEmission: parseFloat(cumulativeEmission.toFixed(2))
            };
        })
            .reverse();
        const totalEmission = calculations.reduce((sum, record) => sum + record.totalEmission, 0);
        const fuelName = calculations[0].fuelName || '未知燃料';
        console.log(`✅ 找到 ${calculations.length} 筆 carbonId=${carbonId} 的排放記錄`);
        res.json({
            success: true,
            data: {
                carbonId: carbonId,
                fuelName: fuelName,
                dailyEmissions: dailyEmissionsWithCumulative,
                totalEmission: parseFloat(totalEmission.toFixed(2)),
                recordCount: calculations.length,
                dateRange: {
                    earliest: dailyEmissionsWithCumulative.length > 0 ? dailyEmissionsWithCumulative[dailyEmissionsWithCumulative.length - 1].date : null,
                    latest: dailyEmissionsWithCumulative.length > 0 ? dailyEmissionsWithCumulative[0].date : null,
                    totalDays: dailyEmissionsWithCumulative.length
                }
            },
            message: `成功取得 carbonId=${carbonId} 的所有每日排放量`
        });
    }
    catch (error) {
        console.error('❌ 取得指定燃料排放記錄時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得指定燃料排放記錄失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/fuels', async (_req, res) => {
    try {
        console.log('🔍 取得燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
            class: carbon.class,
        }).from(carbon);
        console.log(`✅ 成功取得 ${fuels.length} 種燃料`);
        res.json({
            success: true,
            data: fuels,
            message: `成功取得 ${fuels.length} 種燃料選單`
        });
    }
    catch (error) {
        console.error('❌ 取得燃料選單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得燃料選單失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
router.get('/daily-emissions/:date', authenticateToken, requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]), async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { date } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: '日期格式錯誤，請使用 YYYY-MM-DD 格式'
            });
        }
        console.log(`🔍 ${userRole === USER_ROLES.BOSS ? '老闆' : '主管'} ${userId} 查看 ${date} 的所有排放記錄...`);
        const calculations = await db.select().from(carbonCalculations)
            .where(eq(carbonCalculations.calculationDate, date))
            .orderBy(desc(carbonCalculations.createdAt));
        const dailyTotalEmission = calculations.reduce((sum, record) => sum + record.totalEmission, 0);
        const emissionBreakdown = calculateEmissionBreakdown(calculations);
        const fuelEmissionBreakdown = {};
        calculations.forEach((record) => {
            const fuelName = record.fuelName || '未知燃料';
            if (!fuelEmissionBreakdown[fuelName]) {
                fuelEmissionBreakdown[fuelName] = 0;
            }
            fuelEmissionBreakdown[fuelName] += record.totalEmission;
        });
        const fuelEmissions = Object.keys(fuelEmissionBreakdown).map(fuelName => ({
            fuelName: fuelName,
            totalEmission: parseFloat(fuelEmissionBreakdown[fuelName].toFixed(2)),
            percentage: parseFloat(((fuelEmissionBreakdown[fuelName] / dailyTotalEmission) * 100).toFixed(2))
        }));
        console.log(`✅ 找到 ${calculations.length} 筆 ${date} 的排放記錄`);
        res.json({
            success: true,
            data: {
                date: date,
                dailyTotalEmission: parseFloat(dailyTotalEmission.toFixed(2)),
                emissionBreakdown: emissionBreakdown,
                fuelEmissions: fuelEmissions
            },
            message: `成功取得 ${date} 的排放總量`
        });
    }
    catch (error) {
        console.error('❌ 取得指定日期排放記錄時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取得指定日期排放記錄失敗',
            error: error instanceof Error ? error.message : '未知錯誤'
        });
    }
});
export default router;
//# sourceMappingURL=carbon.routes.js.map
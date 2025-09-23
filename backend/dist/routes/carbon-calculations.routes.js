import { Router } from 'express';
import { db } from '../db/index';
import { carbon, carbonCalculations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
const router = Router();
const calculateEmissionSchema = z.object({
    carbonId: z.string().min(1, '碳排係數ID不能為空'),
    consumption: z.number().positive('消耗量必須大於0'),
});
router.get('/fuels', async (_req, res) => {
    try {
        console.log('🔍 取得燃料選單...');
        const fuels = await db.select({
            id: carbon.id,
            name: carbon.fuelName,
            unit: carbon.unit,
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
router.post('/recordEnergyConsume', async (req, res) => {
    try {
        console.log('🧮 開始記錄能源消耗並計算碳排量...');
        const validationResult = calculateEmissionSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: '輸入資料驗證失敗',
                errors: validationResult.error.errors
            });
        }
        const { carbonId, consumption } = validationResult.data;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        console.log(`📊 計算參數: carbonId=${carbonId}, consumption=${consumption}, userId=${userId}`);
        const carbonData = await db.select().from(carbon).where(eq(carbon.id, carbonId));
        if (carbonData.length === 0) {
            return res.status(404).json({
                success: false,
                message: '找不到指定的碳排係數資料'
            });
        }
        const fuel = carbonData[0];
        console.log(`🔍 找到燃料: ${fuel.fuelName}`);
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
        const totalEmission = co2GwpEmission + ch4GwpEmission + n2oGwpEmission +
            pfcsGwpEmission + hfcsGwpEmission + sf6GwpEmission + nf3GwpEmission;
        console.log(`🎯 總排放量: ${totalEmission}`);
        const calculationResult = await db.insert(carbonCalculations).values({
            userId: userId,
            carbonId: carbonId,
            fuelName: fuel.fuelName,
            consumption: consumption,
            unit: fuel.unit,
            totalEmission: totalEmission,
            calculationDate: new Date().toISOString().split('T')[0],
            notes: `能源消耗記錄: ${fuel.fuelName} 消耗量 ${consumption} ${fuel.unit}`
        }).returning();
        console.log(`✅ 能源消耗記錄已存入資料庫，total_emission: ${totalEmission}，ID: ${calculationResult[0].id}`);
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
router.get('/my-calculations', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '使用者未認證'
            });
        }
        console.log(`🔍 取得使用者 ${userId} 的計算記錄...`);
        const calculations = await db.select().from(carbonCalculations)
            .where(eq(carbonCalculations.userId, userId))
            .orderBy(carbonCalculations.createdAt);
        console.log(`✅ 找到 ${calculations.length} 筆計算記錄`);
        res.json({
            success: true,
            data: calculations,
            message: `成功取得 ${calculations.length} 筆計算記錄`
        });
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
export default router;
//# sourceMappingURL=carbon-calculations.routes.js.map
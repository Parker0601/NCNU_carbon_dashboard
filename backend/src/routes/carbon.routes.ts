import { Router } from 'express';
import { db } from '../db/index';
import { carbon, carbonCalculations } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken, USER_ROLES, requireRole } from '../middleware/auth';

const router = Router();

// 台灣時間工具函數
function getTaiwanDate(): string {
  const now = new Date();
  // 轉換為台灣時間 (UTC+8)
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return taiwanTime.toISOString().split('T')[0];
}


function getTaiwanTimestampForDB(): Date {
  const now = new Date();
  // 轉換為台灣時間 (UTC+8) 並設定時區
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return taiwanTime;
}

// 處理每日資料的函數
function processDailyData(calculations: any[]) {
  // 按日期分組
  const dailyGroups: { [key: string]: any[] } = {};
  
  calculations.forEach(record => {
    const date = record.calculationDate;
    if (!dailyGroups[date]) {
      dailyGroups[date] = [];
    }
    dailyGroups[date].push(record);
  });

  // 計算每日統計和累加排放量
  const processedDailyGroups = Object.keys(dailyGroups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // 按日期降序排列
    .map(date => {
      const dayRecords = dailyGroups[date];
      const dailyTotalEmission = dayRecords.reduce((sum, record) => sum + record.totalEmission, 0);
      
      // 計算排放種類占比
      const emissionBreakdown = calculateEmissionBreakdown(dayRecords);
      
      return {
        date: date,
        records: dayRecords,
        dailyTotalEmission: parseFloat(dailyTotalEmission.toFixed(2)),
        recordCount: dayRecords.length,
        emissionBreakdown: emissionBreakdown
      };
    });

  // 計算總排放量和累加排放量
  let totalEmission = 0;
  const dailyGroupsWithCumulative = processedDailyGroups.map(day => {
    totalEmission += day.dailyTotalEmission;
    return {
      ...day,
      cumulativeEmission: parseFloat(totalEmission.toFixed(2))
    };
  });

  // 計算整體排放種類占比
  const overallEmissionBreakdown = calculateEmissionBreakdown(calculations);

  return {
    dailyGroups: dailyGroupsWithCumulative,
    totalEmission: parseFloat(totalEmission.toFixed(2)),
    emissionBreakdown: overallEmissionBreakdown
  };
}

// 計算排放種類占比的函數
function calculateEmissionBreakdown(records: any[]) {
  const breakdown = {
    co2: { total: 0, percentage: 0 },
    ch4: { total: 0, percentage: 0 },
    n2o: { total: 0, percentage: 0 },
    pfcs: { total: 0, percentage: 0 },
    hfcs: { total: 0, percentage: 0 },
    sf6: { total: 0, percentage: 0 },
    nf3: { total: 0, percentage: 0 }
  };

  // 這裡需要從carbon表獲取係數來計算各類排放量
  // 由於我們只有totalEmission，我們需要重新計算各類排放量
  // 或者我們可以修改資料庫結構來儲存各類排放量
  
  // 暫時使用簡化的計算方式
  records.forEach(record => {
    // 這裡需要根據carbon表的係數重新計算
    // 為了演示，我們使用假設的比例
    breakdown.co2.total += record.totalEmission * 0.6; // 假設CO2佔60%
    breakdown.ch4.total += record.totalEmission * 0.25; // 假設CH4佔25%
    breakdown.n2o.total += record.totalEmission * 0.15; // 假設N2O佔15%
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

// 驗證器
const calculateEmissionSchema = z.object({
  carbonId: z.string().min(1, '碳排係數ID不能為空'),
  consumption: z.number().positive('消耗量必須大於0'),
  calculationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須為 YYYY-MM-DD').optional(),
});

// 取得所有可用的燃料選單
//也就是使用者選擇要記錄的燃料的選單
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

  } catch (error) {
    console.error('❌ 取得燃料選單時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得燃料選單失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

// 取得class=1的燃料選單（用於燃料燃燒分頁）
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

  } catch (error) {
    console.error('❌ 取得class=1燃料選單時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得class=1燃料選單失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

// 記錄能源消耗並計算碳排量
//也就是recordEnergyConsume 手動輸入(目前沒有依賴設備)
router.post('/recordEnergyConsume', authenticateToken, async (req, res) => {
  try {
    console.log('🧮 開始記錄能源消耗並計算碳排量...');
    
    // 驗證輸入資料
    const validationResult = calculateEmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: '輸入資料驗證失敗',
        errors: validationResult.error.errors
      });
    }

    const { carbonId, consumption, calculationDate } = validationResult.data;
    const userId = (req as any).user?.id; // 假設從認證中間件取得使用者ID

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '使用者未認證'
      });
    }

    console.log(`📊 計算參數: carbonId=${carbonId}, consumption=${consumption}, userId=${userId}`);

    // 從carbon表取得係數資料
    const carbonData = await db.select().from(carbon).where(eq(carbon.id, carbonId));
    
    if (carbonData.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的碳排係數資料'
      });
    }

    const fuel = carbonData[0];
    console.log(`🔍 找到燃料: ${fuel.fuelName}`);

    // 計算各種排放量 (消耗量 × 係數)
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

    // 計算GWP加權排放量 (排放量 × GWP值)
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

    // 計算總排放量 (所有GWP加權排放量之和)
    const totalEmission = co2GwpEmission + ch4GwpEmission + n2oGwpEmission + 
                         pfcsGwpEmission + hfcsGwpEmission + sf6GwpEmission + nf3GwpEmission;

    console.log(`🎯 總排放量: ${totalEmission}`);

    // 存入carbon_calculations表的total_emission欄位
    const calculationResult = await db.insert(carbonCalculations).values({
      userId: userId,
      carbonId: carbonId,
      fuelName: fuel.fuelName || '',
      consumption: consumption,
      unit: fuel.unit || '',
      totalEmission: totalEmission, // 儲存到total_emission欄位
      calculationDate: calculationDate || getTaiwanDate(), // 使用指定的日期或台灣今天的日期
      createdAt: getTaiwanTimestampForDB(), // 使用台灣時間設定創建時間
      notes: `能源消耗記錄: ${fuel.fuelName} 消耗量 ${consumption} ${fuel.unit}，totalEmission總共是 ${totalEmission.toFixed(2)} 公噸/年`
    }).returning();

    console.log(`✅ 能源消耗記錄已存入資料庫，total_emission: ${totalEmission}，ID: ${calculationResult[0].id}`);

    // 回傳計算結果
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

  } catch (error) {
    console.error('❌ 記錄能源消耗時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '記錄能源消耗失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

// 取得計算記錄 (員工只能看自己的，老闆可以看所有人的)
router.get('/my-calculations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '使用者未認證'
      });
    }

    let calculations;
    
    if (userRole === USER_ROLES.BOSS) {
      // 老闆可以查看所有員工的記錄
      console.log(`🔍 老闆 ${userId} 查看所有計算記錄...`);
      calculations = await db.select().from(carbonCalculations)
        .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
    } else {
      // 員工只能查看自己的記錄
      console.log(`🔍 員工 ${userId} 查看自己的計算記錄...`);
      calculations = await db.select().from(carbonCalculations)
        .where(eq(carbonCalculations.userId, userId))
        .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));
    }

    console.log(`✅ 找到 ${calculations.length} 筆計算記錄`);

    // 按天分區處理資料
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

  } catch (error) {
    console.error('❌ 取得計算記錄時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得計算記錄失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

// 取得所有日期的每日排放加總量 (只有主管和老闆能使用)
//也就是carbonEmissionsTrend （碳排趨勢）（上下遊）
router.get('/daily-emissions-summary', authenticateToken, requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]), async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '使用者未認證'
      });
    }

    let calculations;
    
    // 主管和老闆可以查看所有員工的記錄
    console.log(`🔍 ${userRole === USER_ROLES.BOSS ? '老闆' : '主管'} ${userId} 查看所有每日排放加總量...`);
    calculations = await db.select().from(carbonCalculations)
      .orderBy(desc(carbonCalculations.calculationDate), desc(carbonCalculations.createdAt));

    // 按日期分組並計算每日排放加總量
    const dailyData = processDailyData(calculations);
    
    // 計算每日排放加總量
    const dailyEmissionsSummary = dailyData.dailyGroups.map(day => ({
      date: day.date,
      dailyTotalEmission: day.dailyTotalEmission,
      recordCount: day.recordCount,
      cumulativeEmission: day.cumulativeEmission
    }));

    console.log(`✅ 找到 ${dailyEmissionsSummary.length} 天的每日排放加總量`);

    res.json({
      success: true,
      data: {
        dailyEmissionsSummary: dailyEmissionsSummary,
        summary: {
          totalDays: dailyEmissionsSummary.length,
          totalEmission: dailyData.totalEmission,
          averageDailyEmission: dailyData.dailyGroups.length > 0 ? 
            parseFloat((dailyData.totalEmission / dailyData.dailyGroups.length).toFixed(2)) : 0
        }
      },
      message: `成功取得 ${dailyEmissionsSummary.length} 天的每日排放加總量`
    });

  } catch (error) {
    console.error('❌ 取得每日排放加總量時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得每日排放加總量失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

  // 根據carbonId取得該燃料的每天排放量 (只有主管和老闆能使用)
  //也就是getEnergyConsumeTrend 能源消耗組成趨勢
  //路由要輸入http://localhost:3000/api/carbon-calculations/fuel-emissions/"carbonId"
  //例如：http://localhost:3000/api/carbon-calculations/fuel-emissions/170001
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

      // 驗證carbonId格式
      if (!carbonId || typeof carbonId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'carbonId 參數錯誤'
        });
      }

      // 主管和老闆可以查看所有員工的記錄
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

      // 按日期分組
      const dailyGroups: { [key: string]: any[] } = {};
      calculations.forEach(record => {
        const date = record.calculationDate;
        if (!dailyGroups[date]) {
          dailyGroups[date] = [];
        }
        dailyGroups[date].push(record);
      });

      // 計算每日排放量
      const dailyEmissions = Object.keys(dailyGroups)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // 按日期降序排列
        .map(date => {
          const dayRecords = dailyGroups[date];
          const dailyTotalEmission = dayRecords.reduce((sum: number, record: any) => sum + record.totalEmission, 0);
          
          return {
            date: date,
            dailyTotalEmission: parseFloat(dailyTotalEmission.toFixed(2)),
            recordCount: dayRecords.length,
            records: dayRecords.map((record: any) => ({
              id: record.id,
              consumption: record.consumption,
              unit: record.unit,
              totalEmission: record.totalEmission,
              createdAt: record.createdAt
            }))
          };
        });

      // 計算累積排放量（從最早到最晚）
      let cumulativeEmission = 0;
      const dailyEmissionsWithCumulative = dailyEmissions
        .slice()
        .reverse() // 反轉為從最早到最晚
        .map(day => {
          cumulativeEmission += day.dailyTotalEmission;
          return {
            ...day,
            cumulativeEmission: parseFloat(cumulativeEmission.toFixed(2))
          };
        })
        .reverse(); // 再反轉回從最晚到最早

      // 計算總排放量
      const totalEmission = calculations.reduce((sum: number, record: any) => sum + record.totalEmission, 0);
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

    } catch (error) {
      console.error('❌ 取得指定燃料排放記錄時發生錯誤:', error);
      res.status(500).json({
        success: false,
        message: '取得指定燃料排放記錄失敗',
        error: error instanceof Error ? error.message : '未知錯誤'
      });
    }
  });

  // 根據日期取得該天的所有totalEmission (只有主管和老闆能使用)
  //也就是carbonEmissionsSource （碳排來源組成 年更換）
  //可以顯示不同天 有哪些排放種類的圓餅圖
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

    // 驗證日期格式 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: '日期格式錯誤，請使用 YYYY-MM-DD 格式'
      });
    }

    // 主管和老闆可以查看所有員工的記錄
    console.log(`🔍 ${userRole === USER_ROLES.BOSS ? '老闆' : '主管'} ${userId} 查看 ${date} 的所有排放記錄...`);
    const calculations = await db.select().from(carbonCalculations)
      .where(eq(carbonCalculations.calculationDate, date))
      .orderBy(desc(carbonCalculations.createdAt));

    // 計算該日的統計資訊
    const dailyTotalEmission = calculations.reduce((sum: number, record: any) => sum + record.totalEmission, 0);
    const emissionBreakdown = calculateEmissionBreakdown(calculations);

    // 計算不同fuelName的碳排
    const fuelEmissionBreakdown: { [key: string]: number } = {};
    calculations.forEach((record: any) => {
      const fuelName = record.fuelName || '未知燃料';
      if (!fuelEmissionBreakdown[fuelName]) {
        fuelEmissionBreakdown[fuelName] = 0;
      }
      fuelEmissionBreakdown[fuelName] += record.totalEmission;
    });

    // 格式化fuelName排放數據
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

  } catch (error) {
    console.error('❌ 取得指定日期排放記錄時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '取得指定日期排放記錄失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
});

export default router;
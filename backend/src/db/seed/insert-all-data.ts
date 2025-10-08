import { db } from '../index';
import { carbon } from '../schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface CarbonData {
  id: number;
  name: string;
  unit: string;
  '產生CO2': string | null;
  '產生CH4': string | null;
  '產生N2O': string | null;
  '產生HFCs': string | null;
  '產生PFCs': string | null;
  '產生SF6': string | null;
  '產生NF3': string | null;
  'CO2係數值': number;
  'CH4係數值': number;
  'N2O係數值': number;
  'HFCs係數值': number;
  'PFCs係數值': number;
  'SF6係數值': number;
  'NF3係數值': number;
  '係數單位': string;
  'CO2gwp值': number;
  'CH4gwp值': number;
  'N2Ogwp值': number;
  'HFCsgwp值': number;
  'PFCsgwp值': number;
  'SF6gwp值': number;
  'NF3gwp值': number;
}

interface AllData {
  generated_at: string;
  root: string;
  files: Array<{
    file: string;
    size_bytes: number;
    type: string;
    content: {
      [key: string]: CarbonData[];
    };
  }>;
}

async function insertAllData() {
  try {
    console.log('🚀 開始插入所有碳排係數資料...');
    
    // 讀取 JSON 文件
    const jsonPath = path.resolve(process.cwd(), 'all_data.json');
    console.log(`📁 讀取文件: ${jsonPath}`);
    
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    // 修復 JSON 格式問題
    let fixedJsonData = jsonData
      .replace(/:\s*NaN\s*,?/g, ': null,')  // 修復 NaN 值
      .replace(/,(\s*[}\]])/g, '$1');       // 移除多餘的逗號
    
    const allData: AllData = JSON.parse(fixedJsonData);
    
    console.log(`📊 找到 ${allData.files.length} 個文件`);
    
    let totalInserted = 0;
    
    // 遍歷所有文件
    for (const file of allData.files) {
      console.log(`\n📄 處理文件: ${file.file}`);
      
      // 遍歷文件中的所有工作表
      for (const [sheetName, dataArray] of Object.entries(file.content)) {
        console.log(`  📋 處理工作表: ${sheetName}`);
        console.log(`  📈 資料筆數: ${dataArray.length}`);
        
        // 插入每筆資料
        for (const item of dataArray) {
          try {
            // 轉換資料格式，忽略 NULL 值
            const carbonRecord: any = {
              id: item.id.toString(),
              fuelName: item.name,
              unit: item.unit,
            };
            
            // 只添加非 null 的係數值
            if (item['產生CO2'] === 'v' && item['CO2係數值'] !== null) {
              carbonRecord.co2 = item['CO2係數值'];
            }
            if (item['產生CH4'] === 'v' && item['CH4係數值'] !== null) {
              carbonRecord.ch4 = item['CH4係數值'];
            }
            if (item['產生N2O'] === 'v' && item['N2O係數值'] !== null) {
              carbonRecord.n2o = item['N2O係數值'];
            }
            if (item['產生PFCs'] === 'v' && item['PFCs係數值'] !== null) {
              carbonRecord.pfcs = item['PFCs係數值'];
            }
            if (item['產生HFCs'] === 'v' && item['HFCs係數值'] !== null) {
              carbonRecord.hfcs = item['HFCs係數值'];
            }
            if (item['產生SF6'] === 'v' && item['SF6係數值'] !== null) {
              carbonRecord.sf6 = item['SF6係數值'];
            }
            if (item['產生NF3'] === 'v' && item['NF3係數值'] !== null) {
              carbonRecord.nf3 = item['NF3係數值'];
            }
            
            // 只添加非 null 的 GWP 值
            if (item['CO2gwp值'] !== null) {
              carbonRecord.co2gwp = item['CO2gwp值'];
            }
            if (item['CH4gwp值'] !== null) {
              carbonRecord.ch4gwp = item['CH4gwp值'];
            }
            if (item['N2Ogwp值'] !== null) {
              carbonRecord.n2ogwp = item['N2Ogwp值'];
            }
            if (item['PFCsgwp值'] !== null) {
              carbonRecord.pfcsgwp = item['PFCsgwp值'];
            }
            if (item['HFCsgwp值'] !== null) {
              carbonRecord.hfcsgwp = item['HFCsgwp值'];
            }
            if (item['SF6gwp值'] !== null) {
              carbonRecord.sf6gwp = item['SF6gwp值'];
            }
            if (item['NF3gwp值'] !== null) {
              carbonRecord.nf3gwp = item['NF3gwp值'];
            }
            
            // 檢查是否已存在
            const existing = await db.select().from(carbon).where(eq(carbon.id, carbonRecord.id));
            
            if (existing.length > 0) {
              // 更新現有記錄
              await db.update(carbon)
                .set(carbonRecord)
                .where(eq(carbon.id, carbonRecord.id));
              console.log(`    ✅ 更新: ${item.name} (ID: ${item.id})`);
            } else {
              // 插入新記錄
              await db.insert(carbon).values(carbonRecord);
              console.log(`    ➕ 新增: ${item.name} (ID: ${item.id})`);
            }
            
            totalInserted++;
            
          } catch (error) {
            console.error(`    ❌ 錯誤處理 ${item.name} (ID: ${item.id}):`, error);
          }
        }
      }
    }
    
    console.log(`\n🎉 資料插入完成！總共處理了 ${totalInserted} 筆記錄`);
    
  } catch (error) {
    console.error('❌ 插入資料時發生錯誤:', error);
    throw error;
  }
}

// 執行插入
insertAllData()
  .then(() => {
    console.log('✅ 所有資料插入完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 插入失敗:', error);
    process.exit(1);
  });

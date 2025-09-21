import { db } from './src/db/index';
import { carbon } from './src/db/schema';
import fs from 'fs';
import path from 'path';

// 讀取JSON檔案
const jsonPath = path.join(process.cwd(), '..', 'all_data.json');
const jsonContent = fs.readFileSync(jsonPath, 'utf8');

// 處理JSON格式問題
let processedJsonContent = jsonContent
  .replace(/:\s*NaN/g, ': null')  // 替換NaN為null
  .replace(/,(\s*[}\]])/g, '$1'); // 移除尾隨逗號

const jsonData = JSON.parse(processedJsonContent);

// 轉換JSON資料為資料庫格式
function convertJsonToCarbonData(jsonItem: any) {
  // 忽略NULL值，只保留有效數值
  const convertValue = (value: any) => {
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      return null;
    }
    return value;
  };

  return {
    id: String(jsonItem.id), // 轉換為字串
    fuelName: jsonItem.name,
    consumption: null, // 使用者輸入欄位
    unit: jsonItem.unit,
    co2: convertValue(jsonItem['CO2係數值']),
    ch4: convertValue(jsonItem['CH4係數值']),
    n2o: convertValue(jsonItem['N2O係數值']),
    pfcs: convertValue(jsonItem['PFCs係數值']),
    hfcs: convertValue(jsonItem['HFCs係數值']),
    sf6: convertValue(jsonItem['SF6係數值']),
    nf3: convertValue(jsonItem['NF3係數值']),
    co2gwp: convertValue(jsonItem['CO2gwp值']),
    ch4gwp: convertValue(jsonItem['CH4gwp值']),
    n2ogwp: convertValue(jsonItem['N2Ogwp值']),
    pfcsgwp: convertValue(jsonItem['PFCsgwp值']),
    hfcsgwp: convertValue(jsonItem['HFCsgwp值']),
    sf6gwp: convertValue(jsonItem['SF6gwp值']),
    nf3gwp: convertValue(jsonItem['NF3gwp值']),
  };
}

export async function insertJsonData() {
  try {
    console.log('🌱 開始從JSON檔案插入碳排係數資料...');
    
    // 獲取資料
    const carbonData = jsonData.files[0].content['活頁簿1'];
    console.log(`📊 從JSON檔案讀取到 ${carbonData.length} 筆資料`);
    
    // 先清空現有資料
    console.log('🗑️  清空現有carbon表資料...');
    await db.delete(carbon);
    
    // 轉換資料格式
    console.log('🔄 轉換資料格式...');
    const convertedData = carbonData.map(convertJsonToCarbonData);
    
    // 插入新資料
    console.log('📥 插入新資料...');
    await db.insert(carbon).values(convertedData);
    
    console.log(`✅ 成功插入 ${convertedData.length} 筆碳排係數資料`);
    
    // 顯示插入的資料摘要
    console.log('\n📊 插入的資料摘要:');
    console.log(`- 燃料油類: ${convertedData.filter(d => d.fuelName && d.fuelName.includes('油')).length} 筆`);
    console.log(`- 天然氣: ${convertedData.filter(d => d.fuelName && d.fuelName.includes('天然氣')).length} 筆`);
    console.log(`- 煤炭: ${convertedData.filter(d => d.fuelName && d.fuelName.includes('煤')).length} 筆`);
    console.log(`- HFCs: ${convertedData.filter(d => d.hfcs !== null).length} 筆`);
    console.log(`- PFCs: ${convertedData.filter(d => d.pfcs !== null).length} 筆`);
    console.log(`- SF6: ${convertedData.filter(d => d.sf6 !== null).length} 筆`);
    console.log(`- NF3: ${convertedData.filter(d => d.nf3 !== null).length} 筆`);
    console.log(`- 其他: ${convertedData.filter(d => !d.fuelName?.includes('油') && !d.fuelName?.includes('天然氣') && !d.fuelName?.includes('煤') && d.hfcs === null && d.pfcs === null && d.sf6 === null && d.nf3 === null).length} 筆`);
    
    // 驗證插入結果
    console.log('\n🔍 驗證插入結果...');
    const insertedData = await db.select().from(carbon);
    console.log(`📈 資料庫中總共有 ${insertedData.length} 筆資料`);
    
    // 顯示前5筆資料
    console.log('\n📋 前5筆資料:');
    insertedData.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, 燃料: ${item.fuelName}, CO2: ${item.co2}`);
    });
    
  } catch (error) {
    console.error('❌ 插入碳排係數資料時發生錯誤:', error);
    throw error;
  }
}

// 如果直接執行此檔案
if (import.meta.url === `file://${process.argv[1]}`) {
  insertJsonData()
    .then(() => {
      console.log('🎉 JSON資料插入完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 插入失敗:', error);
      process.exit(1);
    });
}

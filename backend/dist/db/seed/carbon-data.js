import { db } from '../index';
import { carbon } from '../schema';
const carbonData = [
    {
        id: 170011,
        fuelName: '重油(燃料油)',
        consumption: null,
        unit: '公升/年',
        co2: 2.393761032,
        ch4: 0.0000979711,
        n2o: 0.0000195942,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: 30,
        n2ogwp: 265,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 170017,
        fuelName: '輕油(汽油)',
        consumption: null,
        unit: '公升/年',
        co2: 3.3787476,
        ch4: 0.000125604,
        n2o: 0.0000251208,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: 30,
        n2ogwp: 265,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 170019,
        fuelName: '液化石油氣',
        consumption: null,
        unit: '公升/年',
        co2: 3.110959872,
        ch4: 0.00012058,
        n2o: 0.000024116,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: 30,
        n2ogwp: 265,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 170029,
        fuelName: '重油進',
        consumption: null,
        unit: '公升/年',
        co2: 3.3473466,
        ch4: 0.000102995,
        n2o: 0.0000205991,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: 30,
        n2ogwp: 265,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 170036,
        fuelName: '重油(燃料油)',
        consumption: null,
        unit: '公升/年',
        co2: 2.393761032,
        ch4: 0.0000979711,
        n2o: 0.0000195942,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: 30,
        n2ogwp: 265,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 350008,
        fuelName: '二級重油',
        consumption: null,
        unit: '公升/年',
        co2: 1.752881276,
        ch4: 0.0000277794,
        n2o: 0.0000027779,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: 30,
        n2ogwp: 265,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 180122,
        fuelName: '二氟甲烷',
        consumption: null,
        unit: '公升/年',
        co2: null,
        ch4: null,
        n2o: null,
        pfcs: null,
        hfcs: 1,
        co2gwp: null,
        ch4gwp: null,
        n2ogwp: null,
        pfcsgwp: null,
        hfcsgwp: 23500,
    },
    {
        id: 180123,
        fuelName: '三氟甲烷',
        consumption: null,
        unit: '公升/年',
        co2: null,
        ch4: null,
        n2o: null,
        pfcs: null,
        hfcs: 1,
        co2gwp: null,
        ch4gwp: null,
        n2ogwp: null,
        pfcsgwp: null,
        hfcsgwp: 16100,
    },
    {
        id: 180177,
        fuelName: '甲烷',
        consumption: null,
        unit: '公升/年',
        co2: null,
        ch4: 1,
        n2o: null,
        pfcs: null,
        hfcs: null,
        co2gwp: null,
        ch4gwp: 28,
        n2ogwp: null,
        pfcsgwp: null,
        hfcsgwp: null,
    },
    {
        id: 350099,
        fuelName: '電力',
        consumption: null,
        unit: '度/年',
        co2: 0.474,
        ch4: null,
        n2o: null,
        pfcs: null,
        hfcs: null,
        co2gwp: 1,
        ch4gwp: null,
        n2ogwp: null,
        pfcsgwp: null,
        hfcsgwp: null,
    },
];
export async function seedCarbonData() {
    try {
        console.log('開始插入碳排係數資料...');
        await db.delete(carbon);
        console.log('已清空現有carbon表資料');
        await db.insert(carbon).values(carbonData);
        console.log(`成功插入 ${carbonData.length} 筆碳排係數資料`);
    }
    catch (error) {
        console.error('插入碳排係數資料時發生錯誤:', error);
        throw error;
    }
}
if (require.main === module) {
    seedCarbonData()
        .then(() => {
        console.log('碳排係數資料插入完成');
        process.exit(0);
    })
        .catch((error) => {
        console.error('插入失敗:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=carbon-data.js.map
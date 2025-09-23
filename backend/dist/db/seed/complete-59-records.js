import { db } from '../index';
import { carbon } from '../schema';
const complete59Records = [
    { id: 170001, fuelName: '混合重油', consumption: null, unit: '公升/年', co2: 2.207715131, ch4: 0.000796434, n2o: 0.000254859, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170002, fuelName: '輕重油', consumption: null, unit: '公升/年', co2: 2.19807, ch4: 0.000094203, n2o: 0.0000188, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170004, fuelName: '重廢油', consumption: null, unit: '公升/年', co2: 2.3948496, ch4: 0.000100483, n2o: 0.0000200966, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170005, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.55876282, ch4: 0.000106763, n2o: 0.0000213527, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170006, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.681110327, ch4: 0.000108547, n2o: 0.0000217094, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170006, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.681110327, ch4: 0.000141111, n2o: 0.000141111, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170008, fuelName: '重油', consumption: null, unit: '公升/年', co2: 3.110959872, ch4: 0.00012058, n2o: 0.000024116, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170010, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.946167424, ch4: 0.00012058, n2o: 0.000024116, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170011, fuelName: '重油(燃料油)', consumption: null, unit: '公升/年', co2: 2.393761032, ch4: 0.0000979711, n2o: 0.0000195942, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170017, fuelName: '輕油(汽油)', consumption: null, unit: '公升/年', co2: 3.3787476, ch4: 0.000125604, n2o: 0.0000251208, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170019, fuelName: '液化石油氣', consumption: null, unit: '公升/年', co2: 3.110959872, ch4: 0.00012058, n2o: 0.000024116, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170028, fuelName: '重油', consumption: null, unit: '公升/年', co2: 3.1359132, ch4: 0.0000293076, n2o: 0.0000439614, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170029, fuelName: '重油進', consumption: null, unit: '公升/年', co2: 3.3473466, ch4: 0.000102995, n2o: 0.0000205991, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 170036, fuelName: '重油(燃料油)', consumption: null, unit: '公升/年', co2: 2.393761032, ch4: 0.0000979711, n2o: 0.0000195942, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180014, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 1, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180122, fuelName: '二氟甲烷', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 23500, sf6gwp: null, nf3gwp: null },
    { id: 180123, fuelName: '三氟甲烷', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 16100, sf6gwp: null, nf3gwp: null },
    { id: 180139, fuelName: '一氟甲烷(工業)', consumption: null, unit: '公升/年', co2: 0.41509434, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180140, fuelName: '一氟甲烷', consumption: null, unit: '公升/年', co2: 0.31884058, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180143, fuelName: '一氟甲烷', consumption: null, unit: '公升/年', co2: 0.223350254, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180144, fuelName: '一氟甲烷', consumption: null, unit: '公升/年', co2: 0.522, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180146, fuelName: '一氟甲烷(小規模)', consumption: null, unit: '公升/年', co2: 0.523809524, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180177, fuelName: '甲烷', consumption: null, unit: '公升/年', co2: null, ch4: 1, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: null, ch4gwp: 28, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180178, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 2.860187299, ch4: 0.0000464316, n2o: 0.0000046432, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180191, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 3.384615385, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 180365, fuelName: '天然氣(工業用)', consumption: null, unit: '公升/年', co2: 0.733333333, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 230238, fuelName: '石灰石(CaCO3)', consumption: null, unit: '公升/年', co2: 0.44, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 240024, fuelName: '無煙煤', consumption: null, unit: '公升/年', co2: 3.666666667, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 350008, fuelName: '二級重油', consumption: null, unit: '公升/年', co2: 1.752881276, ch4: 0.0000277794, n2o: 0.0000027779, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 350014, fuelName: '天然氣', consumption: null, unit: '度/年', co2: 0.780754464, ch4: 0.0000175846, n2o: 0.0000017585, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 350016, fuelName: '天然氣', consumption: null, unit: '度/年', co2: 2.17043712, ch4: 0.0000376812, n2o: 0.0000037681, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 350017, fuelName: '天然氣', consumption: null, unit: '度/年', co2: 0.845817336, ch4: 0.0000032531, n2o: 0.0000003253, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 50001, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.76203196, ch4: 0.000113044, n2o: 0.0000226087, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 50002, fuelName: '天然氣', consumption: null, unit: '度/年', co2: 1.87903584, ch4: 0.0000334944, n2o: 0.0000033494, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 50004, fuelName: '二級重油', consumption: null, unit: '度/年', co2: 2.839524604, ch4: 0.000132688, n2o: 0.0000265376, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 60013, fuelName: '柴油', consumption: null, unit: '公升/年', co2: 0.476666667, ch4: null, n2o: null, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 70001, fuelName: '煤炭', consumption: null, unit: '公升/年', co2: 1.035387266, ch4: 0.0000097678, n2o: 0.0000146517, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 70002, fuelName: '焦炭', consumption: null, unit: '公升/年', co2: 1.202633179, ch4: 0.0000119073, n2o: 0.0000178609, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 70003, fuelName: '煤炭', consumption: null, unit: '公升/年', co2: 2.408113382, ch4: 0.0000254557, n2o: 0.0000381836, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 70004, fuelName: '煤炭', consumption: null, unit: '公升/年', co2: 2.253168288, ch4: 0.0000234461, n2o: 0.0000381836, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 70005, fuelName: '煤炭', consumption: null, unit: '公升/年', co2: 2.922093324, ch4: 0.0000297263, n2o: 0.0000445894, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 7000, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 1.5512094, ch4: 0.0000159098, n2o: 0.0000238648, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 7001, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 0.952869625, ch4: 0.0000089053, n2o: 0.000013358, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 7002, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 2.693284704, ch4: 0.0000284702, n2o: 0.0000427054, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 7003, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 2.693284704, ch4: 0.0000284702, n2o: 0.0000427054, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 7004, fuelName: '天然氣', consumption: null, unit: '公升/年', co2: 2.332859839, ch4: 0.0000246603, n2o: 0.0000369904, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1702, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.119027403, ch4: 0.0000825595, n2o: 0.0000165119, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1799, fuelName: '重油', consumption: null, unit: '公升/年', co2: 2.76203196, ch4: 0.000113044, n2o: 0.0000226087, pfcs: null, hfcs: null, sf6: null, nf3: null, co2gwp: 1, ch4gwp: 30, n2ogwp: 265, pfcsgwp: null, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1802, fuelName: '甲烷', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 265, sf6gwp: null, nf3gwp: null },
    { id: 1803, fuelName: 'PFC-14', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: 1, hfcs: null, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: 6630, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1804, fuelName: 'PFC-116', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: 1, hfcs: null, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: 11100, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1808, fuelName: 'C4F8', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: 1, hfcs: null, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: 9540, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1809, fuelName: 'C3F8', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: 1, hfcs: null, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: 8900, hfcsgwp: null, sf6gwp: null, nf3gwp: null },
    { id: 1829, fuelName: 'HFC-227ea', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 3350, sf6gwp: null, nf3gwp: null },
    { id: 1835, fuelName: 'HFC-134a', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 1300, sf6gwp: null, nf3gwp: null },
    { id: 1838, fuelName: 'HFC-41', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 116, sf6gwp: null, nf3gwp: null },
    { id: 1839, fuelName: 'HFC-32', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 677, sf6gwp: null, nf3gwp: null },
    { id: 1840, fuelName: 'HFC-23', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 12400, sf6gwp: null, nf3gwp: null },
    { id: 1878, fuelName: 'R-507A', consumption: null, unit: '公升/年', co2: null, ch4: null, n2o: null, pfcs: null, hfcs: 1, sf6: null, nf3: null, co2gwp: null, ch4gwp: null, n2ogwp: null, pfcsgwp: null, hfcsgwp: 3985, sf6gwp: null, nf3gwp: null },
];
export async function seedComplete59Records() {
    try {
        console.log('🌱 開始插入完整59筆碳排係數資料...');
        console.log('🗑️  清空現有carbon表資料...');
        await db.delete(carbon);
        console.log('📥 插入新資料...');
        await db.insert(carbon).values(complete59Records);
        console.log(`✅ 成功插入 ${complete59Records.length} 筆碳排係數資料`);
        console.log('\n📊 插入的資料摘要:');
        console.log(`- 燃料油類: ${complete59Records.filter(d => d.fuelName.includes('油')).length} 筆`);
        console.log(`- 電力: ${complete59Records.filter(d => d.fuelName.includes('電力')).length} 筆`);
        console.log(`- 天然氣: ${complete59Records.filter(d => d.fuelName.includes('天然氣')).length} 筆`);
        console.log(`- 煤炭: ${complete59Records.filter(d => d.fuelName.includes('煤')).length} 筆`);
        console.log(`- HFCs: ${complete59Records.filter(d => d.hfcs !== null).length} 筆`);
        console.log(`- PFCs: ${complete59Records.filter(d => d.pfcs !== null).length} 筆`);
        console.log(`- SF6: ${complete59Records.filter(d => d.sf6 !== null).length} 筆`);
        console.log(`- NF3: ${complete59Records.filter(d => d.nf3 !== null).length} 筆`);
        console.log(`- 其他: ${complete59Records.filter(d => !d.fuelName.includes('油') && !d.fuelName.includes('電力') && !d.fuelName.includes('天然氣') && !d.fuelName.includes('煤') && d.hfcs === null && d.pfcs === null && d.sf6 === null && d.nf3 === null).length} 筆`);
    }
    catch (error) {
        console.error('❌ 插入碳排係數資料時發生錯誤:', error);
        throw error;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    seedComplete59Records()
        .then(() => {
        console.log('🎉 完整59筆碳排係數資料插入完成');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 插入失敗:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=complete-59-records.js.map
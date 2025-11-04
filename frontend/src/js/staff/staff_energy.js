  // ====================================================
  // API 配置
  // ====================================================
  const API_BASE = 'http://localhost:3000/api';
  const API_FUELS_CLASS_1 = `${API_BASE}/carbon/fuels/class-1`; // 燃料燃燒
  const API_FUELS_CLASS_2 = `${API_BASE}/carbon/fuels/class-2`; // 製程
  const API_FUELS_CLASS_3 = `${API_BASE}/carbon/fuels/class-3`; // 逸散
  const API_FUELS_CLASS_4 = `${API_BASE}/carbon/fuels/class-4`; // 移動
  const API_FUELS_CLASS_5 = `${API_BASE}/carbon/fuels/class-5`; // 電力使用

  // ====================================================
  // 小工具
  // ====================================================
  const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
  function getToken() {
    try {
      for (const k of TOKEN_KEYS) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
    } catch (e) {
      console.warn('getToken error:', e);
    }
    return null;
  }

  // --------- in-memory state（不 persist） ---------
  let demoRecords = [];
  const submittedFlags = {};
  const remindedFlags = {};
  let carbonApexChart = null;
  let class1Fuels = []; // 儲存class=1的燃料資料（燃料燃燒）
  let class2Fuels = []; // 儲存class=2的燃料資料（製程）
  let class3Fuels = []; // 儲存class=3的燃料資料（逸散）
  let class4Fuels = []; // 儲存class=4的燃料資料（移動）
  let class5Fuels = []; // 儲存class=5的燃料資料（電力使用）

  // placeholder emission factors（單位需對齊）
  const EMISSION_FACTORS = {
    electricity: 0.5,      // kgCO2e / kWh
  };
  const DETAILED_EMISSION_FACTORS = {
    // 固態
    solid_zichan_mei: 2.1,
    solid_wuyan_mei: 2.3,
    solid_jiaotan: 2.5,
    solid_yanmei: 2.2,
    solid_yanmei_power: 2.2,
    solid_yanmei_other: 2.2,
    solid_humei: 1.9,
    solid_yuanliaomei: 2.0,
    solid_youyeshan: 2.4,
    solid_nimei: 1.8,
    solid_meiqiu: 2.0,
    // 液態
    liquid_zhengyu_you: 3.0,
    liquid_lihua_shiyouqi: 2.7,
    liquid_chai_you: 2.8,
    liquid_qita_youpin: 2.9,
    liquid_cheyong_qiyou: 2.6,
    liquid_shiyoujiao: 3.1,
    liquid_yuanyou: 3.2,
    liquid_aoli_you: 3.0,
    liquid_tianranqi_ningjie_you: 1.5,
    liquid_meiyou: 2.4,
    liquid_yeshai_you: 2.9,
    liquid_shiyouna: 3.3,
    liquid_bai_you: 1.2,
    // 氣態
    gas_tianranqi: 1.1,
    gas_gaoluqi: 0.9,
    gas_jiaoluqi: 1.0,
    gas_lianyouqi: 1.2,
    gas_yiwan: 0.8,
    // 移動源
    mobile_LNG: 1.4,
    mobile_LPG: 1.6,
    mobile_diesel: 2.5,
    mobile_gasoline: 2.3
  };

  // --------- helpers ---------
  function getLocalISODate(d = new Date()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 通用的燃料資料取得函數
  async function fetchFuelsByClass(apiUrl, classNumber, fuelArray) {
    try {
      console.log(`🔍 正在取得class=${classNumber}的燃料資料...`);
      console.log('🌐 API URL:', apiUrl);
      
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 Response data:', result);
      
      if (result.success) {
        fuelArray.length = 0; // 清空陣列
        fuelArray.push(...result.data); // 加入新資料
        console.log(`✅ 成功取得 ${fuelArray.length} 種class=${classNumber}的燃料`);
        console.log('📋 燃料列表:', fuelArray);
        return fuelArray;
      } else {
        console.error(`❌ 取得class=${classNumber}燃料資料失敗:`, result.message);
        return [];
      }
    } catch (error) {
      console.error(`❌ 取得class=${classNumber}燃料資料時發生錯誤:`, error);
      console.error('❌ 錯誤詳情:', error.message);
      return [];
    }
  }

  // 從後端取得class=1的燃料資料（燃料燃燒）
  async function fetchClass1Fuels() {
    return await fetchFuelsByClass(API_FUELS_CLASS_1, 1, class1Fuels);
  }

  // 從後端取得class=2的燃料資料（製程）
  async function fetchClass2Fuels() {
    return await fetchFuelsByClass(API_FUELS_CLASS_2, 2, class2Fuels);
  }

  // 從後端取得class=3的燃料資料（逸散）
  async function fetchClass3Fuels() {
    return await fetchFuelsByClass(API_FUELS_CLASS_3, 3, class3Fuels);
  }

  // 從後端取得class=4的燃料資料（移動）
  async function fetchClass4Fuels() {
    return await fetchFuelsByClass(API_FUELS_CLASS_4, 4, class4Fuels);
  }

  // 從後端取得class=5的燃料資料（電力使用）
  async function fetchClass5Fuels() {
    return await fetchFuelsByClass(API_FUELS_CLASS_5, 5, class5Fuels);
  }

  // 通用的燃料分頁HTML生成函數
  function generateFuelContent(fuels, category, categoryName) {
    if (!fuels || fuels.length === 0) {
      return `<div class="alert alert-warning">暫無可用的${categoryName}燃料資料</div>`;
    }

    let html = '<div class="card fuel-card"><div class="fuel-category-grid">';
    
    fuels.forEach(fuel => {
      // 生成唯一的ID（使用carbon表的id）
      const inputId = `fuel_${fuel.id}`;
      
      html += `
        <div class="form-group row align-items-center mb-2">
          <label class="col-sm-4 col-form-label" for="${inputId}">${fuel.name}</label>
          <div class="col-sm-8 position-relative">
            <input type="number" class="form-control fuel-input" id="${inputId}" 
                   data-category="${category}" data-carbon-id="${fuel.id}" 
                   data-fuel-name="${fuel.name}" min="0" step="0.01">
            <span class="unit-label">${fuel.unit || '公升/年'}</span>
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
    return html;
  }

  // 動態生成燃料燃燒分頁的HTML
  function generateFuelBurningContent(fuels) {
    return generateFuelContent(fuels, 'fuel-burning', '燃料燃燒');
  }

  // 動態生成製程分頁的HTML
  function generateProcessContent(fuels) {
    return generateFuelContent(fuels, 'process', '製程');
  }

  // 動態生成逸散分頁的HTML
  function generateEmissionContent(fuels) {
    return generateFuelContent(fuels, 'emission', '逸散');
  }

  // 動態生成移動分頁的HTML
  function generateMobileContent(fuels) {
    return generateFuelContent(fuels, 'mobile', '移動');
  }

  // 動態生成電力使用分頁的HTML
  function generateElectricityContent(fuels) {
    return generateFuelContent(fuels, 'electricity', '電力使用');
  }

  function getRecords() {
    return demoRecords;
  }

  function saveRecord(record) {
    const idx = demoRecords.findIndex(r => r.date === record.date);
    if (idx !== -1) {
      demoRecords[idx] = record;
    } else {
      demoRecords.push(record);
    }
    submittedFlags[record.date] = true;
  }

  function collectDetailedFuelInputs() {
    const categories = { 
      solid: {}, 
      liquid: {}, 
      gas: {}, 
      mobile: {}, 
      'fuel-burning': {},
      'process': {},
      'emission': {},
      'electricity': {}
    };
    if (typeof $ === 'undefined') return categories;
    $('.fuel-input').each(function () {
      const category = $(this).data('category');
      let val = parseFloat($(this).val());
      if (isNaN(val) || val < 0) val = 0;
      if (categories[category] !== undefined) {
        categories[category][this.id] = val;
      }
    });
    return categories;
  }

  function computeCarbonFromDetailed(detailedFuel) {
    const result = { 
      solid: 0, 
      liquid: 0, 
      gas: 0, 
      mobile: 0, 
      'fuel-burning': 0,
      'process': 0,
      'emission': 0,
      'electricity': 0
    };
    if (!detailedFuel) return result;
    Object.entries(detailedFuel).forEach(([category, obj]) => {
      Object.entries(obj || {}).forEach(([id, amount]) => {
        const amt = parseFloat(amount) || 0;
        let factor = 0;
        
        // 如果是動態載入的燃料類別，需要從對應的燃料陣列取得排放係數
        if (['fuel-burning', 'process', 'emission', 'mobile', 'electricity'].includes(category)) {
          const carbonId = String($(`#${id}`).data('carbon-id')); // 確保 carbonId 是字串
          let fuel = null;
          
          // 根據類別找到對應的燃料陣列
          switch(category) {
            case 'fuel-burning':
              fuel = class1Fuels.find(f => f.id === carbonId);
              break;
            case 'process':
              fuel = class2Fuels.find(f => f.id === carbonId);
              break;
            case 'emission':
              fuel = class3Fuels.find(f => f.id === carbonId);
              break;
            case 'mobile':
              fuel = class4Fuels.find(f => f.id === carbonId);
              break;
            case 'electricity':
              fuel = class5Fuels.find(f => f.id === carbonId);
              break;
          }
          
          if (fuel) {
            // 這裡需要從後端取得實際的排放係數，暫時使用預設值
            factor = 2.5; // 預設排放係數，實際應該從carbon表取得
          }
        } else {
          factor = DETAILED_EMISSION_FACTORS[id] || 0;
        }
        
        result[category] += amt * factor;
      });
    });
    return result;
  }

  function computeCarbonFromRecord(r) {
    const electricityCarbon = (parseFloat(r.electricity) || 0) * EMISSION_FACTORS.electricity;
    const detailed = computeCarbonFromDetailed(r.detailedFuel);
    return {
      electricity: electricityCarbon,
      solid: detailed.solid,
      liquid: detailed.liquid,
      gas: detailed.gas,
      mobile: detailed.mobile,
      'fuel-burning': detailed['fuel-burning'],
      'process': detailed['process'],
      'emission': detailed['emission']
    };
  }

  // 從後端 API 取得按類別分組的碳排放資料
  async function fetchCarbonEmissionsByClass(range = 'week') {
    try {
      console.log(`🔍 正在取得按類別分組的碳排放資料 (range: ${range})...`);
      
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const apiUrl = `${API_BASE}/carbon/my-calculations?groupByClass=true&range=${range}`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 Response data:', result);
      
      if (result.success) {
        console.log(`✅ 成功取得按類別分組的碳排放資料`);
        return result.data;
      } else {
        console.error(`❌ 取得按類別分組資料失敗:`, result.message);
        return null;
      }
    } catch (error) {
      console.error(`❌ 取得按類別分組資料時發生錯誤:`, error);
      console.error('❌ 錯誤詳情:', error.message);
      return null;
    }
  }

  function fetchCarbonEmissionHistory(range = 'week') {
    const now = new Date();
    const base = {};

    if (range === 'month') {
      // 取得本月的第一天與最後一天
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // 建立一個暫存區，每週一組
      let weekIndex = 1;
      let currentWeek = [];
      let weeklyBase = [];

      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const iso = getLocalISODate(d);
        const label = `第${weekIndex}週`;

        currentWeek.push({
          iso,
          label,
          carbon: {
            electricity: 0,
            solid: 0,
            liquid: 0,
            gas: 0,
            mobile: 0,
            'fuel-burning': 0,
            'process': 0,
            'emission': 0
          }
        });

        // 每滿 7 天或到月底就收一週
        if (currentWeek.length === 7 || d.getDate() === lastDay.getDate()) {
          weeklyBase.push({
            weekLabel: label,
            weekStart: currentWeek[0].iso,
            weekEnd: currentWeek[currentWeek.length - 1].iso,
            carbon: {
              electricity: 0,
              solid: 0,
              liquid: 0,
              gas: 0,
              mobile: 0,
              'fuel-burning': 0,
              'process': 0,
              'emission': 0
            }
          });
          currentWeek = [];
          weekIndex++;
        }
      }

      // 匯總資料
      const records = getRecords();
      records.forEach(r => {
        const week = weeklyBase.find(w => r.date >= w.weekStart && r.date <= w.weekEnd);
        if (!week) return;
        const carb = computeCarbonFromRecord(r);
        week.carbon.electricity += carb.electricity;
        week.carbon.solid += carb.solid;
        week.carbon.liquid += carb.liquid;
        week.carbon.gas += carb.gas;
        week.carbon.mobile += carb.mobile;
        week.carbon['fuel-burning'] += carb['fuel-burning'];
        week.carbon['process'] += carb['process'];
        week.carbon['emission'] += carb['emission'];
      });

      return weeklyBase.map(w => ({
        dateLabel: w.weekLabel,
        dateStr: `${w.weekStart}~${w.weekEnd}`,
        carbon: w.carbon
      }));

    } else {
      // 原本的「本週」邏輯（保留）
      const days = 7;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const iso = getLocalISODate(d);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        base[iso] = {
          dateLabel: label,
          dateStr: iso,
          carbon: {
            electricity: 0,
            solid: 0,
            liquid: 0,
            gas: 0,
            mobile: 0,
            'fuel-burning': 0,
            'process': 0,
            'emission': 0
          }
        };
      }

      const records = getRecords();
      records.forEach(r => {
        const iso = r.date;
        if (!base[iso]) return;
        const carb = computeCarbonFromRecord(r);
        base[iso].carbon.electricity += carb.electricity;
        base[iso].carbon.solid += carb.solid;
        base[iso].carbon.liquid += carb.liquid;
        base[iso].carbon.gas += carb.gas;
        base[iso].carbon.mobile += carb.mobile;
        base[iso].carbon['fuel-burning'] += carb['fuel-burning'];
        base[iso].carbon['process'] += carb['process'];
        base[iso].carbon['emission'] += carb['emission'];
      });

      return Object.values(base);
    }
  }


  // --------- render ---------
  function ensureTrendSummaryContainer() {
    const $wrapper = $('#trend-summary-wrapper');
    if ($wrapper.find('#trend-summary-table').length === 0) {
      $wrapper.html(`
        <h6>碳排放摘要（總量 / 日均）</h6>
        <table class="table table-sm" id="trend-summary-table">
          <thead>
            <tr>
              <th>能源類型</th><th>總碳排 (kgCO₂e)</th><th>日均</th><th>單位</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="small text-muted">※ 所有數值已用換算係數轉成碳排放量。</div>
      `);
    }
    return $('#trend-summary-table');
  }

  // 新的按類別分組摘要渲染函數
  function renderCarbonSummaryByClass(summary, days, highlightClass = null) {
    const $table = ensureTrendSummaryContainer();
    const $tbody = $table.find('tbody').empty();

    function row(name, total, avg, isHighlighted = false) {
      const highlightStyle = isHighlighted ? 'style="background-color: #fff3e0; font-weight: bold; color: #ff6b35;"' : '';
      return `
        <tr ${highlightStyle}>
          <td>${name}</td>
          <td>${total.toFixed(2)}</td>
          <td>${avg.toFixed(2)}</td>
          <td>kg CO₂e</td>
        </tr>`;
    }

    // 顯示 5 個類別（對應 class 1-5），按照指定順序
    $tbody.append(row('燃料燃燒', summary.class1.total, summary.class1.avg, highlightClass === '1'));
    $tbody.append(row('製程', summary.class2.total, summary.class2.avg, highlightClass === '2'));
    $tbody.append(row('逸散', summary.class3.total, summary.class3.avg, highlightClass === '3'));
    $tbody.append(row('移動', summary.class4.total, summary.class4.avg, highlightClass === '4'));
    $tbody.append(row('電力使用', summary.class5.total, summary.class5.avg, highlightClass === '5'));
  }

  // ====================================================
  // 將每日資料彙總為每週
  // ====================================================
  function aggregateMonthToWeeks(dailyData) {
    if (!Array.isArray(dailyData) || dailyData.length === 0) return dailyData;

    // 取得本月起訖（依使用者當下月份）
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 工具：把各種欄位還原成 ISO yyyy-mm-dd
    const toISO = (d) => {
      const iso = d.date || d.dateStr || d.iso;
      if (iso) return iso; // 已有 ISO 就用
      // 從 dateLabel（例如 "10/1" 或 "10/01"）推回當年 ISO
      if (d.dateLabel && /^\d{1,2}\/\d{1,2}$/.test(d.dateLabel)) {
        const [m, day] = d.dateLabel.split('/').map(x => parseInt(x, 10));
        const yyyy = now.getFullYear();
        const mm = String(m).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    };

    // 1) 轉成含 iso 的清單並排序
    const withIso = dailyData
      .map(d => ({ ...d, _iso: toISO(d) }))
      .filter(d => !!d._iso)
      .sort((a, b) => a._iso.localeCompare(b._iso));

    // 2) 過濾出本月範圍（不含前一個月、不含下一個月）
    const monthStartISO = `${firstDay.getFullYear()}-${String(firstDay.getMonth()+1).padStart(2,'0')}-${String(firstDay.getDate()).padStart(2,'0')}`;
    const monthEndISO   = `${lastDay.getFullYear()}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const onlyThisMonth = withIso.filter(d => d._iso >= monthStartISO && d._iso <= monthEndISO);

    // 3) 從「每月 1 號」開始，每 7 天做一組
    const weeks = [];
    let weekIdx = 1;
    for (let i = 0; i < onlyThisMonth.length; i += 7) {
      const chunk = onlyThisMonth.slice(i, i + 7);
      const w = {
        label: `第${weekIdx}週`,
        class1: 0, class2: 0, class3: 0, class4: 0, class5: 0,
        weekStart: chunk[0]._iso,
        weekEnd:   chunk[chunk.length - 1]._iso
      };
      for (const d of chunk) {
        w.class1 += d.class1 || 0;
        w.class2 += d.class2 || 0;
        w.class3 += d.class3 || 0;
        w.class4 += d.class4 || 0;
        w.class5 += d.class5 || 0;
      }
      weeks.push({
        dateLabel: w.label,
        class1: +w.class1.toFixed(2),
        class2: +w.class2.toFixed(2),
        class3: +w.class3.toFixed(2),
        class4: +w.class4.toFixed(2),
        class5: +w.class5.toFixed(2),
        weekStart: w.weekStart,
        weekEnd: w.weekEnd
      });
      weekIdx++;
    }

    return weeks;
  }

  // 保留原有的摘要渲染函數作為備用
  function renderCarbonSummary(data) {
    const days = data.length;
    const sum = {
      electricity: 0,
      solid: 0,
      liquid: 0,
      gas: 0,
      mobile: 0,
      'fuel-burning': 0,
      'process': 0,
      'emission': 0
    };
    data.forEach(d => {
      sum.electricity += d.carbon.electricity;
      sum.solid += d.carbon.solid;
      sum.liquid += d.carbon.liquid;
      sum.gas += d.carbon.gas;
      sum.mobile += d.carbon.mobile;
      sum['fuel-burning'] += d.carbon['fuel-burning'];
      sum['process'] += d.carbon['process'];
      sum['emission'] += d.carbon['emission'];
    });

    const $table = ensureTrendSummaryContainer();
    const $tbody = $table.find('tbody').empty();

    function row(name, total) {
      const avg = days > 0 ? total / days : 0;
      return `
        <tr>
          <td>${name}</td>
          <td>${total.toFixed(2)}</td>
          <td>${avg.toFixed(2)}</td>
          <td>kg CO₂e</td>
        </tr>`;
    }

    // 只顯示五個類別，按照指定順序
    $tbody.append(row('燃料燃燒', sum['fuel-burning']));
    $tbody.append(row('製程', sum['process']));
    $tbody.append(row('逸散', sum['emission']));
    $tbody.append(row('移動', sum.mobile));
    $tbody.append(row('電力使用', sum.electricity));
  }

  // 全域變數儲存當前圖表狀態
  let currentChartRange = 'week';
  let currentChartData = null;

  // 根據類別名稱取得對應的 class 編號
  function getClassNumberByCategoryName(categoryName) {
    const classMapping = {
      '燃料燃燒': '1',
      '製程': '2', 
      '逸散': '3',
      '移動': '4',
      '電力使用': '5'
    };
    return classMapping[categoryName] || null;
  }

  // 根據單一類別重新查詢並渲染圖表（保留所有資料，只改變顏色）
  async function renderChartBySingleClass(range, className, categoryName) {
    try {
      console.log(`📊 開始渲染單一類別圖表: ${categoryName} (class: ${className}, range: ${range})...`);
      
      // 呼叫 API 取得特定類別的資料
      const apiData = await fetchCarbonEmissionsByClass(range);
      
      if (!apiData || !apiData.dailyEmissionsByClass) {
        console.warn('⚠️ 無法取得 API 資料，使用預設資料');
        return;
      }

      let dailyData = apiData.dailyEmissionsByClass;

      let weekRanges = null;
      if (range === 'month') {
        dailyData = aggregateMonthToWeeks(dailyData);
        const toShort = s => {
          if (!s) return s;
          const [y,m,d] = s.split('-');
          return `${+m}/${+d}`;
        };
        weekRanges = dailyData.map(d => `${toShort(d.weekStart)}~${toShort(d.weekEnd)}`);
      }

      const categories = dailyData.map(d => d.dateLabel);
      
      // 計算累積值函數
      const calculateCumulative = (values) => {
        let cumulative = 0;
        return values.map(value => {
          cumulative += value;
          return parseFloat(cumulative.toFixed(2));
        });
      };
      
      // 保留所有五個系列，但突出顯示選定的類別，並計算累積值
      const actualSeries = [
        { name: '燃料燃燒', data: calculateCumulative(dailyData.map(d => d.class1)) },
        { name: '製程',     data: calculateCumulative(dailyData.map(d => d.class2)) },
        { name: '逸散',     data: calculateCumulative(dailyData.map(d => d.class3)) },
        { name: '移動',     data: calculateCumulative(dailyData.map(d => d.class4)) },
        { name: '電力使用', data: calculateCumulative(dailyData.map(d => d.class5)) }
      ];
      const allNames = actualSeries.map(s => s.name);

      // 加上一個「全部」的 dummy series
      const series = [
        ...actualSeries,
        { 
          name: '全部', 
          data: Array(categories.length).fill(null)
        }
      ];

      // 定義顏色：使用亮暗效果，不使用橘色
      const normalColors = ['#2dd9c5','#ff5fa2','#3d7eff','#f2c94c','#6f42c1']; // 原來的顏色
      const mutedColors = ['#b8e6e0','#ffb8d9','#9db8ff','#f9e699','#b899e6']; // 較淡的顏色
      
      // 根據選定的類別調整顏色（亮暗效果）
      const colors = [];
      for (let i = 0; i < 5; i++) {
        if (i === (parseInt(className) - 1)) {
          colors.push(normalColors[i]); // 選定的類別使用正常顏色（亮）
        } else {
          colors.push(mutedColors[i]); // 其他類別使用較淡的顏色（暗）
        }
      }
      colors.push('#888888'); // 全部按鈕使用灰色

      const options = {
        chart: {
          id: 'carbonChart',
          type: 'line',
          stacked: false,
          toolbar: { show: false },
          events: {
            legendClick: function(chartCtx, seriesIndex) {
              const clickedName = series[seriesIndex].name;
              if (clickedName === '全部') {
                // 全部顯示 - 重新渲染完整圖表
                renderCarbonEmissionChart(range);
              } else {
                // 單選切換：顯示單一類別
                const className = getClassNumberByCategoryName(clickedName);
                if (className) {
                  renderChartBySingleClass(range, className, clickedName);
                }
              }
            }
          }
        },
        series: series,
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { 
          categories, 
          tickPlacement: 'on',
          labels: {
            rotate: 0,
            trim: false,
            hideOverlappingLabels: false,
            style: {
              fontSize: '11px'
            },
            formatter: function (val, idx) {
              return val;
            }
          },
          axisBorder: {
            show: true
          },
          axisTicks: {
            show: true
          }
        },
        yaxis: { title: { text: '累積碳排放 (kg CO₂e)' }, min: 0 },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          onItemClick: { toggleDataSeries: false }
        },
          tooltip: {
            shared: true,
            intersect: false,
            // ★ x 軸 tooltip 也顯示日期範圍
            x: {
              formatter: function (val, opts) {
                const i = opts && typeof opts.dataPointIndex === 'number' ? opts.dataPointIndex : -1;
                if (range === 'month' && weekRanges && i >= 0) {
                  return `${val}（${weekRanges[i]}）`;
                }
                return val;
              }
            },
            y: { formatter: v => `累積: ${v} kg CO₂e` }
          },
        colors: colors
      };

      if (carbonApexChart) {
          carbonApexChart.updateOptions({
            series,
            colors,
            xaxis: {
              categories,
              tickPlacement: 'on',
              labels: {
                rotate: 0,
                trim: false,
                hideOverlappingLabels: false,
                style: { fontSize: '11px' },
                formatter: function (val, idx) {
                  return val;
                }
              },
              axisBorder: { show: true },
              axisTicks: { show: true }
            },
            tooltip: {
              shared: true,
              intersect: false,
              x: {
                formatter: function (val, opts) {
                  const i = opts && typeof opts.dataPointIndex === 'number' ? opts.dataPointIndex : -1;
                  if (range === 'month' && weekRanges && i >= 0 && weekRanges[i]) {
                    return `${val}（${weekRanges[i]}）`;
                  }
                  return val;
                }
              },
              y: { formatter: v => `累積: ${v} kg CO₂e` }
            }
          }, false, true);
      } else {
        carbonApexChart = new ApexCharts(
          document.querySelector('#energyTrendChart'),
          options
        );
        carbonApexChart.render();
      }

      // 更新摘要表格顯示所有類別，但突出顯示選定的類別
      renderCarbonSummaryByClass(apiData.summary, dailyData.length, className);

    } catch (error) {
      console.error('❌ 渲染單一類別圖表時發生錯誤:', error);
    }
  }

  async function renderCarbonEmissionChart(range = 'week') {
    try {
      console.log(`📊 開始渲染碳排放趨勢圖表 (range: ${range})...`);
      
      // 儲存當前狀態
      currentChartRange = range;
      
      // 定義正常顏色（點擊「全部」時使用）
      const normalColors = ['#2dd9c5','#ff5fa2','#3d7eff','#f2c94c','#6f42c1']; // 原來的顏色
      
      // 使用新的 API 取得按類別分組的資料
      const apiData = await fetchCarbonEmissionsByClass(range);
      
      if (!apiData || !apiData.dailyEmissionsByClass) {
        console.warn('⚠️ 無法取得 API 資料，使用預設資料');
        // 如果 API 失敗，回退到原有邏輯
        const history = fetchCarbonEmissionHistory(range);
        renderCarbonEmissionChartLegacy(history);
        return;
      }

      // 儲存資料供後續使用
      currentChartData = apiData;

      let dailyData = apiData.dailyEmissionsByClass;

      let weekRanges = null;
      if (range === 'month') {
        dailyData = aggregateMonthToWeeks(dailyData);
        // yyyy-mm-dd ~ yyyy-mm-dd（也可做成 m/d~m/d）
        const toShort = s => {
          if (!s) return s;
          const [y,m,d] = s.split('-');
          return `${+m}/${+d}`;
        };
        weekRanges = dailyData.map(d => (d.weekStart && d.weekEnd)
          ? `${toShort(d.weekStart)}~${toShort(d.weekEnd)}`
          : null);
      }

      const categories = dailyData.map(d => d.dateLabel);
      
      console.log(`📊 前端圖表資料: range=${range}, 日期數量=${dailyData.length}`);
      console.log(`📊 前端日期標籤:`, categories);
      
      // 計算累積值函數
      const calculateCumulative = (values) => {
        let cumulative = 0;
        return values.map(value => {
          cumulative += value;
          return parseFloat(cumulative.toFixed(2));
        });
      };
      
      // 只保留五個系列，按照指定順序，並計算累積值
      const actualSeries = [
        { name: '燃料燃燒', data: calculateCumulative(dailyData.map(d => d.class1)) }, // class 1 - 累積值
        { name: '製程',     data: calculateCumulative(dailyData.map(d => d.class2)) }, // class 2 - 累積值
        { name: '逸散',     data: calculateCumulative(dailyData.map(d => d.class3)) }, // class 3 - 累積值
        { name: '移動',     data: calculateCumulative(dailyData.map(d => d.class4)) }, // class 4 - 累積值
        { name: '電力使用', data: calculateCumulative(dailyData.map(d => d.class5)) }  // class 5 - 累積值
      ];
      const allNames = actualSeries.map(s => s.name);

      // 加上一個「全部」的 dummy series（不畫線，只為了 legend）
      const series = [
        ...actualSeries,
        { 
          name: '全部', 
          data: Array(categories.length).fill(null) // fill null 就不會畫任何點
        }
      ];

      const options = {
        chart: {
          id: 'carbonChart',
          type: 'line',
          stacked: false,
          toolbar: { show: false },
          events: {
            legendClick: function(chartCtx, seriesIndex) {
              const clickedName = series[seriesIndex].name;
              if (clickedName === '全部') {
                // 全部顯示 - 重新渲染完整圖表
                renderCarbonEmissionChart(currentChartRange);
              } else {
                // 單選切換：顯示單一類別
                const className = getClassNumberByCategoryName(clickedName);
                if (className) {
                  renderChartBySingleClass(currentChartRange, className, clickedName);
                }
              }
            }
          }
        },
        series: series,
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { 
          categories, 
          tickPlacement: 'on',
          labels: {
            rotate: 0,
            trim: false,
            hideOverlappingLabels: false,
            style: {
              fontSize: '11px'
            },
            // 本月 => 顯示「第N週（m/d~m/d）」；其它 range 保持原樣
            formatter: function (val) { return val; }
          },
          axisBorder: {
            show: true
          },
          axisTicks: {
            show: true
          }
        },
        yaxis: { title: { text: '累積碳排放 (kg CO₂e)' }, min: 0 },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          // 關閉預設點 legend 就隱藏 series 的行為
          onItemClick: { toggleDataSeries: false }
        },
        tooltip: {
          shared: true,
          intersect: false,
          x: {
            formatter: function (val, opts) {
              const i = (opts && typeof opts.dataPointIndex === 'number') ? opts.dataPointIndex : -1;
              if (range === 'month' && weekRanges && i >= 0 && weekRanges[i]) {
                return `${val}（${weekRanges[i]}）`;
              }
              return val;
            }
          },
          y: { formatter: v => `累積: ${v} kg CO₂e` }
        },
        colors: [...normalColors, '#888888'] // 使用 normalColors + 全部按鈕灰色
      };

      if (carbonApexChart) {
          carbonApexChart.updateOptions({
            series,
            colors: [...normalColors, '#888888'],
            xaxis: {
              categories,
              tickPlacement: 'on',
              labels: {
                rotate: 0,
                trim: false,
                hideOverlappingLabels: false,
                style: { fontSize: '11px' },
                formatter: function (val) { return val; }
              },
              axisBorder: { show: true },
              axisTicks: { show: true }
            },
            tooltip: {
              shared: true,
              intersect: false,
              x: {
                formatter: function (val, opts) {
                  const i = opts && typeof opts.dataPointIndex === 'number' ? opts.dataPointIndex : -1;
                  if (range === 'month' && weekRanges && i >= 0 && weekRanges[i]) {
                    return `${val}（${weekRanges[i]}）`;
                  }
                  return val;
                }
              },
              y: { formatter: v => `累積: ${v} kg CO₂e` }
            }
          }, false, true);
      } else {
        carbonApexChart = new ApexCharts(
          document.querySelector('#energyTrendChart'),
          options
        );
        carbonApexChart.render();
      }

      // 使用新的摘要資料渲染摘要表格（不突出顯示任何類別）
      renderCarbonSummaryByClass(apiData.summary, dailyData.length, null);

    } catch (error) {
      console.error('❌ 渲染碳排放趨勢圖表時發生錯誤:', error);
      // 如果發生錯誤，回退到原有邏輯
      const history = fetchCarbonEmissionHistory(range);
      renderCarbonEmissionChartLegacy(history);
    }
  }

  // 保留原有的圖表渲染函數作為備用
  function renderCarbonEmissionChartLegacy(history) {
    const categories = history.map(d => d.dateLabel);
    // 只保留五個系列，按照指定順序
    const actualSeries = [
      { name: '燃料燃燒', data: history.map(d => +d.carbon['fuel-burning'].toFixed(2)) },
      { name: '製程',     data: history.map(d => +d.carbon['process'].toFixed(2)) },
      { name: '逸散',     data: history.map(d => +d.carbon['emission'].toFixed(2)) },
      { name: '移動',     data: history.map(d => +d.carbon.mobile.toFixed(2)) },
      { name: '電力使用', data: history.map(d => +d.carbon.electricity.toFixed(2)) }
    ];
    const allNames = actualSeries.map(s => s.name);

    // 加上一個「全部」的 dummy series（不畫線，只為了 legend）
    const series = [
      ...actualSeries,
      { 
        name: '全部', 
        data: Array(categories.length).fill(null) // fill null 就不會畫任何點
      }
    ];

    const options = {
      chart: {
        id: 'carbonChart',
        type: 'line',
        stacked: false,
        toolbar: { show: false },
        events: {
          legendClick: function(chartCtx, seriesIndex) {
            const clickedName = series[seriesIndex].name;
            if (clickedName === '全部') {
              // 全部顯示
              actualSeries.forEach(s => chartCtx.showSeries(s.name));
            } else {
              // 單選切換：如果不是「全部」，就只顯示該條線
              allNames.forEach(name => {
                if (name === clickedName) chartCtx.showSeries(name);
                else                       chartCtx.hideSeries(name);
              });
            }
          }
        }
      },
      series: series,
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories, tickPlacement: 'on' },
      yaxis: { title: { text: '碳排放 (kg CO₂e)' }, min: 0 },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        // 關閉預設點 legend 就隱藏 series 的行為
        onItemClick: { toggleDataSeries: false }
      },
      tooltip: { shared: true, intersect: false, y: { formatter: v => `${v} kg CO₂e` } },
      colors: ['#2dd9c5','#ff5fa2','#3d7eff','#f2c94c','#6f42c1','#888888'] // 5個顏色 + 全部
    };

    if (carbonApexChart) {
      carbonApexChart.updateOptions({ series, xaxis: { categories } }, false, true);
    } else {
      carbonApexChart = new ApexCharts(
        document.querySelector('#energyTrendChart'),
        options
      );
      carbonApexChart.render();
    }

    renderCarbonSummary(history);
  }

  // --------- reminder (in-memory only) ---------
  function remindIfNotSubmitted() {
    const now = new Date();
    const hour = now.getHours();
    const today = getLocalISODate();
    const hasSubmitted = !!submittedFlags[today];
    if (hour >= 9 && hour < 11 && !hasSubmitted && !remindedFlags[today]) {
      Swal.fire({
        icon: 'info',
        title: '提醒',
        text: '請填寫今日能源消耗資料以更新碳排放趨勢'
      });
      remindedFlags[today] = true;
    }
  }

  // 載入所有分頁的燃料資料
  async function loadAllFuelTabs() {
    console.log('🚀 開始載入所有分頁的燃料資料...');
    
    // 並行載入所有燃料資料
    const [
      class1Fuels,
      class2Fuels, 
      class3Fuels,
      class4Fuels,
      class5Fuels
    ] = await Promise.all([
      fetchClass1Fuels(),
      fetchClass2Fuels(),
      fetchClass3Fuels(),
      fetchClass4Fuels(),
      fetchClass5Fuels()
    ]);
    
    // 生成各分頁內容
    const fuelBurningContent = generateFuelBurningContent(class1Fuels);
    const processContent = generateProcessContent(class2Fuels);
    const emissionContent = generateEmissionContent(class3Fuels);
    const mobileContent = generateMobileContent(class4Fuels);
    const electricityContent = generateElectricityContent(class5Fuels);
    
    // 更新各分頁
    $('#tab-solid').html(fuelBurningContent);
    $('#tab-liquid').html(processContent);
    $('#tab-gas').html(emissionContent);
    $('#tab-mobile').html(mobileContent);
    $('#tab-electricity').html(electricityContent);
    
    console.log('✅ 所有分頁內容已動態生成');
  }

  // 收集所有燃料輸入並提交到後端API
  async function submitEnergyConsumption() {
    try {
      console.log('🚀 開始提交能源消耗資料...');
      
      // 檢查認證狀態
      const token = getToken();
      console.log('🔑 Token:', token ? '存在' : '不存在');
      
      if (!token) {
        Swal.fire({
          icon: 'error',
          title: '認證失敗',
          text: '請先登入系統'
        });
        return;
      }
      
      // 收集所有燃料輸入
      const fuelInputs = [];
      $('.fuel-input').each(function() {
        const value = parseFloat($(this).val());
        if (!isNaN(value) && value > 0) {
          const carbonId = $(this).data('carbon-id');
          const fuelName = $(this).data('fuel-name');
          const category = $(this).data('category');
          
          if (carbonId) {
            fuelInputs.push({
              carbonId: String(carbonId), // 確保 carbonId 是字串
              consumption: value,
              fuelName: fuelName,
              category: category
            });
          }
        }
      });

      if (fuelInputs.length === 0) {
        Swal.fire('警告', '請至少輸入一種燃料的消耗量', 'warning');
        return;
      }

      console.log('📊 收集到的燃料輸入:', fuelInputs);

      // 提交每個燃料消耗記錄
      const submitPromises = fuelInputs.map(async (input) => {
        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        try {
          const payload = { carbonId: input.carbonId, consumption: input.consumption };
          const response = await fetch(`${API_BASE}/carbon/recordEnergyConsume`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            console.warn('提交失敗，狀態碼:', response.status);
          }
        } catch (e) {
          console.warn('提交發生錯誤:', e);
        }
      });

      await Promise.all(submitPromises);
      console.log('✅ 提交完成');

      // 重新載入圖表
      await renderCarbonEmissionChart(currentChartRange || 'week');

      // 提交成功後：將剛輸入的數字全部歸 0，並顯示成功提示
      $('.fuel-input').val('');
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: '提交成功',
          timer: 1500,
          showConfirmButton: false
        });
      }

    } catch (error) {
      console.error('❌ 提交能源消耗資料失敗:', error);
    }
  }

  // 載入頁面時執行
  $(document).ready(function() {
    // 載入所有分頁的燃料資料
    loadAllFuelTabs();

    // 設定提醒時間
    remindIfNotSubmitted();

    // 初始化圖表，預設週
    renderCarbonEmissionChart('week');

    // 綁定提交：攔截表單提交
    $('#energy-form').on('submit', function(e) {
      e.preventDefault();
      submitEnergyConsumption();
    });

    // 綁定範圍切換（本週 / 本月）
    $('.btn-range-toggle [data-range]').on('click', function(e) {
      e.preventDefault();
      const range = $(this).data('range');
      $('.btn-range-toggle .btn').removeClass('active');
      $(this).addClass('active');
      currentChartRange = range;
      renderCarbonEmissionChart(range);
    });

    // 綁定切換分頁事件
    $('#energyTabs a').on('shown.bs.tab', function (e) {
      const target = $(e.target).attr('href');
      if (target === '#tab-solid') {
        loadAllFuelTabs();
      }
    });

    // 禁用在數字欄位上用滑鼠滾輪調整數值
    const disableWheelOnNumber = function(e) {
      e.preventDefault();
      this.blur();
    };
    $(document).on('wheel', '.fuel-input', disableWheelOnNumber);
    $(document).on('mousewheel', '.fuel-input', disableWheelOnNumber);
    $(document).on('DOMMouseScroll', '.fuel-input', disableWheelOnNumber);
  });
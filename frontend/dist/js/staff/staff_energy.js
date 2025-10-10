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
    const days = range === 'month' ? 30 : 7;
    const base = {};

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

      const dailyData = apiData.dailyEmissionsByClass;
      const categories = dailyData.map(d => d.dateLabel);
      
      // 保留所有五個系列，但突出顯示選定的類別
      const actualSeries = [
        { name: '燃料燃燒', data: dailyData.map(d => d.class1) },
        { name: '製程',     data: dailyData.map(d => d.class2) },
        { name: '逸散',     data: dailyData.map(d => d.class3) },
        { name: '移動',     data: dailyData.map(d => d.class4) },
        { name: '電力使用', data: dailyData.map(d => d.class5) }
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
        xaxis: { categories, tickPlacement: 'on' },
        yaxis: { title: { text: '碳排放 (kg CO₂e)' }, min: 0 },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          onItemClick: { toggleDataSeries: false }
        },
        tooltip: { shared: true, intersect: false, y: { formatter: v => `${v} kg CO₂e` } },
        colors: colors
      };

      if (carbonApexChart) {
        carbonApexChart.updateOptions({ series, colors }, false, true);
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

      const dailyData = apiData.dailyEmissionsByClass;
      const categories = dailyData.map(d => d.dateLabel);
      
      // 只保留五個系列，按照指定順序
      const actualSeries = [
        { name: '燃料燃燒', data: dailyData.map(d => d.class1) }, // class 1 - 從 API 取得
        { name: '製程',     data: dailyData.map(d => d.class2) }, // class 2 - 從 API 取得
        { name: '逸散',     data: dailyData.map(d => d.class3) }, // class 3 - 從 API 取得
        { name: '移動',     data: dailyData.map(d => d.class4) }, // class 4 - 從 API 取得
        { name: '電力使用', data: dailyData.map(d => d.class5) }  // class 5 - 從 API 取得
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
        xaxis: { categories, tickPlacement: 'on' },
        yaxis: { title: { text: '碳排放 (kg CO₂e)' }, min: 0 },
        legend: {
          position: 'bottom',
          horizontalAlign: 'center',
          // 關閉預設點 legend 就隱藏 series 的行為
          onItemClick: { toggleDataSeries: false }
        },
        tooltip: { shared: true, intersect: false, y: { formatter: v => `${v} kg CO₂e` } },
        colors: [...normalColors, '#888888'] // 使用 normalColors + 全部按鈕灰色
      };

      if (carbonApexChart) {
        carbonApexChart.updateOptions({ series, colors: [...normalColors, '#888888'] }, false, true);
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
      carbonApexChart.updateOptions({ series }, false, true);
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        const requestData = {
          carbonId: input.carbonId,
          consumption: input.consumption,
          calculationDate: getLocalISODate()
        };

        console.log(`📤 提交燃料: ${input.fuelName}, 消耗量: ${input.consumption}`);
        console.log('📤 請求資料:', requestData);
        console.log('📤 請求標頭:', headers);

        const response = await fetch(`${API_BASE}/carbon/recordEnergyConsume`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestData)
        });

        console.log(`📡 回應狀態: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API 錯誤回應:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ ${input.fuelName} 提交成功:`, result);
        
        return result;
      });

      // 等待所有提交完成
      const results = await Promise.all(submitPromises);
      
      console.log('🎉 所有燃料消耗記錄提交完成:', results);
      
      // 顯示成功訊息
      const totalRecords = results.length;
      Swal.fire({
        icon: 'success',
        title: '提交成功',
        text: `已成功記錄 ${totalRecords} 種燃料的消耗資料`,
        timer: 3000
      });

      // 更新圖表
      const activeRange = $('.btn-range-toggle .btn.active').data('range') || 'week';
      renderCarbonEmissionChart(activeRange);

      // 清空表單
      $('.fuel-input').val('');

    } catch (error) {
      console.error('❌ 提交能源消耗資料時發生錯誤:', error);
      console.error('❌ 錯誤詳情:', error.stack);
      Swal.fire({
        icon: 'error',
        title: '提交失敗',
        text: '提交能源消耗資料時發生錯誤: ' + error.message
      });
    }
  }

  // --------- init & bindings ---------
  $(document).ready(async function () {
    console.log('🚀 頁面初始化開始...');
    
    // 載入所有分頁的燃料資料
    try {
      await loadAllFuelTabs();
    } catch (error) {
      console.error('❌ 載入燃料資料時發生錯誤:', error);
      console.error('❌ 錯誤堆疊:', error.stack);
      
      // 顯示錯誤訊息
      const errorHtml = '<div class="alert alert-danger">載入燃料資料失敗: ' + error.message + '</div>';
      $('#tab-solid, #tab-liquid, #tab-gas, #tab-mobile, #tab-electricity').html(errorHtml);
    }

    // 初始畫本週
    renderCarbonEmissionChart('week');

    // range 切換
    $('.btn-range-toggle .btn').on('click', function () {
      $('.btn-range-toggle .btn').removeClass('active');
      $(this).addClass('active');
      const range = $(this).data('range');
      renderCarbonEmissionChart(range);
    });

    // 提交表單 - 修改為調用新的API
    $('#energy-form').on('submit', function (e) {
      e.preventDefault();
      submitEnergyConsumption();
    });

    // reminder 每分鐘檢查
    setInterval(remindIfNotSubmitted, 60 * 1000);
    remindIfNotSubmitted();
  });
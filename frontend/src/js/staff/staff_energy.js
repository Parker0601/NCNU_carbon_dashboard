  // --------- in-memory state（不 persist） ---------
  let demoRecords = [];
  const submittedFlags = {};
  const remindedFlags = {};
  let carbonApexChart = null;

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
    const categories = { solid: {}, liquid: {}, gas: {}, mobile: {} };
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
    const result = { solid: 0, liquid: 0, gas: 0, mobile: 0 };
    if (!detailedFuel) return result;
    Object.entries(detailedFuel).forEach(([category, obj]) => {
      Object.entries(obj || {}).forEach(([id, amount]) => {
        const amt = parseFloat(amount) || 0;
        const factor = DETAILED_EMISSION_FACTORS[id] || 0;
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
      mobile: detailed.mobile
    };
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
          mobile: 0
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

  function renderCarbonSummary(data) {
    const days = data.length;
    const sum = {
      electricity: 0,
      solid: 0,
      liquid: 0,
      gas: 0,
      mobile: 0
    };
    data.forEach(d => {
      sum.electricity += d.carbon.electricity;
      sum.solid += d.carbon.solid;
      sum.liquid += d.carbon.liquid;
      sum.gas += d.carbon.gas;
      sum.mobile += d.carbon.mobile;
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

    $tbody.append(row('電力', sum.electricity));
    $tbody.append(row('固態燃料', sum.solid));
    $tbody.append(row('液態燃料', sum.liquid));
    $tbody.append(row('氣態燃料', sum.gas));
    $tbody.append(row('移動源', sum.mobile));
  }

  function renderCarbonEmissionChart(range = 'week') {
    const history    = fetchCarbonEmissionHistory(range);
    const categories = history.map(d => d.dateLabel);
    // 真正要畫的五個系列
    const actualSeries = [
      { name: '電力',     data: history.map(d => +d.carbon.electricity.toFixed(2)) },
      { name: '固態燃料', data: history.map(d => +d.carbon.solid.toFixed(2)) },
      { name: '液態燃料', data: history.map(d => +d.carbon.liquid.toFixed(2)) },
      { name: '氣態燃料', data: history.map(d => +d.carbon.gas.toFixed(2)) },
      { name: '移動源',   data: history.map(d => +d.carbon.mobile.toFixed(2)) }
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
      colors: ['#2dd9c5','#ff5fa2','#3d7eff','#f2c94c','#6f42c1','#888888'] // 最後一個顏色給「全部」
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

  // --------- init & bindings ---------
  $(document).ready(function () {
    // 初始畫本週
    renderCarbonEmissionChart('week');

    // range 切換
    $('.btn-range-toggle .btn').on('click', function () {
      $('.btn-range-toggle .btn').removeClass('active');
      $(this).addClass('active');
      const range = $(this).data('range');
      renderCarbonEmissionChart(range);
    });

    // 提交
    $('#energy-form').on('submit', function (e) {
      e.preventDefault();
      const electricity = parseFloat($('#electricity_calculation').val()) || 0;
      if (isNaN(electricity)) {
        Swal.fire('錯誤', '請正確輸入電力與交通燃料數值', 'error');
        return;
      }
      const detailedFuel = collectDetailedFuelInputs();
      const today = getLocalISODate();
      const record = {
        date: today,
        electricity,
        detailedFuel
      };
      saveRecord(record);
      Swal.fire('已提交', '能源消耗資料已儲存並更新碳排放圖表', 'success');
      const activeRange = $('.btn-range-toggle .btn.active').data('range') || 'week';
      renderCarbonEmissionChart(activeRange);
    });

    // reminder 每分鐘檢查
    setInterval(remindIfNotSubmitted, 60 * 1000);
    remindIfNotSubmitted();
  });
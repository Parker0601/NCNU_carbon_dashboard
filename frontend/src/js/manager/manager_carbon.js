$(document).ready(function() {
    const API_BASE = 'http://localhost:3000/api';
    const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
    
    // 分頁狀態 - 移到最前面避免初始化順序問題
    let fuelTrendAllItems = [];
    let fuelTrendRendered = 0;
    const PAGE_SIZE = 6;
    
    function getToken() {
        try {
            for (const k of TOKEN_KEYS) {
                const v = localStorage.getItem(k);
                if (v) return v;
            }
        } catch (e) {}
        return null;
    }

    // 初始化 Chart.js 圖表（空資料）
    var trendCtx = document.getElementById('carbonTrendChart').getContext('2d');
    var trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '每日排放量 (kg CO₂e)',
                type: 'bar',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                yAxisID: 'y-axis-1'
            }, {
                label: '累積排放量 (kg CO₂e)',
                type: 'line',
                data: [],
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
                yAxisID: 'y-axis-1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    id: 'y-axis-1',
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        beginAtZero: true
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'kg CO₂e'
                    }
                }]
            },
            tooltips: {
                mode: 'index',
                intersect: false
            },
            hover: {
                mode: 'index',
                intersect: false
            }
        }
    });

    // 熱點分析圓餅圖（依燃料來源占比）
    var hotspotCtx = document.getElementById('carbonHotspotChart').getContext('2d');
    
    // 計算總和的輔助函數
    function calculateTotal(dataArray) {
        return dataArray.reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    }
    
    // 計算百分比的輔助函數
    function calculatePercentage(value, total) {
        if (!total || total === 0) return 0;
        return ((value / total) * 100).toFixed(1);
    }
    
    // 響應式高度：依容器寬度調整圖表包裹層高度，避免固定 px 造成縮放比例不對
    function setupResponsiveChartContainer(selector, options) {
        var $wrap = $(selector);
        if (!$wrap.length) return;
        var opts = options || {};
        var ratio = typeof opts.ratio === 'number' ? opts.ratio : 0.4; // 高度/寬度比
        var minH = typeof opts.min === 'number' ? opts.min : 220;
        var maxH = typeof opts.max === 'number' ? opts.max : 420;
        var ns = 'resize.' + ($wrap.attr('id') || Math.random().toString(36).slice(2));
        function applySize() {
            var w = $wrap.width();
            if (!w || isNaN(w)) return;
            var h = Math.round(Math.max(minH, Math.min(maxH, w * ratio)));
            $wrap.css('height', h + 'px');
        }
        applySize();
        $(window).off(ns).on('resize', applySize);
        // 初次套用後微觸發一次，讓 Chart.js 跟著更新
        setTimeout(function(){ try { window.dispatchEvent(new Event('resize')); } catch(e) {} }, 0);
    }
    
    // 存儲當前圓餅圖的數據（用於懸停時獲取 carbonId）
    let hotspotDataItems = [];
    
    var hotspotChart = new Chart(hotspotCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: { 
                position: 'right',
                labels: {
                    generateLabels: function(chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            const dataset = data.datasets[0];
                            const total = calculateTotal(dataset.data);
                            return data.labels.map((label, i) => {
                                const value = dataset.data[i];
                                const percentage = calculatePercentage(value, total);
                                return {
                                    text: `${label} (${percentage}%)`,
                                    fillStyle: dataset.backgroundColor[i],
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltips: {
                enabled: false // 禁用默認 tooltip
            },
            onHover: function(evt, elements) {
                const canvas = document.getElementById('carbonHotspotChart');
                if (elements.length > 0) {
                    canvas.style.cursor = 'pointer';
                    const segmentIndex = elements[0]._index;
                    const item = hotspotDataItems[segmentIndex];
                    // 取值與百分比
                    const dataset = (hotspotChart && hotspotChart.data && hotspotChart.data.datasets) ? hotspotChart.data.datasets[0] : null;
                    const value = dataset && dataset.data ? (dataset.data[segmentIndex] || 0) : 0;
                    const total = dataset && dataset.data ? calculateTotal(dataset.data) : 0;
                    const percentage = calculatePercentage(value, total);
                    const fuelName = item ? item.fuelName : (hotspotChart.data.labels[segmentIndex] || '');

                    // 自訂小提示
                    let $tip = $('#hotspotHoverTip');
                    if (!$tip.length) {
                        $tip = $('<div id="hotspotHoverTip"></div>').css({
                            'position': 'fixed',
                            'z-index': 10000,
                            'background': 'rgba(0,0,0,0.85)',
                            'color': '#fff',
                            'padding': '6px 8px',
                            'font-size': '12px',
                            'border-radius': '4px',
                            'pointer-events': 'none',
                            'white-space': 'nowrap'
                        }).appendTo('body');
                    }
                    const x = (evt && evt.clientX != null) ? evt.clientX + 10 : 0;
                    const y = (evt && evt.clientY != null) ? evt.clientY + 10 : 0;
                    $tip.html(`${fuelName}：${value} kg CO₂e（${percentage}%）<br><span style="opacity:0.85;">點擊看趨勢圖！</span>`).css({ left: x + 'px', top: y + 'px' }).show();
                } else {
                    canvas.style.cursor = 'default';
                    $('#hotspotHoverTip').hide();
                }
            },
            onClick: function(evt, elements) {
                if (elements.length > 0) {
                    const segmentIndex = elements[0]._index;
                    if (hotspotDataItems[segmentIndex]) {
                        const item = hotspotDataItems[segmentIndex];
                        const fuelName = item.fuelName;
                        const carbonId = item.carbonId;
                        const startDate = $('#mgrStartDate').val();
                        const endDate = $('#mgrEndDate').val();
                        
                        // 點擊時固定在趨勢圖區域顯示
                        showFuelTrendOnHover(carbonId, fuelName, startDate, endDate);
                    }
                }
            }
        }
    });
    
    // 註冊自定義插件：在每個扇形上顯示百分比
    Chart.plugins.register({
        afterDraw: function(chart) {
            // 只在目標圖表上執行
            if (chart.canvas.id !== 'carbonHotspotChart') return;
            
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            const data = chart.data.datasets[0].data;
            
            // 如果沒有數據，不執行
            if (!data || data.length === 0) return;
            
            const total = calculateTotal(data);
            const meta = chart.getDatasetMeta(0);
            
            if (!meta || !meta.data) return;
            
            // 設置文字樣式
            ctx.save();
            ctx.font = 'bold 13px "Microsoft YaHei", "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#333';
            
            meta.data.forEach((segment, index) => {
                if (!segment) return;
                
                const value = data[index];
                const percentage = calculatePercentage(value, total);
                
                // 只顯示大於 2% 的部分，避免小片段文字擁擠
                if (parseFloat(percentage) >= 2) {
                    // 計算扇形的中心點
                    const angle = (segment.startAngle + segment.endAngle) / 2;
                    const radius = (segment.outerRadius + segment.innerRadius) / 2;
                    const chartCenterX = chartArea.left + (chartArea.right - chartArea.left) / 2;
                    const chartCenterY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;
                    const x = chartCenterX + Math.cos(angle) * radius;
                    const y = chartCenterY + Math.sin(angle) * radius;
                    
                    // 添加文字陰影以提高可讀性
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                    ctx.shadowBlur = 4;
                    
                    // 繪製百分比文字
                    ctx.fillText(`${percentage}%`, x, y);
                }
            });
            
            ctx.restore();
        }
    });

    // 碳信用額度累積趨勢
    var creditCtx = document.getElementById('carbonCreditChart').getContext('2d');
    var creditChart = new Chart(creditCtx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月'],
            datasets: [{
                label: '碳信用額度',
                data: [800, 900, 1050, 1100, 1250],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    },
                    scaleLabel: {
                        display: true,
                        labelString: '碳信用額度 (點)'
                    }
                }]
            }
        }
    });

    async function fetchTrend(daysOrMode) {
        try {
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            let url;
            if (daysOrMode === 'month') {
                url = `${API_BASE}/carbon/daily-emissions-summary?mode=month`;
            } else if (daysOrMode === 'year') {
                url = `${API_BASE}/carbon/daily-emissions-summary?mode=year`;
            } else {
                url = `${API_BASE}/carbon/daily-emissions-summary?days=${daysOrMode}`;
            }
            const res = await fetch(url, { method: 'GET', headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const items = (json && json.data && json.data.dailyEmissionsSummary) ? json.data.dailyEmissionsSummary : [];

            const labels = items.map(i => i.dateLabel || i.date);
            const daily = items.map(i => i.dailyTotalEmission || 0);
            const cumulative = items.map(i => i.cumulativeEmission || 0);

            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = daily;
            trendChart.data.datasets[1].data = cumulative;
            trendChart.update();
        } catch (err) {
            console.error('取得碳排放趨勢失敗:', err);
        }
    }

    // 時間範圍切換
    $('input[name="timeRange"]').change(function() {
        var range = $(this).val();
        if (range === '30') {
            fetchTrend('month');
        } else if (range === '365') {
            fetchTrend('year');
        } else {
            fetchTrend(range);
        }
    });

    // 自動更新功能
    function updateData() {
        var range = $('input[name="timeRange"]:checked').val();
        if (range === '30') return fetchTrend('month');
        if (range === '365') return fetchTrend('year');
        return fetchTrend(range);
    }

    // 每分鐘更新一次
    setInterval(updateData, 60000);

    // 初始載入（預設 7 天）
    (function initFetch() {
        var range = $('input[name="timeRange"]:checked').val() || '7';
        if (range === '30') fetchTrend('month'); else if (range === '365') fetchTrend('year'); else fetchTrend(range);

        // 預設載入當年度的來源占比
        const now = new Date();
        const start = `${now.getFullYear()}-01-01`;
        const end = `${now.getFullYear()}-12-31`;
        $('#mgrStartDate').val(start);
        $('#mgrEndDate').val(end);
        fetchBreakdown(start, end);

        // 初始載入燃料趨勢圖（依當年度區間）
        resetFuelTrendState();
        renderFuelTrends(start, end, true);
    })();

    async function fetchBreakdown(startDate, endDate) {
        try {
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const url = `${API_BASE}/carbon/emissions-breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
            const res = await fetch(url, { method: 'GET', headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const items = (json && json.data && json.data.breakdown) ? json.data.breakdown : [];
            const labels = items.map(i => i.fuelName);
            const data = items.map(i => i.totalEmission || 0);
            const palette = getColorPalette();
            const colors = labels.map((_, idx) => palette[idx % palette.length]);
            
            // 保存完整的 items 以供懸停時使用
            hotspotDataItems = items;
            
            // 計算總量用於顯示
            const total = calculateTotal(data);
            
            hotspotChart.data.labels = labels;
            hotspotChart.data.datasets[0].data = data;
            hotspotChart.data.datasets[0].backgroundColor = colors;
            
            // 更新圖表，觸發重新繪製和百分比顯示
            hotspotChart.update({
                duration: 800,
                easing: 'easeOutQuart'
            });
        } catch (err) {
            console.error('取得來源占比失敗:', err);
        }
    }
    
    // 顯示單個燃料的趨勢圖（懸停或點擊時）
    async function showFuelTrendOnHover(carbonId, fuelName, startDate, endDate) {
        try {
            console.log('🔍 [DEBUG] 顯示趨勢圖:', { carbonId, fuelName, startDate, endDate });
            
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            
            const url = `${API_BASE}/carbon/fuel-emissions/${encodeURIComponent(carbonId)}`;
            const res = await fetch(url, { method: 'GET', headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const list = (json && json.data && json.data.dailyEmissions) ? json.data.dailyEmissions : [];
            
            // 從 API 回傳中抓最早到最晚，再依區間過濾（含首尾），並按日期排序
            const filtered = list
                .filter(d => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const labels = filtered.map(d => d.date.substring(5).replace(/^0/, '').replace('-0', '/'));
            const daily = filtered.map(d => d.dailyTotalEmission || 0);
            const cumulative = filtered.map(d => d.cumulativeEmission || 0);
            
            // 檢查是否已存在容器
            let $container = $('#hoverTrendContainer');
            if ($container.length === 0) {
                // 創建容器（放在圓餅圖下方）
                $container = $(`
                    <div class="row" id="hoverTrendContainer" style="display:none; width: 100%; margin: 0 auto; margin-top: 0;">
                        <div class="col-12" style="padding: 0;">
                            <div class="panel">
                                <div class="panel-hdr">
                                    <h2 id="hoverTrendTitle">趨勢圖</h2>
                                    <div class="panel-toolbar">
                                        <button id="closeHoverTrend" class="btn btn-panel" title="關閉"></button>
                                        <button class="btn btn-panel" data-action="panel-collapse" data-toggle="tooltip" data-offset="0,10" data-original-title="收合"></button>
                                    </div>
                                </div>
                                <div class="panel-container show">
                                    <div class="panel-content">
                                        <div id="hoverTrendWrap" style="width:100%; height:400px;">
                                            <canvas id="hoverTrendChart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                
                // 插入位置：為了讓容器能橫跨整列（占兩個 container 寬度），
                // 將其放在包含 #panel-2 的那個 .row 的同層級（作為新的 row）。
                (function placeFullWidthRow(){
                    var $panel2 = $('#panel-2');
                    if ($panel2.length) {
                        var $row = $panel2.closest('.row');
                        if ($row.length) {
                            // 放在該列之後，形成一個獨立的滿寬列，位置在「碳排放熱點分析」下方
                            $row.after($container);
                            return;
                        }
                        // 找不到 .row，就退而求其次，放在 #panel-2 之後
                        $panel2.after($container);
                    } else {
                        // 如果找不到 panel-2，直接附加到內容區塊末端
                        $('main, .container, .page-content, body').first().append($container);
                    }
                })();
                
                // 確保關閉按鈕有足夠的 z-index 和可點擊性（紅色圓點樣式）
                $container.find('#closeHoverTrend').css({
                    'z-index': '9999',
                    'pointer-events': 'auto',
                    'cursor': 'pointer',
                    'width': '1rem',
                    'height': '1rem',
                    'border-radius': '50%',
                    'background-color': '#dc3545',
                    'border': 'none',
                    'padding': '0',
                    'outline': 'none',
                    'box-shadow': '0 0 0 0 rgba(220, 53, 69, 0.4)',
                    'transition': 'all 0.2s ease'
                }).on('mouseenter', function() {
                    $(this).css({
                        'transform': 'scale(1.2)',
                        'box-shadow': '0 0 0 3px rgba(220, 53, 69, 0.2)'
                    });
                }).on('mouseleave', function() {
                    $(this).css({
                        'transform': 'scale(1)',
                        'box-shadow': '0 0 0 0 rgba(220, 53, 69, 0.4)'
                    });
                });
                
                // 直接綁定關閉按鈕事件（在容器插入後立即綁定）
                $container.find('#closeHoverTrend').on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('關閉按鈕被點擊');
                    $('#hoverTrendContainer').fadeOut(300);
                    return false;
                });
                
                // 添加 CSS 來隱藏右上角的綠色點點並確保圖表數據點顯示
                const styleId = 'hide-hover-trend-green-dot';
                if (!$(`#${styleId}`).length) {
                    $('<style>')
                        .attr('id', styleId)
                        .html(`
                            /* 隱藏所有可能的綠色點點元素 */
                            #hoverTrendContainer .panel-hdr > span,
                            #hoverTrendContainer .panel-hdr > i,
                            #hoverTrendContainer .panel-hdr > div:not(.panel-toolbar):not(:first-child),
                            #hoverTrendContainer .panel-hdr .panel-toolbar + span,
                            #hoverTrendContainer .panel-hdr .panel-toolbar + i,
                            #hoverTrendContainer .panel-hdr .panel-toolbar + div,
                            #hoverTrendContainer .panel-hdr span[class*="success"],
                            #hoverTrendContainer .panel-hdr span[class*="green"],
                            #hoverTrendContainer .panel-hdr i[class*="success"],
                            #hoverTrendContainer .panel-hdr i[class*="green"],
                            #hoverTrendContainer .panel-hdr [class*="badge"],
                            #hoverTrendContainer .panel-hdr [class*="status"],
                            #hoverTrendContainer .panel-hdr [class*="indicator"] {
                                display: none !important;
                                visibility: hidden !important;
                            }
                            /* 隱藏偽元素 */
                            #hoverTrendContainer .panel-hdr::after,
                            #hoverTrendContainer .panel-hdr::before,
                            #hoverTrendContainer .panel-hdr .panel-toolbar::after,
                            #hoverTrendContainer .panel-hdr .panel-toolbar::before {
                                display: none !important;
                                content: none !important;
                            }
                            /* header 與 toolbar 對齊，保留原生 toolbar 背景 */
                            #hoverTrendContainer .panel-hdr { position: relative !important; overflow: visible !important; }
                            #hoverTrendContainer .panel-hdr .panel-toolbar * { background: initial !important; }
                            /* 如果有背景色形成的點（排除關閉紅點與 toolbar 內元素） */
                            #hoverTrendContainer .panel-hdr *:not(#closeHoverTrend):not(.panel-toolbar):not(.btn-panel) { background: transparent !important; }
                            /* 強制關閉紅點的樣式，尺寸對齊 .btn-panel */
                            #hoverTrendContainer #closeHoverTrend { display: inline-block !important; background-color: #dc3545 !important; width: 1rem !important; height: 1rem !important; border-radius: 50% !important; z-index: 10000 !important; pointer-events: auto !important; border: none !important; }
                            /* 確保圖表數據點始終顯示 */
                            #hoverTrendContainer canvas {
                                position: relative !important;
                                z-index: 1 !important;
                            }
                            /* 覆蓋任何可能隱藏數據點的 CSS */
                            #hoverTrendContainer .chartjs-render-monitor,
                            #hoverTrendContainer canvas {
                                opacity: 1 !important;
                                visibility: visible !important;
                            }
                        `)
                        .appendTo('head');
                }
                
                // 如果還是出現，在容器顯示後再次嘗試移除
                setTimeout(function() {
                    $('#hoverTrendContainer .panel-hdr').children().each(function() {
                        const $el = $(this);
                        // 檢查是否是綠色點點（小圓形元素）
                        if (($el.is('span') || $el.is('i') || $el.is('div')) && 
                            ($el.css('background-color').includes('rgb(40, 167, 69)') || 
                             $el.css('background-color').includes('rgb(76, 175, 80)') ||
                             $el.hasClass('text-success') ||
                             $el.hasClass('bg-success') ||
                             $el.width() <= 10 && $el.height() <= 10)) {
                            $el.remove();
                        }
                    });
                }, 100);
                
            }
            
            // 更新標題
            $('#hoverTrendTitle').text(`${fuelName} 趨勢 (鼠標點擊顯示)`);
            
            // 顯示容器
            $container.fadeIn(300, function() {
                // 直接移除 panel-hdr 中除了指定元素外的所有元素
                const $panelHdr = $('#hoverTrendContainer .panel-hdr');
                
                // 保留的元素：標題、關閉按鈕、panel-toolbar
                const keepIds = ['hoverTrendTitle', 'closeHoverTrend'];
                const keepClasses = ['panel-toolbar'];
                
                $panelHdr.children().each(function() {
                    const $el = $(this);
                    let shouldKeep = false;
                    
                    // 檢查是否應該保留
                    if (keepIds.includes($el.attr('id'))) shouldKeep = true;
                    if (keepClasses.some(cls => $el.hasClass(cls))) shouldKeep = true;
                    if ($el.is('h2')) shouldKeep = true;
                    if ($el.is('button') && $el.attr('id') === 'closeHoverTrend') shouldKeep = true;
                    
                    // 如果不在保留清單中，直接移除
                    if (!shouldKeep) {
                        $el.remove();
                    }
                });
                
                // 再次確保關閉按鈕存在並綁定事件（強制重新綁定）
                const $closeBtn = $('#closeHoverTrend');
                if ($closeBtn.length) {
                    // 強制設置高 z-index 和可點擊性（保持紅色圓點樣式）
                    $closeBtn.css({
                        'z-index': '99999',
                        'pointer-events': 'auto',
                        'cursor': 'pointer',
                        'width': '1rem',
                        'height': '1rem',
                        'border-radius': '50%',
                        'background-color': '#dc3545',
                        'border': 'none',
                        'padding': '0',
                        'outline': 'none'
                    });
                    
                    // 確保按鈕不被其他元素覆蓋
                    $('#hoverTrendContainer .panel-hdr').css({
                        'position': 'relative',
                        'z-index': '1000',
                        'overflow': 'visible'
                    });
                    
                    // 移除所有可能的事件處理器
                    $closeBtn.off('click').off('click.closeTrend');
                    // 重新綁定
                    $closeBtn.on('click.closeTrend', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('關閉按鈕被點擊（第二次綁定）');
                        $('#hoverTrendContainer').fadeOut(300);
                        return false;
                    });
                    // 也使用事件委托作為備份
                    $(document).off('click', '#closeHoverTrend').on('click', '#closeHoverTrend', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('關閉按鈕被點擊（事件委托）');
                        $('#hoverTrendContainer').fadeOut(300);
                        return false;
                    });
                } else {
                    console.warn('警告：找不到關閉按鈕 #closeHoverTrend');
                }
                
                // 再次檢查並移除可能的綠色元素
                $panelHdr.find('span, i, div').each(function() {
                    const $el = $(this);
                    if ($el.hasClass('panel-toolbar')) return;
                    
                    const bgColor = $el.css('background-color');
                    const width = parseInt($el.css('width')) || 0;
                    const height = parseInt($el.css('height')) || 0;
                    const borderRadius = $el.css('border-radius');
                    
                    // 如果是小圓點且是綠色
                    if (width <= 12 && height <= 12 && 
                        (borderRadius === '50%' || borderRadius.includes('px')) &&
                        bgColor && (bgColor.includes('rgb(40, 167') || bgColor.includes('rgb(76, 175') || 
                                   bgColor.includes('rgb(34, 187') || bgColor.includes('rgb(92, 184'))) {
                        $el.remove();
                    }
                });
                
                // 強制隱藏任何剩餘的綠色狀態指示器
                $panelHdr.find('*').filter(function() {
                    const bg = $(this).css('background-color');
                    return bg && (bg.includes('rgb(40, 167') || bg.includes('rgb(76, 175'));
                }).remove();
            });
            
            // 獲取或創建 canvas
            let canvas = document.getElementById('hoverTrendChart');
            let hoverTrendChart = null;
            
            // 檢查是否已存在圖表實例
            if (window.hoverTrendChartInstance) {
                hoverTrendChart = window.hoverTrendChartInstance;
                // 更新數據
                hoverTrendChart.data.labels = labels;
                hoverTrendChart.data.datasets[0].data = daily;
                hoverTrendChart.data.datasets[1].data = cumulative;
                // 確保折線圖的數據點始終顯示
                if (hoverTrendChart.data.datasets[1]) {
                    const pointCount = labels.length;
                    hoverTrendChart.data.datasets[1].pointRadius = Array(pointCount).fill(5);
                    hoverTrendChart.data.datasets[1].pointHoverRadius = Array(pointCount).fill(7);
                    hoverTrendChart.data.datasets[1].pointBackgroundColor = Array(pointCount).fill('#ff5fa2');
                    hoverTrendChart.data.datasets[1].pointBorderColor = Array(pointCount).fill('#fff');
                    hoverTrendChart.data.datasets[1].pointBorderWidth = Array(pointCount).fill(2);
                    hoverTrendChart.data.datasets[1].pointStyle = Array(pointCount).fill('circle');
                    hoverTrendChart.data.datasets[1].lineTension = 0;
                }
                // 強制更新並確保數據點顯示
                hoverTrendChart.update({
                    duration: 0
                });
                
                // 更新後立即設置數據點
                setTimeout(function() {
                    if (hoverTrendChart && hoverTrendChart.data && hoverTrendChart.data.datasets[1] && hoverTrendChart.data.datasets[1]._meta) {
                        const metaKeys = Object.keys(hoverTrendChart.data.datasets[1]._meta);
                        metaKeys.forEach(function(key) {
                            const meta = hoverTrendChart.data.datasets[1]._meta[key];
                            if (meta && meta.data) {
                                meta.data.forEach(function(point) {
                                    if (point) {
                                        if (!point._view) point._view = {};
                                        if (!point._model) point._model = {};
                                        point._view.radius = 5;
                                        point._model.radius = 5;
                                        point._view.skip = false;
                                        point._model.skip = false;
                                    }
                                });
                            }
                        });
                        hoverTrendChart.draw();
                    }
                }, 50);
            } else {
                // 確保 Chart.js 默認點半徑不為 0
                if (typeof Chart !== 'undefined' && Chart.defaults && Chart.defaults.global) {
                    if (!Chart.defaults.global.elements) {
                        Chart.defaults.global.elements = {};
                    }
                    if (!Chart.defaults.global.elements.point) {
                        Chart.defaults.global.elements.point = {};
                    }
                    // 強制設置全局點半徑（如果為 0 則改為 5）
                    if (!Chart.defaults.global.elements.point.radius || Chart.defaults.global.elements.point.radius === 0) {
                        Chart.defaults.global.elements.point.radius = 5;
                    }
                }
                
                // 創建新圖表
                const ctx = canvas.getContext('2d');
                hoverTrendChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: '每日排放 (kg CO₂e)',
                            type: 'bar',
                            data: daily,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1,
                            yAxisID: 'y-axis-1'
                        }, {
                            label: '累積排放 (kg CO₂e)',
                            type: 'line',
                            data: cumulative,
                            borderColor: '#ff5fa2',
                            backgroundColor: '#ff5fa2',
                            fill: false,
                            lineTension: 0,
                            pointRadius: Array(labels.length).fill(5), // 為每個數據點設置半徑，使用 fill 確保數組正確
                            pointHoverRadius: Array(labels.length).fill(7),
                            pointBackgroundColor: Array(labels.length).fill('#ff5fa2'),
                            pointBorderColor: Array(labels.length).fill('#fff'),
                            pointBorderWidth: Array(labels.length).fill(2),
                            pointStyle: Array(labels.length).fill('circle'),
                            showLine: true,
                            yAxisID: 'y-axis-1'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        elements: {
                            point: {
                                radius: 5,
                                hoverRadius: 7,
                                backgroundColor: '#ff5fa2',
                                borderColor: '#fff',
                                borderWidth: 2,
                                hitRadius: 7,
                                pointStyle: 'circle',
                                display: true // 強制顯示
                            },
                            line: {
                                tension: 0, // 直線，不使用貝塞爾曲線
                                borderWidth: 2
                            }
                        },
                        animation: {
                            duration: 0 // 禁用動畫，立即顯示
                        },
                        onResize: function() {
                            // 窗口大小改變時也確保數據點顯示
                            const chart = this;
                            if (chart.data && chart.data.datasets[1] && chart.data.datasets[1]._meta) {
                                const metaKeys = Object.keys(chart.data.datasets[1]._meta);
                                metaKeys.forEach(function(key) {
                                    const meta = chart.data.datasets[1]._meta[key];
                                    if (meta && meta.data) {
                                        meta.data.forEach(function(point) {
                                            if (point && point._view) {
                                                point._view.radius = 5;
                                                point._view.skip = false;
                                            }
                                        });
                                    }
                                });
                            }
                        },
                        layout: {
                            padding: {
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0
                            }
                        },
                        scales: {
                            xAxes: [{
                                gridLines: {
                                    display: true,
                                    drawBorder: true
                                },
                                ticks: {
                                    autoSkip: false,
                                    maxRotation: 45,
                                    minRotation: 0
                                }
                            }],
                            yAxes: [{
                                id: 'y-axis-1',
                                type: 'linear',
                                position: 'left',
                                ticks: { beginAtZero: true },
                                scaleLabel: { display: true, labelString: 'kg CO₂e' },
                                gridLines: {
                                    display: true,
                                    drawBorder: true
                                }
                            }]
                        },
                        tooltips: { 
                            mode: 'index', 
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 10,
                            titleFontSize: 14,
                            bodyFontSize: 13,
                            cornerRadius: 6
                        },
                        hover: { 
                            mode: 'index', 
                            intersect: false,
                            animationDuration: 200
                        }
                    }
                });
                
                // 註冊自定義插件強制顯示數據點（只註冊一次）
                if (!window.hoverTrendPointPluginRegistered) {
                    Chart.plugins.register({
                        id: 'hoverTrendPointPlugin',
                        afterDraw: function(chart) {
                            if (chart.canvas && chart.canvas.id === 'hoverTrendChart') {
                                if (chart.data && chart.data.datasets[1] && chart.data.datasets[1]._meta) {
                                    const metaKeys = Object.keys(chart.data.datasets[1]._meta);
                                    metaKeys.forEach(function(key) {
                                        const meta = chart.data.datasets[1]._meta[key];
                                        if (meta && meta.data) {
                                            const ctx = chart.ctx;
                                            meta.data.forEach(function(point) {
                                                if (point && point._view && !point._view.skip) {
                                                    const x = point._view.x;
                                                    const y = point._view.y;
                                                    
                                                    // 確保 x 和 y 是有效數字
                                                    if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                                                        // 強制繪製數據點
                                                        ctx.save();
                                                        ctx.beginPath();
                                                        ctx.arc(x, y, 5, 0, 2 * Math.PI);
                                                        ctx.fillStyle = '#ff5fa2';
                                                        ctx.fill();
                                                        ctx.strokeStyle = '#fff';
                                                        ctx.lineWidth = 2;
                                                        ctx.stroke();
                                                        ctx.restore();
                                                    }
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    });
                    window.hoverTrendPointPluginRegistered = true;
                }
                
                // 保存實例
                window.hoverTrendChartInstance = hoverTrendChart;
                
                // 強制設置數據點的配置（Chart.js v2 的特殊處理）
                // 需要等待圖表完全初始化
                setTimeout(function() {
                    if (hoverTrendChart && hoverTrendChart.data && hoverTrendChart.data.datasets[1] && hoverTrendChart.data.datasets[1]._meta) {
                        const metaKeys = Object.keys(hoverTrendChart.data.datasets[1]._meta);
                        metaKeys.forEach(function(key) {
                            const meta = hoverTrendChart.data.datasets[1]._meta[key];
                            if (meta && meta.data) {
                                meta.data.forEach(function(point) {
                                    if (point) {
                                        // 確保 _view 和 _model 都存在並設置正確的值
                                        if (!point._view) point._view = {};
                                        if (!point._model) point._model = {};
                                        
                                        point._view.radius = 5;
                                        point._view.hoverRadius = 7;
                                        point._view.backgroundColor = '#ff5fa2';
                                        point._view.borderColor = '#fff';
                                        point._view.borderWidth = 2;
                                        point._view.skip = false;
                                        
                                        point._model.radius = 5;
                                        point._model.hoverRadius = 7;
                                        point._model.backgroundColor = '#ff5fa2';
                                        point._model.borderColor = '#fff';
                                        point._model.borderWidth = 2;
                                        point._model.skip = false;
                                    }
                                });
                            }
                        });
                        // 強制重繪
                        hoverTrendChart.draw();
                    }
                }, 100);
                
                // 強制重繪確保數據點顯示
                setTimeout(function() {
                    if (hoverTrendChart && typeof hoverTrendChart.update === 'function') {
                        // 強制設置所有數據點的半徑為 5（非 0 才能顯示）
                        if (hoverTrendChart.data.datasets[1] && hoverTrendChart.data.datasets[1]._meta) {
                            const metaKeys = Object.keys(hoverTrendChart.data.datasets[1]._meta);
                            metaKeys.forEach(function(key) {
                                const meta = hoverTrendChart.data.datasets[1]._meta[key];
                                if (meta && meta.data) {
                                    meta.data.forEach(function(point) {
                                        if (point) {
                                            // 強制設置視圖屬性
                                            if (!point._view) point._view = {};
                                            point._view.radius = 5;
                                            point._view.hoverRadius = 7;
                                            point._view.backgroundColor = '#ff5fa2';
                                            point._view.borderColor = '#fff';
                                            point._view.borderWidth = 2;
                                            point._view.skip = false;
                                            // 設置模型屬性（Chart.js v2 需要）
                                            if (!point._model) point._model = {};
                                            point._model.radius = 5;
                                            point._model.hoverRadius = 7;
                                            point._model.backgroundColor = '#ff5fa2';
                                            point._model.borderColor = '#fff';
                                            point._model.borderWidth = 2;
                                        }
                                    });
                                }
                            });
                        }
                        
                        // 更新圖表
                        hoverTrendChart.update(0);
                        
                        // 立即重繪
                        setTimeout(function() {
                            hoverTrendChart.draw();
                        }, 50);
                    }
                }, 100);
            }
        } catch (err) {
            console.error('顯示燃料趨勢圖失敗:', err);
        }
    }

    // 日期區間套用
    $('#mgrApplyRange').on('click', function() {
        console.log('🔍 [DEBUG] 套用按鈕被點擊');
        const start = $('#mgrStartDate').val();
        const end = $('#mgrEndDate').val();
        console.log('🔍 [DEBUG] 套用按鈕 - 開始日期:', start);
        console.log('🔍 [DEBUG] 套用按鈕 - 結束日期:', end);
        
        if (!start || !end) {
            console.log('🔍 [DEBUG] 套用按鈕 - 日期範圍不完整，取消執行');
            return;
        }
        
        console.log('🔍 [DEBUG] 套用按鈕 - 開始執行更新');
        fetchBreakdown(start, end);
        resetFuelTrendState();
        renderFuelTrends(start, end, true);
    });

    // 依據區間讀取 emissions-breakdown，取出所有 carbonId，動態建立每個燃料的趨勢面板
    // palette 與圓餅圖一致
    function getColorPalette(){
        return ['#2dd9c5','#ff5fa2','#3d7eff','#f2c94c','#6f42c1','#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3'];
    }

    // 顯示更多
    $(document).on('click', '#fuelTrendsLoadMore', function(){
        console.log('🔍 [DEBUG] 顯示更多按鈕被點擊');
        
        // 1. 檢查按鈕狀態
        console.log('🔍 [DEBUG] 按鈕元素:', $('#fuelTrendsLoadMore'));
        console.log('🔍 [DEBUG] 按鈕是否隱藏:', $('#fuelTrendsLoadMore').hasClass('d-none'));
        console.log('🔍 [DEBUG] 按鈕是否禁用:', $('#fuelTrendsLoadMore').prop('disabled'));
        
        const start = $('#mgrStartDate').val();
        const end = $('#mgrEndDate').val();
        
        // 2. 檢查日期範圍
        console.log('🔍 [DEBUG] 開始日期:', start);
        console.log('🔍 [DEBUG] 結束日期:', end);
        
        // 3. 檢查分頁狀態
        console.log('🔍 [DEBUG] 總項目數:', fuelTrendAllItems.length);
        console.log('🔍 [DEBUG] 已渲染數:', fuelTrendRendered);
        console.log('🔍 [DEBUG] 是否還有更多:', fuelTrendRendered < fuelTrendAllItems.length);
        console.log('🔍 [DEBUG] 下一批要渲染的項目:', fuelTrendAllItems.slice(fuelTrendRendered, fuelTrendRendered + PAGE_SIZE));
        
        renderFuelTrends(start, end, false);
    });

    function resetFuelTrendState(){
        fuelTrendAllItems = [];
        fuelTrendRendered = 0;
        $('#fuelTrendsNoMore').addClass('d-none');
        $('#fuelTrendsLoadMore').prop('disabled', false).removeClass('d-none');
        const $row = $('#fuelTrendRow');
        if ($row.length) $row.empty();
    }

    async function renderFuelTrends(startDate, endDate, fetchListIfNeeded = false) {
        try {
            console.log('🔍 [DEBUG] renderFuelTrends 開始執行');
            console.log('🔍 [DEBUG] 參數:', { startDate, endDate, fetchListIfNeeded });
            
            const $row = $('#fuelTrendRow');
            if ($row.length === 0) {
                console.log('🔍 [DEBUG] 找不到 #fuelTrendRow 元素');
                return;
            }
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            if (fetchListIfNeeded || fuelTrendAllItems.length === 0) {
                console.log('🔍 [DEBUG] 需要重新取得資料清單');
                // 先取來源占比，作為清單，依 totalEmission 由大到小排序
                const url = `${API_BASE}/carbon/emissions-breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
                console.log('🔍 [DEBUG] API URL:', url);
                const res = await fetch(url, { method: 'GET', headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                console.log('🔍 [DEBUG] API 回應:', json);
                const items = (json && json.data && json.data.breakdown) ? json.data.breakdown : [];
                console.log('🔍 [DEBUG] 原始項目數:', items.length);
                // 過濾掉沒有 carbonId 的項目（安全）
                fuelTrendAllItems = items.filter(it => it.carbonId).sort((a,b) => (b.totalEmission||0) - (a.totalEmission||0));
                console.log('🔍 [DEBUG] 過濾後項目數:', fuelTrendAllItems.length);
                fuelTrendRendered = 0;
                $row.empty();
            } else {
                console.log('🔍 [DEBUG] 使用現有資料清單，項目數:', fuelTrendAllItems.length);
            }

            // 若沒有資料，顯示提示
            if (fuelTrendAllItems.length === 0) {
                console.log('🔍 [DEBUG] 沒有資料，顯示提示訊息');
                $row.html('<div class="col-12"><div class="alert alert-light border">該日期區間沒有資料</div></div>');
                $('#fuelTrendsLoadMore').addClass('d-none');
                $('#fuelTrendsNoMore').addClass('d-none');
                return;
            }

            // 一次渲染最多 PAGE_SIZE 個
            const nextSlice = fuelTrendAllItems.slice(fuelTrendRendered, fuelTrendRendered + PAGE_SIZE);
            console.log('🔍 [DEBUG] 準備渲染下一批項目:', nextSlice.length, '個');
            console.log('🔍 [DEBUG] 下一批項目詳情:', nextSlice);
            
            for (const item of nextSlice) {
                const carbonId = item.carbonId;
                const fuelName = item.fuelName;
                const panelId = `fuelTrend_${carbonId}`;
                const canvasId = `fuelTrendCanvas_${carbonId}`;

                const panelHtml = `
                    <div class="col-xl-6">
                        <div class="panel">
                            <div class="panel-hdr">
                                <h2>${fuelName} 趨勢</h2>
                            </div>
                            <div class="panel-container show">
                                <div class="panel-content">
                                    <div id="${canvasId}_wrap" style="width:100%; height:300px;">
                                        <canvas id="${canvasId}"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

                $row.append(panelHtml);
                // 設定每張卡片的圖表包裹層為響應式高度（約等於 1/2 寬）
                setupResponsiveChartContainer(`#${canvasId}_wrap`, { ratio: 0.4, min: 220, max: 420 });

                // 取單一燃料的每日排放資料
                await renderSingleFuelTrend(carbonId, canvasId, startDate, endDate);
            }

            fuelTrendRendered += nextSlice.length;
            console.log('🔍 [DEBUG] 更新渲染計數:', fuelTrendRendered, '/', fuelTrendAllItems.length);
            
            if (fuelTrendRendered >= fuelTrendAllItems.length) {
                console.log('🔍 [DEBUG] 所有項目已渲染完畢，禁用按鈕');
                $('#fuelTrendsLoadMore').prop('disabled', true);
                $('#fuelTrendsNoMore').removeClass('d-none');
            } else {
                console.log('🔍 [DEBUG] 還有更多項目，啟用按鈕');
                $('#fuelTrendsLoadMore').prop('disabled', false);
                $('#fuelTrendsNoMore').addClass('d-none');
            }
        } catch (err) {
            console.error('渲染燃料趨勢圖失敗:', err);
        }
    }

    // 取得 /fuel-emissions/:carbonId 並依區間過濾，畫出每日與累積
    async function renderSingleFuelTrend(carbonId, canvasId, startDate, endDate) {
        const token = getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `${API_BASE}/carbon/fuel-emissions/${encodeURIComponent(carbonId)}`;
        const res = await fetch(url, { method: 'GET', headers });
        if (!res.ok) return console.warn('取得燃料趨勢失敗', carbonId, res.status);
        const json = await res.json();
        const list = (json && json.data && json.data.dailyEmissions) ? json.data.dailyEmissions : [];

        // 從 API 回傳中抓最早到最晚，再依區間過濾（含首尾），並按日期排序
        const filtered = list
            .filter(d => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // 按日期從舊到新排序

        console.log('🔍 [DEBUG] 燃料趨勢資料排序後:', filtered.map(d => d.date));

        const labels = filtered.map(d => d.date.substring(5).replace(/^0/, '').replace('-0', '/'));
        const daily = filtered.map(d => d.dailyTotalEmission || 0);
        const cumulative = filtered.map(d => d.cumulativeEmission || 0);

        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '每日排放 (kg CO₂e)',
                    type: 'bar',
                    data: daily,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    yAxisID: 'y-axis-1'
                }, {
                    label: '累積排放 (kg CO₂e)',
                    type: 'line',
                    data: cumulative,
                    borderColor: '#ff5fa2',
                    fill: false,
                    yAxisID: 'y-axis-1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    yAxes: [{
                        id: 'y-axis-1',
                        type: 'linear',
                        position: 'left',
                        ticks: { beginAtZero: true },
                        scaleLabel: { display: true, labelString: 'kg CO₂e' }
                    }]
                },
                tooltips: { mode: 'index', intersect: false },
                hover: { mode: 'index', intersect: false }
            }
        });
    }
});

$(document).ready(function() {
    const API_BASE = 'http://localhost:3000/api';
    const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
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
    var hotspotChart = new Chart(hotspotCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true, maintainAspectRatio: false, legend: { position: 'right' } }
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
            const data = items.map(i => i.totalEmission);
            const palette = getColorPalette();
            const colors = labels.map((_, idx) => palette[idx % palette.length]);
            hotspotChart.data.labels = labels;
            hotspotChart.data.datasets[0].data = data;
            hotspotChart.data.datasets[0].backgroundColor = colors;
            hotspotChart.update();
        } catch (err) {
            console.error('取得來源占比失敗:', err);
        }
    }

    // 日期區間套用
    $('#mgrApplyRange').on('click', function() {
        const start = $('#mgrStartDate').val();
        const end = $('#mgrEndDate').val();
        if (!start || !end) return;
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
        const start = $('#mgrStartDate').val();
        const end = $('#mgrEndDate').val();
        renderFuelTrends(start, end, false);
    });

    // 分頁狀態
    let fuelTrendAllItems = [];
    let fuelTrendRendered = 0;
    const PAGE_SIZE = 6;

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
            const $row = $('#fuelTrendRow');
            if ($row.length === 0) return;
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            if (fetchListIfNeeded || fuelTrendAllItems.length === 0) {
                // 先取來源占比，作為清單，依 totalEmission 由大到小排序
                const url = `${API_BASE}/carbon/emissions-breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
                const res = await fetch(url, { method: 'GET', headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const items = (json && json.data && json.data.breakdown) ? json.data.breakdown : [];
                // 過濾掉沒有 carbonId 的項目（安全）
                fuelTrendAllItems = items.filter(it => it.carbonId).sort((a,b) => (b.totalEmission||0) - (a.totalEmission||0));
                fuelTrendRendered = 0;
                $row.empty();
            }

            // 若沒有資料，顯示提示
            if (fuelTrendAllItems.length === 0) {
                $row.html('<div class="col-12"><div class="alert alert-light border">該日期區間沒有資料</div></div>');
                $('#fuelTrendsLoadMore').addClass('d-none');
                $('#fuelTrendsNoMore').addClass('d-none');
                return;
            }

            // 一次渲染最多 PAGE_SIZE 個
            const nextSlice = fuelTrendAllItems.slice(fuelTrendRendered, fuelTrendRendered + PAGE_SIZE);
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
                                    <div style="width:100%; height:300px;">
                                        <canvas id="${canvasId}"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

                $row.append(panelHtml);

                // 取單一燃料的每日排放資料
                await renderSingleFuelTrend(carbonId, canvasId, startDate, endDate);
            }

            fuelTrendRendered += nextSlice.length;
            if (fuelTrendRendered >= fuelTrendAllItems.length) {
                $('#fuelTrendsLoadMore').prop('disabled', true);
                $('#fuelTrendsNoMore').removeClass('d-none');
            } else {
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

        // 從 API 回傳中抓最早到最晚，再依區間過濾（含首尾）
        const filtered = list.filter(d => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate));

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

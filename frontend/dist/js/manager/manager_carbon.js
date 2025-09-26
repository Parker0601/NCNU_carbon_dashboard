$(document).ready(function() {
    // 碳排放趨勢圖
    var trendCtx = document.getElementById('carbonTrendChart').getContext('2d');
    var trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: ['5/1', '5/2', '5/3', '5/4', '5/5', '5/6', '5/7'],
            datasets: [{
                label: '碳排放量',
                type: 'bar',
                data: [2.8, 2.6, 2.5, 2.7, 2.4, 2.3, 2.4],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                yAxisID: 'y-axis-1'
            }, {
                label: '趨勢線',
                type: 'line',
                data: [2.8, 2.6, 2.5, 2.7, 2.4, 2.3, 2.4],
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
                        labelString: '碳排放量 (噸)'
                    }
                }]
            }
        }
    });

    // 碳排放熱點分析
    var hotspotCtx = document.getElementById('carbonHotspotChart').getContext('2d');
    var hotspotChart = new Chart(hotspotCtx, {
        type: 'doughnut',
        data: {
            labels: ['製程A', '製程B', '製程C', '其他'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                position: 'right'
            }
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

    // 時間範圍切換
    $('input[name="timeRange"]').change(function() {
        var range = $(this).val();
        // 這裡可以添加AJAX調用來獲取不同時間範圍的數據
        console.log('Changing time range to: ' + range + ' days');
    });

    // 自動更新功能
    function updateData() {
        // 這裡可以添加AJAX調用來獲取最新數據
        console.log('Updating data...');
    }

    // 每分鐘更新一次
    setInterval(updateData, 60000);
});

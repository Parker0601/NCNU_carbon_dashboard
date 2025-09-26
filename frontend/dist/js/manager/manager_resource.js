$(document).ready(function() {
    // 初始化圓形進度條
    $('.js-easy-pie-chart').each(function() {
        var $this = $(this);
        var barColor = $this.data('percent') >= 70 ? '#1dc9b7' : '#fd3995';
        
        $this.easyPieChart({
            barColor: barColor,
            trackColor: '#eee',
            scaleColor: false,
            lineCap: 'butt',
            lineWidth: 20,
            size: 250,
            animate: 1500,
            onStep: function(from, to, percent) {
                $(this.el).find('span.display-3').text(Math.round(percent) + '%');
            }
        });
    });

    // 初始化效率趨勢圖
    var ctx = document.getElementById('efficiencyTrendChart').getContext('2d');
    var efficiencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
            datasets: [{
                label: '機台一效率',
                data: [52, 54, 53, 55, 56, 54, 55, 55],
                borderColor: '#fd3995',
                fill: false
            }, {
                label: '機台二效率',
                data: [78, 79, 80, 81, 80, 79, 80, 80],
                borderColor: '#1dc9b7',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        max: 100
                    },
                    scaleLabel: {
                        display: true,
                        labelString: '效率 (%)'
                    }
                }]
            }
        }
    });

    // 自動更新功能
    function updateData() {
        // 這裡可以添加AJAX調用來獲取最新數據
        console.log('Updating efficiency data...');
    }

    // 每5分鐘更新一次
    setInterval(updateData, 300000);
});
$(document).ready(function() {
    var ctx = document.getElementById('financeChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['資產負債率', '銷售淨利率', '毛利率', '主營業務利潤率'],
        datasets: [{
          label: '比率(%)',
          data: [47.34, 63.98, 74.29, 73.81],
          backgroundColor: ['#2196f3', '#fd3995', '#ffc241', '#4caf50']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            barPercentage: 0.5,        // 柱子佔每個 category 的 50%
            categoryPercentage: 0.5,   // category 佔整個軸的 50%
            maxBarThickness: 40,       // 最粗不超過 40px
            gridLines: { display: false }
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true,
              max: 100
            }
          }]
        }
      }
    });
  });
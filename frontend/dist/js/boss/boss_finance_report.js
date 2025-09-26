$(document).ready(function() {
    // 等待所有資源加載完成後再初始化圖表
    $(window).on('load', function() {
      initializeCharts();
    });
  
    // 切換標籤頁時重新渲染圖表
    $('a[data-toggle="tab"]').on('shown.bs.tab', function() {
      setTimeout(initializeCharts, 100);
    });
  
    function initializeCharts() {
      // 營運分析柱狀圖
      var opBar = new Chart(document.getElementById('operationBarChart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['存貨周轉率', '應收帳款周轉率', '流動資產周轉率', '固定資產周轉率', '總資產周轉率'],
          datasets: [{
            label: '比率',
            data: [4.23, 5.39, 7.04, 3.92, 2.52],
            backgroundColor: '#4caf50'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 8
            }
          }
        }
      });
  
      // 成本效益圓餅圖
      var costPie = new Chart(document.getElementById('costPieChart').getContext('2d'), {
        type: 'pie',
        data: {
          labels: ['成本費用淨利率', '主營業務利潤率'],
          datasets: [{
            data: [73.81, 79.33],
            backgroundColor: ['#2196f3', '#ffc241']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
  
      // 現金狀況環狀圖
      var cashDoughnut = new Chart(document.getElementById('cashDoughnutChart').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['流動比率', '速動比率', '現金比率'],
          datasets: [{
            data: [6.45, 4.17, 3.51],
            backgroundColor: ['#1dc9b7', '#fd3995', '#ffc241']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
  
      // 速動比率圖
      var speedDoughnut = new Chart(document.getElementById('speedDoughnutChart').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['速動比率', '現金比率'],
          datasets: [{
            data: [4.17, 3.51],
            backgroundColor: ['#1dc9b7', '#fd3995']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
  
      // 現金比率圖
      var cashRatioDoughnut = new Chart(document.getElementById('cashRatioDoughnutChart').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['現金比率', '速動比率'],
          datasets: [{
            data: [3.51, 4.17],
            backgroundColor: ['#1dc9b7', '#fd3995']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
  
      // 發展趨勢折線圖
      var trendLine = new Chart(document.getElementById('trendLineChart').getContext('2d'), {
        type: 'line',
        data: {
          labels: ['營業增長率', '資本積累率', '總資本增長率'],
          datasets: [{
            label: '增長率',
            data: [13.62, 22.32, 26.51],
            borderColor: '#fd3995',
            backgroundColor: 'rgba(253,57,149,0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
  
      // 盈利分析柱狀圖
      var profitBar = new Chart(document.getElementById('profitBarChart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['資本報酬率', '淨資本報酬率'],
          datasets: [
            {label:'期初', data:[1.58, 1.03], backgroundColor:'#2196f3'},
            {label:'期末', data:[1.81, 1.18], backgroundColor:'#fd3995'}
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  });
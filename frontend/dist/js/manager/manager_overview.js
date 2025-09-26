$(document).ready(function() {
    // KPI 趨勢圖
    var ctx = document.getElementById('kpiTrendChart').getContext('2d');
    var kpiTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        datasets: [{
          label: 'KPI 達成率',
          data: [85, 88, 92, 90, 95, 93, 96, 98, 97, 99, 100, 102],
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '達成率 (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: '月份'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y + '%';
              }
            }
          }
        }
      }
    });
  
    // 圓餅圖
    var pieCtx = document.getElementById('pieChart').getContext('2d');
    var pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['直接排放', '間接排放', '其他排放'],
        datasets: [{
          data: [45, 35, 20],
          backgroundColor: ['#fd3995', '#1dc9b7', '#ffc241']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: { 
          position: 'bottom',
          labels: {
            padding: 20
          }
        },
        title: {
          display: true,
          text: '碳排放來源分布'
        }
      }
    });
  
    // 折線圖
    var trendCtx = document.getElementById('trendChart').getContext('2d');
    var trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        datasets: [{
          label: '碳排放量 (kgCO2e)',
          data: [1200, 1100, 1050, 980, 950, 900],
          borderColor: '#fd3995',
          backgroundColor: 'rgba(253,57,149,0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        title: {
          display: true,
          text: '碳排放趨勢'
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: false
            }
          }]
        }
      }
    });
  
    // ===== 即時異常通知彈窗邏輯 =====
    // 使用 sessionStorage，這樣每次重新登入都會重置
    var hasAlert = sessionStorage.getItem('manager_overview_alert') !== 'hidden';
    
    // 每次頁面加載時顯示通知
    if (!sessionStorage.getItem('manager_overview_alert')) {
      $('#alert-toast').fadeIn();
    }
  
    // 點擊彈窗跳轉到即時異常監控，並隱藏彈窗
    $('#alert-toast').on('click', function(e) {
      if (!$(e.target).hasClass('close')) {
        sessionStorage.setItem('manager_overview_alert', 'hidden');
        window.location.href = 'manager_monitor.html';
      }
    });
  
    // 點擊關閉按鈕只隱藏彈窗
    $('#alert-toast .close').on('click', function(e) {
      e.stopPropagation();
      $('#alert-toast').fadeOut();
      sessionStorage.setItem('manager_overview_alert', 'hidden');
    });
  
    // 初始化面板工具
    $('.panel').each(function() {
      var $panel = $(this);
      
      // 全螢幕功能
      $panel.find('[data-action="panel-fullscreen"]').on('click', function() {
        $panel.toggleClass('panel-fullscreen');
        $(this).find('i').toggleClass('fa-expand fa-compress');
      });
    });
  });
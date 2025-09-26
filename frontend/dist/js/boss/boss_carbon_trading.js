$(document).ready(function() {
    // 碳價格走勢圖
    var ctx = document.getElementById('carbonPriceChart').getContext('2d');
    var carbonPriceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['2024-05-01', '2024-05-08', '2024-05-15', '2024-05-22', '2024-05-29', '2024-06-05'],
        datasets: [{
          label: '碳價格 (NT$)',
          data: [1100, 1150, 1200, 1180, 1220, 1250],
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  
    // 權限控制（僅顯示有權限者操作按鈕）
    // 這裡可根據API回傳的權限動態顯示/隱藏按鈕
  
    // 上單表單送出（預留API串接）
    $('#orderForm').on('submit', function(e) {
      e.preventDefault();
      // 這裡可串接API送出訂單
      alert('訂單已送出（僅示意，請串接API）');
    });
  });
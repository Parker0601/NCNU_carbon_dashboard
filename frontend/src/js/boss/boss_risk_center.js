$(function () {

    /* === 1. Modal 打開時，把卡片上的 data-* 塞進去 ================= */
    $('#riskDetailModal').on('show.bs.modal', function (evt) {
      const $card  = $(evt.relatedTarget);   // 觸發的那張小卡
      const $modal = $(this);
  
      // 文字欄位
      $modal.find('#risk-equip-name').text($card.data('equip-name') || '');
      $modal.find('#risk-equip-code').text($card.data('equip-code') || '');
      $modal.find('#risk-level')     .text($card.data('level')      || '');
      $modal.find('#risk-owner')     .text($card.data('owner')      || '');
      $modal.find('#risk-site')      .text($card.data('site')       || '');
      $modal.find('#risk-time')      .text($card.data('time')       || '');
      $modal.find('#risk-trigger')   .text($card.data('trigger')    || '');
  
      // 陣列：危害因素
      const hazards = $card.data('hazard') || [];
      const $hazardOl = $modal.find('#risk-hazard').empty();
      (Array.isArray(hazards) ? hazards : JSON.parse(hazards))
        .forEach(t => $hazardOl.append(`<li>${t}</li>`));
  
      // 陣列：安全措施
      const measures = $card.data('measure') || [];
      const $measureOl = $modal.find('#risk-measure').empty();
      (Array.isArray(measures) ? measures : JSON.parse(measures))
        .forEach(t => $measureOl.append(`<li>${t}</li>`));
  
      /* === 2. 建立或更新營利走勢圖 ================================ */
      const ctx  = document.getElementById('riskProfitChart').getContext('2d');
      if (window.profitChart) window.profitChart.destroy();  // 若已存在先銷毀
      window.profitChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['修正前', '修正後'],
          datasets: [{
            label:'預測營利', data:[-200, 100],
            borderColor:'#fd3995', backgroundColor:'rgba(253,57,149,.1)',
            fill:true, tension:.4
          }]
        },
        options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
      });
    });
  
  });
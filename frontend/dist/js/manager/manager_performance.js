$(document).ready(function() {
    // 初始化日期選擇器
    $('#period-select').daterangepicker({
        singleDatePicker: true,
        showDropdowns: true,
        locale: {
            format: 'YYYY-MM'
        }
    });

    // KPI 趨勢圖
    var ctx = document.getElementById('kpiTrendChart').getContext('2d');
    var kpiTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: [{
                label: 'KPI 達成率',
                data: [85, 88, 92, 90, 95, 93, 96, 98, 97, 99, 100, 96],
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

    // 保存KPI設定
    $('#saveKpiSettings').click(function() {
        Swal.fire({
            title: '確認保存',
            text: '確定要保存KPI目標設定嗎？',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '確定',
            cancelButtonText: '取消'
        }).then((result) => {
            if (result.isConfirmed) {
                // 這裡可以添加AJAX調用來保存設定
                Swal.fire(
                    '已保存!',
                    'KPI目標設定已更新',
                    'success'
                );
            }
        });
    });

    // 篩選條件變更時更新圖表
    $('#department-select, #kpi-type').change(function() {
        updateKpiData();
    });

    // 更新KPI數據
    function updateKpiData() {
        var department = $('#department-select').val();
        var kpiType = $('#kpi-type').val();
        // 這裡可以添加AJAX調用來獲取篩選後的數據
        console.log('Updating KPI data...', department, kpiType);
    }
});

// 顯示KPI詳情
function showKpiDetail(department, kpiType) {
    Swal.fire({
        title: 'KPI詳細資訊',
        html: `
            <div class="text-left">
                <p><strong>部門：</strong>${department}</p>
                <p><strong>指標：</strong>${kpiType}</p>
                <p><strong>歷史趨勢：</strong></p>
                <canvas id="detailChart" style="width:100%; height:200px;"></canvas>
            </div>
        `,
        width: 600,
        showCloseButton: true,
        showConfirmButton: false
    });

    // 初始化詳情圖表
    var detailCtx = document.getElementById('detailChart').getContext('2d');
    var detailChart = new Chart(detailCtx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月'],
            datasets: [{
                label: '實際值',
                data: [88, 90, 92, 91, 92],
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// 編輯KPI備註
function editKpiNote(department, kpiType) {
    Swal.fire({
        title: '編輯KPI備註',
        input: 'textarea',
        inputLabel: '備註內容',
        inputPlaceholder: '請輸入備註...',
        showCancelButton: true,
        confirmButtonText: '保存',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            // 這裡可以添加AJAX調用來保存備註
            console.log('Saving note...', result.value);
        }
    });
}
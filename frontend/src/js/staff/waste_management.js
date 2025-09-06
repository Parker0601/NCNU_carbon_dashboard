    // 初始化圖表
    let wasteChart = c3.generate({
        bindto: '#waste-trend-chart',
        data: {
            x: 'x',
            columns: [
                ['x'],
                ['廢料量(kg)']
            ],
            type: 'line'
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: '%m-%d'
                }
            },
            y: {
                label: {
                    text: '重量 (kg)',
                    position: 'outer-middle'
                }
            }
        },
        grid: {
            y: {
                show: true
            }
        }
    });

    // 獲取本週廢料處理數據
    function fetchWeeklyWasteData() {
        // TODO: 換成實際API
        return Promise.resolve([
            { date: '2024-06-10', weight: 15.5, type: '廚餘' },
            { date: '2024-06-11', weight: 12.3, type: '農業廢料' },
            { date: '2024-06-12', weight: 18.7, type: '園藝廢料' }
        ]);
    }

    // 更新圖表
    function updateChart(data) {
        const dates = ['x'];
        const weights = ['廢料量(kg)'];
        
        data.forEach(item => {
            dates.push(item.date);
            weights.push(item.weight);
        });

        wasteChart.load({
            columns: [dates, weights]
        });
    }

    // 提交表單
    $('#waste-form').on('submit', function(e) {
        e.preventDefault();
        
        const wasteData = {
            type: $('#waste-type').val(),
            weight: parseFloat($('#waste-weight').val()),
            date: $('#process-date').val()
        };

        // TODO: 換成實際API
        console.log('提交廢料數據:', wasteData);
        
        Swal.fire({
            title: '提交成功',
            text: '廢料處理記錄已保存',
            icon: 'success',
            confirmButtonText: '確定'
        }).then(() => {
            // 重置表單
            $('#waste-form')[0].reset();
            // 刷新圖表
            fetchWeeklyWasteData().then(updateChart);
        });
    });

    // 初始化頁面
    $(document).ready(function() {
        // 設置日期選擇器默認為今天
        $('#process-date').val(new Date().toISOString().split('T')[0]);
        
        // 獲取並顯示本週數據
        fetchWeeklyWasteData().then(updateChart);
    });
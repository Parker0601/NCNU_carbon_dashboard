$(document).ready(function() {
    // 初始化DataTables
    var staffTable = $('#dt-staff-tasks').dataTable({
        responsive: true,
        dom: "<'row mb-3'<'col-sm-12 col-md-6 d-flex align-items-center justify-content-start'f><'col-sm-12 col-md-6 d-flex align-items-center justify-content-end'B>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
        buttons: [
            {
                extend: 'colvis',
                text: '欄位顯示',
                titleAttr: '欄位顯示',
                className: 'btn-outline-default'
            }
        ]
    });

    // 處理狀態變更
    $('.status-select').on('change', function() {
        var newStatus = $(this).val();
        var $row = $(this).closest('tr');
        var $assignButton = $row.find('.btn-assign-task');

        if (newStatus === 'busy' || newStatus === 'break') {
            $assignButton.prop('disabled', true);
        } else {
            $assignButton.prop('disabled', false);
        }

        // 這裡可以添加AJAX呼叫來更新後端資料
    });

    // 處理任務指派
    $('.btn-assign').on('click', function() {
        var alertId = $(this).data('alert-id');
        var severity = $(this).data('severity');

        // 顯示指派對話框
        Swal.fire({
            title: '指派任務',
            html: '選擇要指派的人員：<select id="staff-select" class="form-control mt-2">' +
                  '<option value="">請選擇...</option>' +
                  '<option value="1">Jerry Wang</option>' +
                  '<option value="2">Mary Chen</option>' +
                  '</select>',
            showCancelButton: true,
            confirmButtonText: '確認指派',
            cancelButtonText: '取消',
            preConfirm: () => {
                return document.getElementById('staff-select').value;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                // 這裡可以添加AJAX呼叫來更新後端資料
                Swal.fire(
                    '已指派!',
                    '任務已成功指派給選定人員',
                    'success'
                );
            }
        });
    });

    // 自動更新功能
    function updateAlerts() {
        // 這裡可以添加AJAX呼叫來獲取最新的異常資料
        console.log('Updating alerts...');
    }

});
$(document).ready(function() {
    // 检查用户角色权限
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'manager') {
        alert('您没有权限访问此页面');
        window.location.href = 'page_login.html';
    }
    
    // 初始化数据表格
    $('#dt-basic-example').dataTable({
        responsive: true,
        lengthChange: false,
        dom: "<'row mb-3'<'col-sm-12 col-md-6 d-flex align-items-center justify-content-start'f><'col-sm-12 col-md-6 d-flex align-items-center justify-content-end'B>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
        buttons: [
            {
                extend: 'colvis',
                text: '列显示',
                titleAttr: '切换列显示',
                className: 'btn-outline-default'
            },
            {
                extend: 'csvHtml5',
                text: '导出CSV',
                titleAttr: '导出CSV格式',
                className: 'btn-outline-default'
            },
            {
                extend: 'print',
                text: '<i class="fal fa-print"></i>',
                titleAttr: '打印',
                className: 'btn-outline-default'
            }
        ],
        language: {
            "sProcessing": "处理中...",
            "sLengthMenu": "显示 _MENU_ 项结果",
            "sZeroRecords": "没有匹配结果",
            "sInfo": "显示第 _START_ 至 _END_ 项结果，共 _TOTAL_ 项",
            "sInfoEmpty": "显示第 0 至 0 项结果，共 0 项",
            "sInfoFiltered": "(由 _MAX_ 项结果过滤)",
            "sInfoPostFix": "",
            "sSearch": "搜索:",
            "sUrl": "",
            "sEmptyTable": "表中数据为空",
            "sLoadingRecords": "载入中...",
            "sInfoThousands": ",",
            "oPaginate": {
                "sFirst": "首页",
                "sPrevious": "上页",
                "sNext": "下页",
                "sLast": "末页"
            }
        }
    });
});
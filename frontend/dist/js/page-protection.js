// ==============================
// page-protection.js (頁面保護腳本)
// ==============================

(function () {
  // 等待API helper載入
  function waitForAPI() {
    return new Promise((resolve) => {
      if (window.API) {
        resolve();
      } else {
        setTimeout(() => waitForAPI().then(resolve), 100);
      }
    });
  }

  // 檢查當前頁面是否需要保護
  function needsProtection() {
    const currentPath = window.location.pathname;
    const protectedPages = [
      '/staff_dashboard.html',
      '/manager_dashboard.html', 
      '/boss_dashboard.html',
      '/staff_device.html',
      '/staff_energy.html',
      '/staff_issue.html',
      '/staff_schedule.html',
      '/manager_check_schedule.html',
      '/manager_monitor.html',
      '/manager_performance.html',
      '/manager_resource.html',
      '/manager_overview.html',
      '/boss_carbon_trading.html',
      '/boss_compliance_tracking.html',
      '/boss_finance_report.html',
      '/boss_risk_center.html',
      '/waste_management.html'
    ];
    
    return protectedPages.some(page => currentPath.includes(page));
  }

  // 根據角色重定向到正確頁面
  function redirectByRole(role) {
    const rolePages = {
      '1': '/staff_dashboard.html',      // 員工
      '2': '/manager_dashboard.html',    // 主管
      '3': '/boss_dashboard.html'        // 老闆
    };
    
    const targetPage = rolePages[role];
    if (targetPage && !window.location.pathname.includes(targetPage)) {
      window.location.href = targetPage;
    }
  }

  // 主要保護邏輯
  async function protectPage() {
    if (!needsProtection()) {
      return; // 不需要保護的頁面
    }

    await waitForAPI();

    // 檢查是否已登入
    if (!window.API.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/page_login.html';
      return;
    }

    try {
      // 獲取用戶信息
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // 檢查角色權限
      const currentPath = window.location.pathname;
      const userRole = userData.role;

      // 角色權限檢查
      if (currentPath.includes('boss_') && userRole !== '3') {
        redirectByRole(userRole);
        return;
      }
      
      if (currentPath.includes('manager_') && !['2', '3'].includes(userRole)) {
        redirectByRole(userRole);
        return;
      }

      if (currentPath.includes('staff_') && !['1', '2', '3'].includes(userRole)) {
        redirectByRole(userRole);
        return;
      }

      console.log('Page access granted for role:', userRole);
      
    } catch (error) {
      console.error('Authentication check failed:', error);
      window.location.href = '/page_login.html';
    }
  }

  // 頁面載入時執行保護
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', protectPage);
  } else {
    protectPage();
  }
})();

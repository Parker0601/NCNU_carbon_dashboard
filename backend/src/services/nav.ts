type Role = 'boss' | 'manager' | 'employee';

interface NavItem {
  href: string;
  text: string;
  pagename?: string;     // 用於前端高亮（可選）
  children?: NavItem[];
}

const NAV: Record<Role, NavItem[]> = {
  boss: [
    { href: 'boss_dashboard.html', text: '總覽畫面', pagename: 'boss_dashboard' },
    { href: 'boss_carbon_trading.html', text: '碳信用交易', pagename: 'boss_carbon_trading' },
    { href: 'boss_finance_report.html', text: '财务绩效报表', pagename: 'boss_finance_report' },
    { href: 'boss_compliance_tracking.html', text: '合規與驗證追蹤', pagename: 'boss_compliance_tracking' },
    { href: 'boss_risk_center.html', text: '風險中心', pagename: 'boss_risk_center' },
    { href: 'boss_staff_promotion.html', text: '員工升級管理', pagename: 'boss_employee_promotion' }, // 修正一致性
  ],
  manager: [
    { href: 'manager_overview.html', text: '總覽', pagename: 'manager_overview' },
    { href: 'manager_monitor.html', text: '即時異常監控', pagename: 'manager_monitor' },
    { href: 'manager_check_schedule.html', text: '排程管理', pagename: 'manager_schedule' },
    { href: 'manager_carbon.html', text: '碳排放概況', pagename: 'manager_carbon' },
    { href: 'manager_performance.html', text: '部門績效', pagename: 'manager_performance' },
    { href: 'manager_resource.html', text: '資源使用監測', pagename: 'manager_resource' },
  ],
  employee: [
    { href: 'staff_device.html', text: '設備管理', pagename: 'staff_device' },
    { href: 'staff_issue.html', text: '問題回報', pagename: 'staff_issue' },
    { href: 'staff_energy.html', text: '能源管理', pagename: 'staff_energy' },
    { href: 'staff_schedule.html', text: '排程管理', pagename: 'staff_schedule' },
    { href: 'waste_management.html', text: '廢棄物管理', pagename: 'waste_management' }
  ],
};

export function renderNavHtml(role: Role): string {
  const items = NAV[role] ?? [];
  const title =
    role === 'boss' ? '老闆儀表盤' :
    role === 'manager' ? '主管專區' : '員工專區';

  const lis = items.map(i => {
    const hasChildren = !!(i.children && i.children.length);
    if (!hasChildren) {
      // 無子選單：正常連結
      return `
        <li>
          <a href="${i.href}" title="${i.text}">
            <span class="nav-link-text">${i.text}</span>
          </a>
        </li>`;
    }

    // 有子選單：預設收合（不加入 open），子 <ul> 直接 display:none
    const childLis = i.children!.map(c => `
      <li>
        <a href="${c.href}" title="${c.text}">
          <span class="nav-link-text">${c.text}</span>
        </a>
      </li>`).join('');

    return `
      <li class="role-group">
        <a href="#" class="role-group-toggle" aria-expanded="false" title="${i.text}">
          <span class="nav-link-text">${i.text}</span>
          <b class="collapse-sign"><em class="fal fa-angle-down"></em></b>
        </a>
        <ul style="display:none">${childLis}</ul>
      </li>`;
  }).join('');

  return `
    <li class="nav-title role-based-title">${title}</li>
    ${lis}
  `.trim();
}

type Role = 'boss' | 'manager' | 'employee';

interface NavItem {
  href?: string;                // ✅ 可選 (因為小標題不需要)
  text: string;
  pagename?: string;
  isSectionTitle?: boolean;     // ✅ 標記是否為小標題
  children?: NavItem[];
}

const NAV: Record<Role, NavItem[]> = {
  boss: [
    { href: 'boss_dashboard.html', text: '總覽畫面', pagename: 'boss_dashboard' },
    { text: '員工管理', isSectionTitle: true },
    { href: 'boss_upgrade.html', text: '員工升級管理', pagename: 'boss_upgrade' },
    { text: '碳策略與財務', isSectionTitle: true },
    { href: 'boss_carbon_trading.html', text: '碳信用交易', pagename: 'boss_carbon_trading' },
    { href: 'boss_finance_report.html', text: '財務績效報表', pagename: 'boss_finance_report' },
    { text: '合規風險', isSectionTitle: true },
    { href: 'boss_compliance_tracking.html', text: '合規與驗證追蹤', pagename: 'boss_compliance_tracking' },
    { href: 'boss_risk_center.html', text: '風險中心', pagename: 'boss_risk_center' },
  ],

  manager: [
    { href: 'manager_overview.html', text: '總覽', pagename: 'manager_overview' },
    { text: '設備監控與任務管理', isSectionTitle: true },
    { href: 'manager_monitor.html', text: '即時異常監控', pagename: 'manager_monitor' },
    { href: 'manager_resource.html', text: '資源使用監測', pagename: 'manager_resource' },
    { href: 'manager_check_schedule.html', text: '排程管理', pagename: 'manager_schedule' },
    { text: '碳排廢棄物管理', isSectionTitle: true },
    { href: 'scrap_overview.html', text: '廢料管理總覽', pagename: 'manager_scrap_overview'},
    { href: 'manager_carbon.html', text: '碳排放概況', pagename: 'manager_carbon' },
    { text: '其他', isSectionTitle: true },
    { href: 'manager_performance.html', text: '部門績效', pagename: 'manager_performance' },
  ],

  employee: [
    { text: '任務與回報', isSectionTitle: true },
    { href: 'staff_issue.html', text: '問題回報', pagename: 'staff_issue' },
    { href: 'staff_schedule.html', text: '排程管理', pagename: 'staff_schedule' },

    { text: '設備與能源', isSectionTitle: true },
    { href: 'staff_device.html', text: '設備管理', pagename: 'staff_device' },
    { href: 'staff_energy.html', text: '能源管理', pagename: 'staff_energy' },

    { text: '廢棄處理', isSectionTitle: true },
    { href: 'waste_management.html', text: '廢棄物管理', pagename: 'waste_management' },
  ],
};

export function renderNavHtml(role: Role): string {
  const items = NAV[role] ?? [];

  const lis = items.map(i => {
    // ✅ 小標題渲染
    if (i.isSectionTitle) {
      return `
        <li class="nav-section-title">
          <span>${i.text}</span>
        </li>`;
    }

    // ✅ 無子選單：普通連結
    const hasChildren = !!(i.children && i.children.length);
    if (!hasChildren) {
      return `
        <li>
          <a href="${i.href!}" title="${i.text}">
            <span class="nav-link-text">${i.text}</span>
          </a>
        </li>`;
    }

    // ✅ 有子選單：側開展格式
    const childLis = i.children!.map(c => `
      <li>
        <a href="${c.href!}" title="${c.text}">
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
    ${lis}
  `.trim();
}
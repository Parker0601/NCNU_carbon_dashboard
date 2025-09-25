// boss_upgrade.js
//
// 功能概述：
// - 提供「員工升級管理」頁面的前端互動邏輯。
// - 綁定升級按鈕點擊事件，採用與 reset_password.js 一致的寫法與通訊風格。
// - 送出用戶ID和新角色至後端 /auth/upgrade/:userId。
// - 顯示升級成功或失敗訊息，並更新頁面狀態。
//
// 使用方式：
// - 在 boss_upgrade.hbs 中載入此檔案（scripts-block 指向 js/boss/boss_upgrade.js）。
// - 頁面需包含以下元素並對應 ID：
//   #js-upgrade-alert（提示容器）、.btn-upgrade（升級按鈕）、.btn-approve/.btn-reject（審核按鈕）。
//
// 注意事項：
// - 與 reset_password.js 一致，這裡使用 API_BASE 常數。如果後端部署位置改變，請一併調整。
// - 需要有效的 JWT token 才能執行升級操作。

console.log('boss_upgrade.js loaded');

(function () {
	// 與 reset_password.js 一致的 API_BASE（開發預設為本機 3000 端口的 /api）
	const API_BASE = 'http://localhost:3000/api';

	// 全域變數存儲員工數據
	let employeeData = { employees: [] };
	// let reviewData = { reviews: [] }; // 已註解，不需要審核功能

	// 等待 DOM 載入完成後再執行
	document.addEventListener("DOMContentLoaded", () => {
		// 1) 把 [[ ]] 換回 {{ }}，避免外層 HBS 吃掉模板
		const getTpl = (id) =>
			document.getElementById(id).innerHTML
				.replace(/\[\[/g, "{{")
				.replace(/\]\]/g, "}}");

		// 2) 編譯 Handlebars 模板
		const employeeTemplate = Handlebars.compile(getTpl("employee-template"));
		// const reviewTemplate = Handlebars.compile(getTpl("review-template")); // 已註解，不需要審核功能

		// 3) 載入員工數據
		loadEmployeeData();

		// 4) 搜尋功能（只過濾員工列表）
		document.getElementById("searchInput").addEventListener("input", function (e) {
			const kw = e.target.value.toLowerCase();
			const filteredEmployees = {
				employees: employeeData.employees.filter(emp =>
					String(emp.name).toLowerCase().includes(kw)
				)
			};
			document.getElementById("employeeList").innerHTML = employeeTemplate(filteredEmployees);
			// 審核列表已註解，不需要過濾
		});

		// 5) 按鈕事件處理 - 只處理升級按鈕
		document.addEventListener("click", function (e) {
			if (e.target.classList.contains("btn-upgrade")) {
				onUpgradeClick(e);
			}
			// 審核按鈕已註解，不需要處理
			// } else if (e.target.classList.contains("btn-approve")) {
			// 	onApproveClick(e);
			// } else if (e.target.classList.contains("btn-reject")) {
			// 	onRejectClick(e);
			// }
		});
	});

	// 載入員工數據
	async function loadEmployeeData() {
		console.log('開始載入員工數據...');
		try {
			// 獲取 JWT token
			const token = localStorage.getItem('token') || getCookie('token');
			console.log('Token:', token ? '已找到' : '未找到');
			
			if (!token) {
				console.log('沒有找到 token，顯示登入提示');
				showAlert('請先登入', 'danger');
				return;
			}

			// 呼叫後端 API 獲取員工列表
			console.log('呼叫 API:', `${API_BASE}/auth/employees`);
			const response = await fetch(`${API_BASE}/auth/employees`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			console.log('API 回應狀態:', response.status, response.statusText);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			console.log('API 回應數據:', result);
			
			if (result.success) {
				console.log('API 成功，開始處理數據...');
				// 轉換後端數據格式為前端需要的格式
				employeeData.employees = result.data.map(emp => ({
					id: emp.id.toString(),
					name: emp.name,
					position: getRoleDisplayName(emp.role)
				}));

				console.log('轉換後的員工數據:', employeeData.employees);

				// 審核列表已註解，不需要處理審核數據
				// reviewData.reviews = employeeData.employees.map(emp => ({
				// 	id: emp.id,
				// 	name: emp.name,
				// 	position: emp.position
				// }));
				// console.log('審核數據:', reviewData.reviews);

				// 渲染表格
				console.log('開始渲染表格...');
				renderTables();
				console.log('表格渲染完成');
			} else {
				throw new Error(result.message || '獲取員工數據失敗');
			}
		} catch (error) {
			console.error('載入員工數據錯誤:', error);
			showAlert('載入員工數據失敗：' + error.message, 'danger');
			
			// 顯示空數據
			employeeData.employees = [];
			// reviewData.reviews = []; // 已註解，不需要審核數據
			renderTables();
		}
	}

	// 將角色代碼轉換為顯示名稱
	function getRoleDisplayName(role) {
		switch (role) {
			case '1': return '員工';
			case '2': return '主管';
			case '3': return '老闆';
			default: return '未知';
		}
	}

	// 升級按鈕點擊處理：負責基本驗證、按鈕狀態切換、呼叫 API、顯示結果
	async function onUpgradeClick(event) {
		event.preventDefault();

		const userId = event.target.dataset.id;
		const userName = event.target.dataset.name;
		const newRole = event.target.dataset.role;

		if (!userId || !newRole) {
			showAlert('升級失敗：缺少必要參數', 'danger');
			return;
		}

		// 送出期間禁用按鈕並顯示進度文字，避免重複提交
		const $btn = $(event.target);
		const originalText = $btn.text();
		$btn.prop('disabled', true).text('升級中...');

		// 重置提示框狀態：隱藏並清除前次訊息與樣式
		const $alert = $('#js-upgrade-alert');
		$alert.hide().removeClass('alert-danger alert-success').empty();

		try {
			// 獲取 JWT token（從 localStorage 或 cookie）
			const token = localStorage.getItem('token') || getCookie('token');
			
			if (!token) {
				throw new Error('請先登入');
			}

			// 與 reset_password.js 相同風格：以 API_BASE 組合路徑並送出 JSON
			const response = await fetch(`${API_BASE}/auth/upgrade/${userId}`, {
				method: 'PUT',
				headers: { 
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({ newRole })
			});

			const result = await response.json();

			if (response.ok) {
				// 升級成功
				showAlert(`用戶 ${userName} 已成功升級為主管！`, 'success');
				
				// 重新載入員工數據以獲取最新狀態
				await loadEmployeeData();
			} else {
				// 升級失敗
				showAlert(result.message || '升級失敗，請稍後再試', 'danger');
			}
		} catch (error) {
			console.error('升級錯誤:', error);
			showAlert('升級失敗：' + (error.message || '網路連線錯誤'), 'danger');
		} finally {
			// 恢復按鈕狀態
			$btn.prop('disabled', false).text(originalText);
		}
	}

	// 審核相關函數已註解，老闆可直接升級員工
	// async function onApproveClick(event) {
	// 	event.preventDefault();
	// 	const userId = event.target.dataset.id;
	// 	const userName = event.target.dataset.name;
	// 	
	// 	showAlert(`已核准 ${userName} 的升級申請`, 'success');
	// 	// TODO: 實作審核准的 API 呼叫
	// }

	// async function onRejectClick(event) {
	// 	event.preventDefault();
	// 	const userId = event.target.dataset.id;
	// 	const userName = event.target.dataset.name;
	// 	
	// 	showAlert(`已拒絕 ${userName} 的升級申請`, 'danger');
	// 	// TODO: 實作審核拒絕的 API 呼叫
	// }

	// 顯示提示訊息
	function showAlert(message, type) {
		const $alert = $('#js-upgrade-alert');
		$alert
			.html(message)
			.removeClass('alert-danger alert-success')
			.addClass(`alert-${type}`)
			.show();

		// 3秒後自動隱藏成功訊息
		if (type === 'success') {
			setTimeout(() => {
				$alert.hide();
			}, 3000);
		}
	}


	// 重新渲染表格
	function renderTables() {
		console.log('renderTables 開始執行');
		console.log('employeeData:', employeeData);
		// console.log('reviewData:', reviewData); // 已註解，不需要審核數據
		
		const getTpl = (id) =>
			document.getElementById(id).innerHTML
				.replace(/\[\[/g, "{{")
				.replace(/\]\]/g, "}}");

		console.log('編譯模板...');
		const employeeTemplate = Handlebars.compile(getTpl("employee-template"));
		// const reviewTemplate = Handlebars.compile(getTpl("review-template")); // 已註解，不需要審核模板

		console.log('渲染員工列表...');
		const employeeHtml = employeeTemplate(employeeData);
		console.log('員工列表 HTML:', employeeHtml);
		document.getElementById("employeeList").innerHTML = employeeHtml;
		
		// 審核列表已註解，不需要渲染
		// console.log('渲染審核列表...');
		// const reviewHtml = reviewTemplate(reviewData);
		// console.log('審核列表 HTML:', reviewHtml);
		// document.getElementById("reviewList").innerHTML = reviewHtml;
		
		console.log('renderTables 執行完成');
	}

	// 獲取 Cookie 的輔助函數
	function getCookie(name) {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
		return null;
	}
})();
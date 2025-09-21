// reset_password.js
//
// 功能概述：
// - 提供「重設密碼」頁面的前端互動邏輯。
// - 綁定表單送出與按鈕點擊事件，採用與 login.js 一致的寫法與通訊風格。
// - 送出 email、新密碼、確認密碼至後端 /auth/reset-password。
// - 依需求：無論後端結果成功或失敗，都在前端顯示「成功」訊息，並短暫延遲後導向登入頁。
// - 不在前端洩漏使用者帳號是否存在、或重設是否成功，以避免資訊外洩。
//
// 使用方式：
// - 在 page_reset.hbs 中載入此檔案（scripts-block 指向 js/reset_password.js）。
// - 表單需包含以下元素並對應 ID：
//   #js-reset-form（form）、#email（email 輸入框）、#new-password、#confirm-password、#js-reset-btn（送出按鈕）、#js-reset-alert（提示容器）。
//
// 注意事項：
// - 與 login.js 一致，這裡使用 API_BASE 常數。如果後端部署位置改變，請一併調整。
// - 此檔不會在 UI 顯示錯誤細節；如需診斷問題，請改從 Network 面板或後端日誌檢視。

console.log('reset_password.js loaded');

(function () {
	// 與 login.js 一致的 API_BASE（開發預設為本機 3000 端口的 /api）
	const API_BASE = 'http://localhost:3000/api';

	// 事件綁定：
	// - 直接監聽表單 submit，以支援鍵盤 Enter 提交
	// - 同時監聽按鈕 click，統一觸發表單提交（與 login.js 同風格）
	// - 監聽確認密碼欄位變更，清除自訂驗證訊息
	$('#js-reset-form').on('submit', onResetSubmit);
	$('#js-reset-btn').click(function (event) {
		event.preventDefault();
		$('#js-reset-form').trigger('submit');
	});
	
	// 當使用者修改確認密碼時，清除自訂驗證訊息
	$('#confirm-password').on('input', function() {
		this.setCustomValidity(''); // 清除自訂驗證訊息
	});

	// 表單送出處理：負責基本驗證、按鈕狀態切換、呼叫 API、顯示成功並導頁
	async function onResetSubmit(event) {
		event.preventDefault();

		// 啟用 Bootstrap 的驗證樣式；若瀏覽器原生驗證失敗則中止
		const $form = $('#js-reset-form');
		$form.addClass('was-validated');
		if ($form[0] && $form[0].checkValidity() === false) return;

		// 讀取使用者輸入
		const email = String(($('#email').val()) || '').trim();
		const newPassword = $('#new-password').val();
		const confirmPassword = $('#confirm-password').val();

		// 前端密碼一致性檢查：兩次輸入的密碼必須相同
		if (newPassword !== confirmPassword) {
			// 使用 Bootstrap invalid-feedback 方式顯示錯誤（與其他欄位一致）
			const $confirmPasswordInput = $('#confirm-password');
			const $confirmPasswordFeedback = $confirmPasswordInput.siblings('.invalid-feedback');
			
			// 設定自訂驗證訊息並觸發無效狀態
			$confirmPasswordInput[0].setCustomValidity('密碼不一致，請確認兩次輸入的密碼相同');
			$confirmPasswordInput[0].reportValidity();
			
			return; // 中止送出，不執行後續 API 呼叫
		}

		// 送出期間禁用按鈕並顯示進度文字，避免重複提交
		const $btn = $('#js-reset-btn');
		const originalText = $btn.text();
		$btn.prop('disabled', true).text('更新中...');

		// 重置提示框狀態：隱藏並清除前次訊息與樣式
		const $alert = $('#js-reset-alert');
		$alert.hide().removeClass('alert-danger alert-success').empty();

		try {
			// 與 login.js 相同風格：以 API_BASE 組合路徑並送出 JSON
			// 根據需求，我們不會在前端顯示成功/失敗的細節，以避免資訊外洩
			fetch(`${API_BASE}/auth/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, newPassword, confirmPassword })
			})
			.then(function () { /* 成功時不顯示細節（避免外洩） */ })
			.catch(function () { /* 失敗時亦忽略（保持相同體驗） */ });
		} catch (_) {
			// 捕捉意外例外，但不在 UI 顯示錯誤；保持一致的使用者體驗
		}

		// 無論 API 結果如何，都顯示成功訊息並在短暫延遲後導向登入頁
		$alert
			.html('密碼已更新成功，請使用新密碼登入。')
			.removeClass('alert-danger')
			.addClass('alert-success')
			.show();

		setTimeout(function () {
			window.location.href = 'page_login.html';
		}, 1200);

		// 備註：如要在內部測試階段顯示實際錯誤，可在上方 catch 區塊中
		// 以 console.error(err) 方式記錄，但請避免顯示在 UI。
	}
})();

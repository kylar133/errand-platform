// 註冊頁 —— client 校驗規則同後端 authService.js 一致
(function () {
  const form = document.getElementById('register-form');
  const fields = {
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    confirm: document.getElementById('confirm'),
    name: document.getElementById('name'),
    phone: document.getElementById('phone'),
  };
  const errBox = document.getElementById('form-error');
  const btn = document.getElementById('btn-submit');

  // 校驗（規則照抄後端，唔啱就喺欄位下面顯示）
  function validate() {
    const errs = {};
    const email = fields.email.value.trim();
    const name = fields.name.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email 格式唔啱';
    const pwd = fields.password.value;
    if (pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
      errs.password = '密碼要最少 8 位，包含英文字母同數字';
    }
    if (fields.confirm.value !== pwd) errs.confirm = '兩次密碼唔一致';
    if (name.length < 2 || name.length > 20) errs.name = '姓名要 2–20 個字';
    if (!/^[456789]\d{7}$/.test(fields.phone.value)) errs.phone = '電話要 8 位數字（香港手機，例：91234567）';
    return errs;
  }

  // 顯示 / 清除欄位錯誤
  function showFieldErrors(errs) {
    for (const [key, el] of Object.entries(fields)) {
      const box = el.closest('.form-group').querySelector('[data-err]');
      box.textContent = errs[key] ?? '';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    const errs = validate();
    showFieldErrors(errs);
    if (Object.keys(errs).length) return;

    btn.disabled = true;
    try {
      await api.post('/auth/register', {
        email: fields.email.value.trim(),
        password: fields.password.value,
        name: fields.name.value.trim(),
        phone: fields.phone.value,
      });
      // 註冊成功 → 後端已自動登入（session cookie 已設）→ 首頁
      markLoggedIn();
      location.href = 'index.html';
    } catch (err) {
      if (err.code === 1004) showFieldErrors({ email: '呢個 Email 已註冊' });
      else if (err.code === -1) toast(err.message, 'error');
      else toast(ERROR_MESSAGES[err.code] ?? '註冊失敗，請稍後再試', 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();

// 登入頁
(function () {
  const form = document.getElementById('login-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const errBox = document.getElementById('form-error');
  const btn = document.getElementById('btn-submit');

  // ?next= 安全檢查：只准相對嘅 .html 路徑。
  // 任何帶「:」嘅值（https://、javascript: 等）一律當非法 → 返 index；
  // login/register 本身亦唔可以做 next（會變 redirect loop）
  function nextUrl() {
    const next = new URLSearchParams(location.search).get('next');
    if (!next || next.includes(':') || next.startsWith('/') || !next.includes('.html') ||
        next.startsWith('login.html') || next.startsWith('register.html')) {
      return 'index.html';
    }
    return next;
  }

  // 已經登入 → 直接入去
  if (isLoggedIn()) {
    location.replace(nextUrl());
    return;
  }

  function showErr(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    if (!email.value.trim() || !password.value) {
      showErr('請填寫 Email 同密碼');
      return;
    }
    btn.disabled = true;
    try {
      // skipAuthRedirect：帳號密碼錯後端都係回 4001，
      // 唔可以自動跳轉（呢度本身就係登入頁，會變死循環）
      await api.post('/auth/login',
        { email: email.value.trim(), password: password.value },
        { skipAuthRedirect: true });
      // 後端已設 session cookie，淨係記個旗標就夠
      markLoggedIn();
      location.href = nextUrl();
    } catch (err) {
      if (err.code === 4001) showErr('帳號或密碼錯誤');
      else if (err.code === -1) showErr(err.message);
      else showErr('登入失敗，請稍後再試');
    } finally {
      btn.disabled = false;
    }
  });
})();

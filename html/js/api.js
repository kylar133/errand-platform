// ============================================================
// 統一 API 請求層 —— 全站唯一知道 API 位址、envelope 結構嘅地方
// 其他 script 只 call api.get / api.post / api.patch，攞到嘅直接就係 body
// 認證用 session cookie（server 設），前端只記一個「已登入」旗標做頁面判斷
// 注意：classic script 嘅全域 function / const，唔可以用 ES modules
// ============================================================

// 同源相對路徑：前端由後端 serve（http://127.0.0.1:3000/），cookie 先會自動跟住走
const API_BASE = '/api';
const LOGIN_KEY = 'loggedIn';

function markLoggedIn() {
  try { localStorage.setItem(LOGIN_KEY, '1'); } catch (e) { /* 隱身模式等，忽略 */ }
}
function clearLoggedIn() {
  try { localStorage.removeItem(LOGIN_KEY); } catch (e) {}
}
function isLoggedIn() {
  try { return localStorage.getItem(LOGIN_KEY) === '1'; } catch (e) { return false; }
}

// 整一個帶 code 嘅 Error，頁面用 err.code 判斷點顯示
function makeErr(code, msg) {
  return Object.assign(new Error(msg), { code });
}

// 4001（未登入 / session 過期）→ 清旗標 → 跳登入頁（帶 ?next= 記住返嚟）
// login.html 自己唔會跳（避免死循環）：嗰頁 call 時要傳 skipAuthRedirect: true
function redirectToLogin() {
  const cur = location.pathname.split('/').pop() + location.search;
  if (cur.startsWith('login')) return;
  location.href = 'login.html?next=' + encodeURIComponent(cur);
}

// 核心 request：
// - query 空值自動唔傳（URLSearchParams）
// - session cookie 自動帶（same-origin），唔使自己加 header
// - 成功唯一標準係 header.code === 0（register 成功係 HTTP 201，唔好睇 status）
// - 失敗 throw { code, message } 嘅 Error
async function apiRequest(method, path, { body, query, skipAuthRedirect = false } = {}) {
  const url = new URL(API_BASE + path, location.href);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch (e) {
    // 後端未起 / 斷網
    throw makeErr(-1, '連唔到伺服器，請確認後端 (http://127.0.0.1:3000) 有冇啟動');
  }

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw makeErr(-2, '伺服器回應格式唔正確');
  }
  if (!json || json.header === undefined) throw makeErr(-2, '伺服器回應格式唔正確');

  if (json.header.code === 0) return json.body;

  if (json.header.code === 4001 && !skipAuthRedirect) {
    clearLoggedIn();
    redirectToLogin();
  }
  throw makeErr(json.header.code, json.header.msg);
}

// 登出：call 後端銷毀 session；無論成功失敗都清旗標
async function logout() {
  try {
    await apiRequest('POST', '/auth/logout');
  } catch (e) {
    // session 可能一早過期，照清旗標
  } finally {
    clearLoggedIn();
  }
}

const api = {
  get: (path, opts = {}) => apiRequest('GET', path, opts),
  post: (path, body, opts = {}) => apiRequest('POST', path, { ...opts, body }),
  patch: (path, body, opts = {}) => apiRequest('PATCH', path, { ...opts, body }),
  logout,
};

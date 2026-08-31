// ============================================================
// 統一 API 請求層 —— 全站唯一知道 API 位址、token、envelope 結構嘅地方
// 其他 script 只 call api.get / api.post / api.patch，攞到嘅直接就係 body
// 注意：前端用 file:// 直接開，唔可以用 ES modules（Chrome 會擋 import），
// 所以呢度全部係 classic script 嘅全域 function / const。
// ============================================================

// 由後端 serve（http://127.0.0.1:3000/）嘅時候用同源相對路徑 —— 任何 port / 主機都得；
// file:// 直接開 html 檔嘅時候先用絕對 URL
// 注意：一定跟住 /api 前綴（後端所有 API 都掛喺 /api 下面）
const API_BASE = location.protocol.startsWith('http') ? '/api' : 'http://127.0.0.1:3000/api';
const TOKEN_KEY = 'accessToken';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch (e) { /* 隱身模式等，忽略 */ }
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}
function isLoggedIn() { return !!getToken(); }

// 整一個帶 code 嘅 Error，頁面用 err.code 判斷點顯示
function makeErr(code, msg) {
  return Object.assign(new Error(msg), { code });
}

// 4001（未登入 / Token 過期）→ 清 token → 跳登入頁（帶 ?next= 記住返嚟）
// login.html 自己唔會跳（避免死循環）：嗰頁 call 時要傳 skipAuthRedirect: true
function redirectToLogin() {
  const cur = location.pathname.split('/').pop() + location.search;
  if (cur.startsWith('login')) return;
  location.href = 'login.html?next=' + encodeURIComponent(cur);
}

// 核心 request：
// - query 空值自動唔傳（URLSearchParams）
// - 有 token 就帶 Authorization: Bearer
// - 成功唯一標準係 header.code === 0（register 成功係 HTTP 201，唔好睇 status）
// - 失敗 throw { code, message } 嘅 Error
async function apiRequest(method, path, { body, query, auth = true, skipAuthRedirect = false } = {}) {
  const url = new URL(API_BASE + path, location.href);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && getToken()) headers.Authorization = 'Bearer ' + getToken();

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
    clearToken();
    redirectToLogin();
  }
  throw makeErr(json.header.code, json.header.msg);
}

const api = {
  get: (path, opts = {}) => apiRequest('GET', path, opts),
  post: (path, body, opts = {}) => apiRequest('POST', path, { ...opts, body }),
  patch: (path, body, opts = {}) => apiRequest('PATCH', path, { ...opts, body }),
};

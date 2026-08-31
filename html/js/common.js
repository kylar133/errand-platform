// ============================================================
// 共用 UI 元件 + 工具函式（每頁都載入，順序：api.js → common.js → 頁面 script）
// 同樣係 classic script，全域 function；`App` 做全站暫存。
// ============================================================

// ---------- 常數 ----------
const CATEGORY_LABELS = { buy: '採買', deliver: '代送', queue: '排隊', other: '其他' };
const ITEM_SIZE_LABELS = { small: '細', medium: '中', large: '大' };
const STATUS_LABELS = {
  pending: '待接單',
  in_progress: '進行中',
  completed: '已送達',
  finished: '已完成',
  cancelled: '已取消',
};

// 錯誤碼 → 中文訊息（handleApiError 用；msg 本身多數係英文）
const ERROR_MESSAGES = {
  1001: '參數有問題',
  1002: '報酬最少 NT$50',
  1003: '地區唔合法',
  1004: 'Email 已註冊',
  2001: '任務唔存在',
  2002: '手慢咗，任務已俾人接咗',
  2003: '唔可以接自己發佈嘅任務',
  2004: '你進行中嘅任務已達 3 個上限',
  2005: '呢個操作唔符合任務當前狀態',
  2006: '任務已過期',
  4001: '未登入 / 登入已過期',
  5000: '伺服器內部錯誤',
};

// 全站暫存（同一個 tab 內共用）
const App = { currentUser: null, regions: null };

// ---------- 工具 ----------

// 所有用戶輸入 render 前必過（防 XSS —— 任務數據嚟自其他用戶）
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ISO 字串 → 瀏覽器本地時區「2026-08-27 14:30」
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function money(n) { return 'NT$' + Number(n); }

// Date → datetime-local input 嘅 value（本地牆鐘時間，無時區字尾）
function toDatetimeLocalValue(date) {
  const p = (x) => String(x).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

// 截止時間：{ text: '剩餘 X 小時', expired: bool }
function deadlineLabel(iso) {
  if (!iso) return { text: '—', expired: false };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { text: '—', expired: false };
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return { text: '已過期', expired: true };
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return {
    text: h > 0 ? `剩餘 ${h} 小時${m > 0 ? ' ' + m + ' 分鐘' : ''}` : `剩餘 ${m} 分鐘`,
    expired: false,
  };
}

// ---------- 身份 / 地區 ----------

// GET /auth/me → 用戶資料（cache 喺 App.currentUser）；未登入或失敗 → null
async function fetchMe() {
  if (App.currentUser) return App.currentUser;
  if (!isLoggedIn()) return null;
  try {
    App.currentUser = await api.get('/auth/me');
    return App.currentUser;
  } catch (e) {
    return null; // 4001 已由 api.js 自動處理（清 token + 跳登入）
  }
}

// GET /errand/regions → cache 喺 App.regions；失敗 → null
async function fetchRegions() {
  if (App.regions) return App.regions;
  try {
    App.regions = (await api.get('/errand/regions')).regions ?? [];
    return App.regions;
  } catch (e) {
    return null;
  }
}

// 需要登入先入到嘅頁（publish）：未登入 → 跳 login?next=當前頁 → 回 false
function requireLogin() {
  if (isLoggedIn()) return true;
  const cur = location.pathname.split('/').pop() + location.search;
  location.href = 'login.html?next=' + encodeURIComponent(cur);
  return false;
}

// ---------- UI 元件 ----------

// 底部浮出提示，2.6 秒自動消失；type: success | error | info
function toast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// 注入頂部 navbar；activeKey 高亮目前頁（'index' | 'publish' | ''）
function showNavbar(activeKey = '') {
  const el = document.getElementById('navbar');
  if (!el) return;
  const links = [
    { key: 'index', href: 'index.html', label: '任務大廳' },
    { key: 'publish', href: 'publish.html', label: '發佈任務' },
  ].map((l) =>
    `<a href="${l.href}" class="nav-link${l.key === activeKey ? ' active' : ''}">${l.label}</a>`
  ).join('');
  el.innerHTML = `
    <div class="navbar-inner">
      <a class="brand" href="index.html">🛵 跑腿平台</a>
      <nav class="nav-links">${links}</nav>
      <div class="nav-auth" id="nav-auth">
        <a class="nav-link" href="login.html">登入</a>
        <a class="btn btn-primary btn-sm" href="register.html">註冊</a>
      </div>
    </div>`;
  // 已登入 → 顯示姓名 + 登出
  fetchMe().then((me) => {
    if (!me) return;
    const box = document.getElementById('nav-auth');
    if (box) {
      box.innerHTML = `
        <span class="nav-user">👤 ${escapeHtml(me.name)}</span>
        <button type="button" class="btn btn-outline btn-sm" id="btn-logout">登出</button>`;
      document.getElementById('btn-logout').addEventListener('click', () => {
        clearToken();
        App.currentUser = null;
        location.href = 'index.html';
      });
    }
  });
}

// 狀態章 / 分類 tag（回 HTML 字串，innerHTML 用）
function statusBadge(status) {
  const label = STATUS_LABELS[status] ?? status;
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}
function categoryTag(cat) {
  const label = CATEGORY_LABELS[cat] ?? cat;
  return `<span class="tag">${escapeHtml(label)}</span>`;
}

// 分頁列：上一頁 / 第 x / y 頁 / 下一頁
function renderPagination(el, { page, totalPages, onGo }) {
  if (!el) return;
  if (!totalPages || totalPages <= 1) { el.innerHTML = ''; return; }
  const btn = (label, p, disabled) =>
    `<button type="button" class="page-btn" data-page="${p}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  el.innerHTML = `
    ${btn('← 上一頁', page - 1, page <= 1)}
    <span class="page-info">第 ${page} / ${totalPages} 頁</span>
    ${btn('下一頁 →', page + 1, page >= totalPages)}`;
  el.querySelectorAll('button[data-page]').forEach((b) =>
    b.addEventListener('click', () => onGo(Number(b.dataset.page))));
}

function emptyState(msg) {
  return `<div class="empty-state">${escapeHtml(msg)}</div>`;
}

// 4040 專用：task API 未上線（等 B/C 組員完成後端）
function apiNotReady() {
  return `
    <div class="api-not-ready">
      <div class="api-not-ready-icon">🚧</div>
      <div><strong>呢個 API 未上線</strong></div>
      <div class="api-not-ready-detail">任務功能等 B / C 組員完成後端之後先有得用。註冊、登入而家已經可以用。</div>
    </div>`;
}

// 統一錯誤顯示：4040 → 橫幅（要傳 el）；連線問題 → toast；其餘 → 錯誤碼中文 toast
function handleApiError(err, el = null) {
  if (err.code === 4040 && el) {
    el.innerHTML = apiNotReady();
    return;
  }
  if (err.code === -1 || err.code === -2) {
    toast(err.message, 'error');
    return;
  }
  toast(ERROR_MESSAGES[err.code] ?? err.message, 'error');
}

// ---------- 地區下拉 ----------

// 用 App.regions 填城市下拉；成功回 true
async function fillCitySelect(select, placeholder = '選擇城市') {
  const regions = await fetchRegions();
  if (!regions) return false;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    regions.map((r) => `<option value="${escapeHtml(r.city)}">${escapeHtml(r.city)}</option>`).join('');
  return true;
}

// 跟住城市填地區下拉
function fillDistrictSelect(cityValue, select, placeholder = '選擇地區') {
  const region = (App.regions ?? []).find((r) => r.city === cityValue);
  // ?? [] 防後端某城市漏咗 districts 欄位時成個聯動爆炸
  select.innerHTML = `<option value="">${placeholder}</option>` +
    ((region?.districts ?? []).map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join(''));
}

// ---------- 密碼顯示/隱藏 ----------

// 眼睛圖示（feather icon 風格）
const EYE_OPEN = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// 將密碼 input 包喺 .password-wrap 入面，加一個顯示/隱藏掣
function setupPasswordToggle(input) {
  const wrap = document.createElement('div');
  wrap.className = 'password-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'password-toggle';
  btn.innerHTML = EYE_OPEN;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
    btn.setAttribute('aria-label', show ? '隱藏密碼' : '顯示密碼');
    input.focus();
  });
  wrap.appendChild(btn);
}

// 頁面載入後，自動幫所有密碼 input 加掣（login 1 個 + register 2 個）
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="password"]').forEach(setupPasswordToggle);
});

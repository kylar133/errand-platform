// 任務大廳：tabs（大廳 / 我發佈 / 我接咗）+ 篩選 + 分頁
// 列表 API 由 B 組員實現；未上線期間會收到 4040 → 顯示橫幅
(function () {
  const state = {
    scope: 'all', status: '', city: '', district: '',
    category: '', minReward: '', sort: 'created_desc', page: 1,
  };
  const LIMIT = 10;
  let loadSeq = 0; // 防 out-of-order：快速連切篩選嗰陣，只認最後一次 call 嘅結果

  const listEl = document.getElementById('task-list');
  const pagEl = document.getElementById('pagination');
  const els = {
    city: document.getElementById('f-city'),
    district: document.getElementById('f-district'),
    category: document.getElementById('f-category'),
    status: document.getElementById('f-status'),
    sort: document.getElementById('f-sort'),
    minReward: document.getElementById('f-minReward'),
  };

  showNavbar('index');

  // 地區資料只係篩選用；攞唔到（後端未起）都唔影響其他嘢
  fetchRegions().then((regions) => {
    if (regions) {
      fillCitySelect(els.city, '所有城市');
      fillDistrictSelect('', els.district, '所有地區');
    }
  });

  // ---------- tabs ----------
  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scope]');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
    state.scope = btn.dataset.scope;
    state.page = 1;
    loadTasks();
  });

  // ---------- 篩選 ----------
  els.city.addEventListener('change', () => {
    state.city = els.city.value;
    state.district = '';
    fillDistrictSelect(state.city, els.district, '所有地區');
    state.page = 1;
    loadTasks();
  });
  els.district.addEventListener('change', () => { state.district = els.district.value; state.page = 1; loadTasks(); });
  els.category.addEventListener('change', () => { state.category = els.category.value; state.page = 1; loadTasks(); });
  els.status.addEventListener('change', () => { state.status = els.status.value; state.page = 1; loadTasks(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; loadTasks(); });
  els.minReward.addEventListener('change', () => { state.minReward = els.minReward.value; state.page = 1; loadTasks(); });

  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(state, { status: '', city: '', district: '', category: '', minReward: '', sort: 'created_desc', page: 1 });
    els.city.value = ''; els.district.value = ''; els.category.value = ''; els.status.value = '';
    els.sort.value = 'created_desc'; els.minReward.value = '';
    fillDistrictSelect('', els.district, '所有地區');
    loadTasks();
  });

  // ---------- 列表 ----------
  function taskCard(t) {
    // 合約：列表 item 欄位叫 taskId（B 上線後可以收緊，唔使 fallback）
    const id = t.taskId ?? t._id ?? '';
    return `
      <a class="card task-card" href="task.html?id=${encodeURIComponent(id)}">
        <div class="task-card-top">
          <span class="task-card-meta">${statusBadge(t.status)} ${categoryTag(t.category)}</span>
          <span class="task-reward">${escapeHtml(money(t.rewardFee))}</span>
        </div>
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-foot">
          <span>📍 ${escapeHtml(t.city)} · ${escapeHtml(t.district)}</span>
          <span>發布 ${escapeHtml(formatDateTime(t.createdAt))}</span>
        </div>
      </a>`;
  }

  async function loadTasks() {
    const seq = ++loadSeq;
    // 「我發佈 / 我接咗」要登入先睇到 —— 內聯提示，唔好突然彈去登入頁
    if (state.scope !== 'all' && !isLoggedIn()) {
      listEl.innerHTML = `
        <div class="empty-state">
          登入之後先睇到自己發佈 / 接咗嘅任務
          <div class="empty-state-action">
            <a class="btn btn-primary btn-sm" href="login.html">去登入</a>
          </div>
        </div>`;
      pagEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = '<div class="list-loading">載入中…</div>';
    pagEl.innerHTML = '';
    try {
      const body = await api.get('/errand/tasks', { query: { ...state, limit: LIMIT } });
      if (seq !== loadSeq) return; // 已經有更新嘅請求，丟棄呢次結果
      if (!body.items || body.items.length === 0) {
        listEl.innerHTML = emptyState(
          state.scope === 'all' ? '暫時冇任務，不如去發佈第一單？' : '呢度暫時冇任務');
      } else {
        listEl.innerHTML = body.items.map(taskCard).join('');
      }
      renderPagination(pagEl, {
        page: body.page, totalPages: body.totalPages,
        onGo: (p) => { state.page = p; loadTasks(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      });
    } catch (err) {
      if (seq !== loadSeq) return; // 同上：舊請求嘅錯誤唔好覆蓋新狀態
      if (err.code === 4040) listEl.innerHTML = apiNotReady();
      else if (err.code === 4001) listEl.innerHTML = emptyState('登入已過期，請重新登入');
      else {
        // 唔好卡死喺「載入中…」：連唔到 server / 其他錯誤都要有嘢睇
        listEl.innerHTML = emptyState(
          err.code === -1 ? '連唔到伺服器，請確認後端有冇啟動' : '載入失敗，請重新整理');
        handleApiError(err);
      }
    }
  }

  loadTasks();
})();

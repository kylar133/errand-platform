// 任務詳情頁 —— GET /api/errand/tasks/{taskId}（doc §3.3）
// 遮罩由後端做（發單人 / 跑腿者先睇到完整聯絡資料），前端原樣顯示。
// 後端由 B / C 組員實現；未上線期間會收到 4040 → 顯示橫幅。
(function () {
  const taskId = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('task-root');

  showNavbar('');

  let timer = null;
  let current = null; // 最新任務資料
  let me = null;      // 自己嘅用戶資料（未登入 = null）
  let busy = false;   // 動作請求進行中（防呆：唔好連點雙發）

  function renderLoading() {
    root.innerHTML = '<div class="list-loading">載入中…</div>';
  }
  function renderBox(html) {
    root.innerHTML = `<div class="card">${html}</div>`;
  }

  // ---------- 攞資料 ----------
  async function load() {
    renderLoading();
    try {
      const [task, meData] = await Promise.all([
        api.get('/errand/tasks/' + encodeURIComponent(taskId)),
        isLoggedIn() ? fetchMe() : Promise.resolve(null),
      ]);
      current = task;
      me = meData;
      render();
    } catch (err) {
      clearInterval(timer);
      if (err.code === 4040) renderBox(apiNotReady());
      else if (err.code === 2001) {
        renderBox(`
          <div class="empty-state">任務唔存在（可能已被刪除）</div>
          <div class="empty-state-action"><a class="btn btn-outline" href="index.html">返去任務大廳</a></div>`);
      } else if (err.code === 4001) renderBox('<div class="empty-state">登入已過期，請重新登入</div>');
      else {
        // 唔好卡死喺「載入中…」
        renderBox(`
          <div class="empty-state">${escapeHtml(err.code === -1 ? '連唔到伺服器，請確認後端有冇啟動' : '載入失敗，請重新整理')}</div>
          <div class="empty-state-action"><a class="btn btn-outline" href="index.html">返去任務大廳</a></div>`);
        handleApiError(err);
      }
    }
  }

  // ---------- 畫 ----------
  function render() {
    const t = current;
    // String() 轉咗先比：就算前後端型別唔一致都認到
    const myId = me ? String(me.userId) : null;
    const isPublisher = myId !== null && String(t.publisher?.id ?? '') === myId;
    const isRunner = myId !== null && String(t.runner?.id ?? '') === myId;
    const isParticipant = isPublisher || isRunner;
    const dl = deadlineLabel(t.deadline);
    const dest = t.destAddress
      ? `${escapeHtml(t.destCity ?? t.city)} ${escapeHtml(t.destDistrict ?? t.district)} ${escapeHtml(t.destAddress)}`
      : '同取貨地點';
    // 遮罩訊號：非參與者見到「***」→ 提示接單後可見
    const masked = !isParticipant &&
      (String(t.addressDetail ?? '').includes('***') || String(t.contactPhone ?? '').includes('*'));

    root.innerHTML = `
      <div class="card">
        <div class="task-detail-head">
          <h1 class="task-detail-title">${escapeHtml(t.title)}</h1>
          <span class="task-detail-meta">${statusBadge(t.status)} ${categoryTag(t.category)}</span>
        </div>
        <div class="task-reward-big">${escapeHtml(money(t.rewardFee))}</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-label">發布人</span><span>${escapeHtml(t.publisher?.name ?? '—')}</span></div>
          <div class="detail-row"><span class="detail-label">跑腿者</span><span>${escapeHtml(t.runner?.name ?? '未接單')}</span></div>
          <div class="detail-row"><span class="detail-label">發布時間</span><span>${escapeHtml(formatDateTime(t.createdAt))}</span></div>
          <div class="detail-row"><span class="detail-label">截止時間</span>
            <span id="deadline-label" class="${dl.expired ? 'text-danger' : ''}">${escapeHtml(formatDateTime(t.deadline))}（${escapeHtml(dl.text)}）</span></div>
          <div class="detail-row"><span class="detail-label">取貨地點</span><span>${escapeHtml(t.city)} ${escapeHtml(t.district)} ${escapeHtml(t.addressDetail)}</span></div>
          <div class="detail-row"><span class="detail-label">目的地</span><span>${dest}</span></div>
          ${t.itemSize ? `<div class="detail-row"><span class="detail-label">物品大小</span><span>${escapeHtml(ITEM_SIZE_LABELS[t.itemSize] ?? t.itemSize)}</span></div>` : ''}
          ${t.description ? `<div class="detail-row"><span class="detail-label">描述</span><span>${escapeHtml(t.description)}</span></div>` : ''}
          <div class="detail-row"><span class="detail-label">聯絡人</span><span>${escapeHtml(t.contactName)}</span></div>
          <div class="detail-row"><span class="detail-label">電話</span><span>${escapeHtml(t.contactPhone)}</span></div>
          ${masked ? '<div class="field-hint">🔒 接單之後先睇到完整地址同聯絡資料</div>' : ''}
        </div>
        <div id="action-area" class="action-area"></div>
      </div>
      <div class="card status-legend">
        <div class="section-title">狀態流程</div>
        <div class="legend-flow">待接單 → 進行中 → 已送達 → 已完成</div>
        <div class="legend-flow muted">待接單 → 已取消（發布人取消 / 24 小時冇人接自動流標）</div>
      </div>`;
    renderActions(t, isPublisher, isRunner);
    startTimer();
  }

  // 每 60 秒更新一次截止倒數（只改文字，唔重畫成頁）
  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!current) return;
      const dl = deadlineLabel(current.deadline);
      const el = document.getElementById('deadline-label');
      if (el) {
        el.textContent = `${formatDateTime(current.deadline)}（${dl.text}）`;
        el.className = dl.expired ? 'text-danger' : '';
      }
    }, 60000);
  }

  // ---------- 動作區（doc §3.4 / §3.5 角色規則） ----------
  function renderActions(t, isPublisher, isRunner) {
    const area = document.getElementById('action-area');
    if (!area) return;
    area.innerHTML = '';

    const addBtn = (label, cls, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + cls;
      b.textContent = label;
      b.addEventListener('click', onClick);
      area.appendChild(b);
    };

    if (!isPublisher && !isRunner && t.status === 'pending') {
      if (!isLoggedIn()) {
        // 未登入 → 提示登入後接單
        area.innerHTML = `<a class="btn btn-primary btn-block" href="login.html?next=${encodeURIComponent('task.html?id=' + taskId)}">登入後接單</a>`;
        return;
      }
      // 已過期就唔好出接單掣（後端會回 2006）
      if (t.deadline && new Date(t.deadline).getTime() <= Date.now()) {
        area.innerHTML = '<div class="action-hint">任務已過期，唔可以再接單</div>';
        return;
      }
      addBtn('接單', 'btn-primary btn-block', doAccept);
      return;
    }

    if (isPublisher && t.status === 'pending') addBtn('取消任務', 'btn-danger-text', () => doStatus('cancel'));
    if (isPublisher && t.status === 'completed') addBtn('確認完成', 'btn-primary', () => doStatus('confirm'));
    if (isRunner && t.status === 'in_progress') addBtn('完成任務（已送達）', 'btn-primary btn-block', () => doStatus('deliver'));

    if (!area.children.length) {
      area.innerHTML = `<div class="action-hint">${hintText(t.status, isPublisher, isRunner)}</div>`;
    }
  }

  function hintText(status, isPublisher, isRunner) {
    const hints = {
      pending: { publisher: '等緊人接單，24 小時內冇人接會自動流標', runner: '', other: '' },
      in_progress: { publisher: '跑腿者進行中，等佢完成…', runner: '', other: '任務進行中，已有人接咗' },
      completed: { publisher: '跑腿者已送達，撳「確認完成」先會完結', runner: '等發單人確認…', other: '已送達，等發單人確認' },
      finished: { publisher: '任務已完結', runner: '任務已完結', other: '任務已完結' },
      cancelled: { publisher: '任務已取消', runner: '任務已取消', other: '任務已取消' },
    };
    const who = isPublisher ? 'publisher' : (isRunner ? 'runner' : 'other');
    return hints[status]?.[who] ?? '';
  }

  // ---------- 動作 ----------
  async function doAccept() {
    if (busy) return; // 防呆：請求進行中唔好再撳
    if (!confirm('確定要接呢單？接咗就要喺截止時間前完成。')) return;
    busy = true;
    try {
      await api.post('/errand/tasks/' + encodeURIComponent(taskId) + '/accept');
      toast('接單成功！', 'success');
      await load();
    } catch (err) {
      handleApiError(err);
      await load(); // 可能已俾人接咗（2002），重畫先見到真實情況
    } finally {
      busy = false;
    }
  }

  async function doStatus(action) {
    const confirmMsg = {
      cancel: '確定要取消呢單任務？',
      deliver: '確定已經送到？',
      confirm: '確定收到嘢，任務完結？',
    }[action];
    if (busy) return; // 防呆：請求進行中唔好再撳
    if (!confirm(confirmMsg)) return;
    busy = true;
    try {
      await api.patch('/errand/tasks/' + encodeURIComponent(taskId) + '/status', { action });
      toast({ cancel: '任務已取消', deliver: '已標記送達，等發單人確認', confirm: '任務已完結' }[action], 'success');
      await load();
    } catch (err) {
      handleApiError(err);
      await load(); // 狀態可能已經俾人改咗（2005/2006），重畫先見到真實情況
    } finally {
      busy = false;
    }
  }

  // ---------- 開始 ----------
  if (!taskId) {
    renderBox(`
      <div class="empty-state">缺少任務 ID（連結應該係 task.html?id=xxx）</div>
      <div class="empty-state-action"><a class="btn btn-outline" href="index.html">返去任務大廳</a></div>`);
    return;
  }
  load();
})();

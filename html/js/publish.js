// 發佈任務頁 —— POST /api/errand/tasks（doc §3.1）
// 後端由 B 組員實現；未上線期間提交會收到 4040 → 顯示橫幅
(function () {
  // 未登入 → 跳 login?next=publish.html
  if (!requireLogin()) return;

  const els = {
    title: document.getElementById('title'),
    category: document.getElementById('category'),
    rewardFee: document.getElementById('rewardFee'),
    itemSize: document.getElementById('itemSize'),
    city: document.getElementById('city'),
    district: document.getElementById('district'),
    addressDetail: document.getElementById('addressDetail'),
    destCity: document.getElementById('destCity'),
    destDistrict: document.getElementById('destDistrict'),
    destAddress: document.getElementById('destAddress'),
    contactName: document.getElementById('contactName'),
    contactPhone: document.getElementById('contactPhone'),
    deadline: document.getElementById('deadline'),
    description: document.getElementById('description'),
  };
  const btnSubmit = document.getElementById('btn-submit');
  const bannerEl = document.getElementById('region-banner');

  showNavbar('publish');

  // ---------- 地區下拉 ----------
  fetchRegions().then((regions) => {
    if (!regions) {
      bannerEl.innerHTML = '<div class="banner-error">攞唔到地區資料 —— 請確認後端有冇啟動，再重新整理頁面</div>';
      btnSubmit.disabled = true;
      return;
    }
    fillCitySelect(els.city);
    fillCitySelect(els.destCity, '同取貨地點');
  });

  els.city.addEventListener('change', () => {
    fillDistrictSelect(els.city.value, els.district);
    els.district.disabled = !els.city.value;
  });
  els.destCity.addEventListener('change', () => {
    fillDistrictSelect(els.destCity.value, els.destDistrict);
    els.destDistrict.disabled = !els.destCity.value;
  });

  // ---------- 字數計 + deadline 預設 ----------
  els.title.addEventListener('input', () => {
    document.getElementById('title-count').textContent = els.title.value.length;
  });
  els.description.addEventListener('input', () => {
    document.getElementById('desc-count').textContent = els.description.value.length;
  });
  els.deadline.value = toDatetimeLocalValue(new Date(Date.now() + 24 * 3600 * 1000));
  els.deadline.min = toDatetimeLocalValue(new Date());

  // ---------- 校驗（規則同 doc §3.1） ----------
  function validate() {
    const errs = {};
    const title = els.title.value.trim();
    if (title.length < 2 || title.length > 50) errs.title = '標題要 2–50 個字';
    if (!els.category.value) errs.category = '請揀分類';
    const fee = parseInt(els.rewardFee.value, 10);
    if (!Number.isInteger(fee) || fee < 50) errs.rewardFee = '報酬要係整數，最少 NT$50';
    if (!els.city.value) errs.city = '請揀城市';
    if (!els.district.value) errs.district = '請揀地區';
    if (!els.addressDetail.value.trim()) errs.addressDetail = '請填詳細地址';
    const destFilled = [els.destCity.value, els.destDistrict.value, els.destAddress.value.trim()]
      .filter(Boolean).length;
    if (destFilled > 0 && destFilled < 3) errs.destAddress = '目的地要填就城市 / 地區 / 地址三欄一齊填';
    const contactName = els.contactName.value.trim();
    if (contactName.length < 2 || contactName.length > 20) errs.contactName = '聯絡人要 2–20 個字';
    if (!/^[456789]\d{7}$/.test(els.contactPhone.value)) errs.contactPhone = '電話要 8 位數字（香港手機，例：91234567）';
    if (els.deadline.value && new Date(els.deadline.value).getTime() <= Date.now()) {
      errs.deadline = '截止時間要喺將來';
    }
    return errs;
  }

  function showFieldErrors(errs) {
    for (const [key, el] of Object.entries(els)) {
      const box = el.closest('.form-group')?.querySelector('[data-err]');
      if (box) box.textContent = errs[key] ?? '';
    }
  }

  // ---------- 提交 ----------
  document.getElementById('publish-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errs = validate();
    showFieldErrors(errs);
    if (Object.keys(errs).length) return;

    // datetime-local 係本地牆鐘時間（無時區），toISOString() 正確轉做 UTC（後端要嘅 ISO8601）
    const payload = {
      title: els.title.value.trim(),
      category: els.category.value,
      rewardFee: parseInt(els.rewardFee.value, 10),
      itemSize: els.itemSize.value || undefined,
      city: els.city.value,
      district: els.district.value,
      addressDetail: els.addressDetail.value.trim(),
      // 目的地冇填就唔傳（後端會預設 = 取貨地點）
      ...(els.destCity.value
        ? {
            destCity: els.destCity.value,
            destDistrict: els.destDistrict.value,
            destAddress: els.destAddress.value.trim(),
          }
        : {}),
      contactName: els.contactName.value.trim(),
      contactPhone: els.contactPhone.value,
      // deadline 可唔填：用戶清空咗就自動而家 + 24 小時（同後端 schema default 一致），
      // 唔好用 new Date('').toISOString() —— 空字串會拋 RangeError 靜默失敗
      deadline: els.deadline.value
        ? new Date(els.deadline.value).toISOString()
        : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      description: els.description.value.trim() || undefined,
    };

    bannerEl.innerHTML = '';
    btnSubmit.disabled = true;
    btnSubmit.textContent = '發佈中…';
    try {
      const body = await api.post('/errand/tasks', payload);
      toast('發佈成功！', 'success');
      location.href = 'task.html?id=' + encodeURIComponent(body.taskId ?? body._id ?? '');
    } catch (err) {
      if (err.code === 4040) bannerEl.innerHTML = apiNotReady();
      else handleApiError(err);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '發佈任務';
    }
  });
})();

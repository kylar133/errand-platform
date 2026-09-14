import { Task } from '../models/Task.js';
import { AppError } from '../utils/AppError.js';
import { regions, isValidRegion } from '../constants/regions.js';

const CATEGORIES = ['buy', 'deliver', 'queue', 'other'];
const ITEM_SIZES = ['small', 'medium', 'large'];
const STATUSES = ['pending', 'in_progress', 'completed', 'finished', 'cancelled'];

export const taskService = {
  // POST /api/errand/tasks —— 發佈任務
  async createTask({
    title, category, rewardFee, itemSize, city, district, addressDetail,
    destCity, destDistrict, destAddress, contactName, contactPhone, deadline, description,
    user,
  }) {
    validateCreateInput({
      title, category, rewardFee, itemSize, city, district, addressDetail,
      destCity, destDistrict, destAddress, contactName, contactPhone, deadline, description,
    });

    // 白名單砌 create 對象：model 係 strict:'throw'，多餘欄位會直接爆 500
    const task = await Task.create({
      publisher: { id: String(user.id), name: user.name },
      title: title.trim(),
      category,
      rewardFee,
      ...(itemSize ? { itemSize } : {}),
      city,
      district,
      addressDetail: addressDetail.trim(),
      ...(destCity ? { destCity, destDistrict, destAddress: destAddress.trim() } : {}),
      contactName: contactName.trim(),
      contactPhone,
      ...(deadline ? { deadline: new Date(deadline) } : {}),
      ...(description ? { description: description.trim() } : {}),
    });

    return { taskId: String(task._id) };
  },

  // GET /api/errand/tasks —— 列表（大廳 / 我發佈 / 我接咗）
  async listTasks({ query = {}, user }) {
    const { filter, sort, page, limit } = parseListQuery(query, user);

    const [docs, total] = await Promise.all([
      Task.find(filter)
        .select('title category rewardFee city district status createdAt')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    const items = docs.map((t) => ({
      taskId: String(t._id),
      title: t.title,
      category: t.category,
      rewardFee: t.rewardFee,
      city: t.city,
      district: t.district,
      status: t.status,
      createdAt: t.createdAt,
    }));

    return { items, page, totalPages: Math.ceil(total / limit) };
  },
};

// 發佈校驗 —— 規則同前端 publish.js validate()
function validateCreateInput({
  title, category, rewardFee, itemSize, city, district, addressDetail,
  destCity, destDistrict, destAddress, contactName, contactPhone, deadline, description,
}) {
  const t = String(title ?? '').trim();
  if (t.length < 2 || t.length > 50) throw new AppError(1001, 'Title must be 2-50 characters');
  if (!CATEGORIES.includes(category)) throw new AppError(1001, 'Invalid category');
  if (!Number.isInteger(rewardFee)) throw new AppError(1001, 'Reward fee must be an integer');
  if (rewardFee < 50) throw new AppError(1002);
  if (itemSize !== undefined && !ITEM_SIZES.includes(itemSize)) throw new AppError(1001, 'Invalid itemSize');
  if (!city || !district) throw new AppError(1001, 'City and district are required');
  if (!isValidRegion(city, district)) throw new AppError(1003);
  if (!String(addressDetail ?? '').trim()) throw new AppError(1001, 'addressDetail is required');

  // 目的地：三欄一齊填，或者全部唔填
  const destFilled = [destCity, destDistrict, String(destAddress ?? '').trim()].filter(Boolean).length;
  if (destFilled > 0 && destFilled < 3) {
    throw new AppError(1001, 'Destination requires city, district and address together');
  }
  if (destFilled === 3 && !isValidRegion(destCity, destDistrict)) throw new AppError(1003);

  const name = String(contactName ?? '').trim();
  if (name.length < 2 || name.length > 20) throw new AppError(1001, 'Contact name must be 2-20 characters');
  // 香港手機：8 位數字，首位 4-9
  if (!/^[456789]\d{7}$/.test(String(contactPhone ?? ''))) {
    throw new AppError(1001, 'Phone must be 8-digit HK mobile');
  }

  if (deadline !== undefined) {
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) throw new AppError(1001, 'Invalid deadline');
    if (d.getTime() <= Date.now()) throw new AppError(1001, 'Deadline must be in the future');
  }
  if (description !== undefined && String(description).length > 500) {
    throw new AppError(1001, 'Description must be <= 500 characters');
  }
}

// 列表 query 校驗 + 轉型
function parseListQuery(query, user) {
  const scope = query.scope ?? 'all';
  if (!['all', 'my_posted', 'my_accepted'].includes(scope)) throw new AppError(1001, 'Invalid scope');
  if (scope !== 'all' && !user) throw new AppError(4001);

  const status = query.status ?? '';
  if (status && !STATUSES.includes(status)) throw new AppError(1001, 'Invalid status');
  const category = query.category ?? '';
  if (category && !CATEGORIES.includes(category)) throw new AppError(1001, 'Invalid category');

  const city = query.city ?? '';
  if (city && !regions.some((r) => r.city === city)) throw new AppError(1003);
  const district = query.district ?? '';
  if (district && !city) throw new AppError(1001, 'District filter requires city');
  if (district && !isValidRegion(city, district)) throw new AppError(1003);

  let minReward;
  if (query.minReward !== undefined && query.minReward !== '') {
    minReward = Number(query.minReward);
    if (!Number.isInteger(minReward) || minReward < 0) throw new AppError(1001, 'Invalid minReward');
  }

  const sortParam = query.sort ?? 'created_desc';
  // 尾加 _id tiebreak：createdAt 相同（同一毫秒插入）時次序先穩定，分頁先唔會重複/漏單
  const sort = {
    created_desc: { createdAt: -1, _id: -1 },
    reward_desc: { rewardFee: -1, createdAt: -1, _id: -1 },
  }[sortParam];
  if (!sort) throw new AppError(1001, 'Invalid sort');

  let page = 1;
  if (query.page !== undefined && query.page !== '') {
    page = Number(query.page);
    if (!Number.isInteger(page) || page < 1) throw new AppError(1001, 'Invalid page');
  }
  let limit = 10;
  if (query.limit !== undefined && query.limit !== '') {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1) throw new AppError(1001, 'Invalid limit');
    if (limit > 50) limit = 50;
  }

  const filter = {
    ...(status && { status }),
    ...(category && { category }),
    ...(city && { city }),
    ...(district && { district }),
    ...(minReward !== undefined && { rewardFee: { $gte: minReward } }),
    ...(scope === 'my_posted' && { 'publisher.id': user.id }),
    ...(scope === 'my_accepted' && { 'runner.id': user.id }),
  };

  return { filter, sort, page, limit };
}

// 默認數據 seed：2 個 demo 帳號 + 8 單任務（覆蓋 5 個狀態 / 4 個分類 / 3 大區域）
// 用法：npm run seed —— 重跑會先清走舊 seed 數據，唔會重複
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Task } from '../src/models/Task.js';

const HOUR = 3600 * 1000;
const PASSWORD = 'aaa123123';

const USERS = [
  { email: 'seed-xiaomei@example.com', name: '小美', phone: '91234567' },
  { email: 'seed-aqiang@example.com', name: '阿強', phone: '92345678' },
];

// by = 發佈人（USERS index）；runner = 跑腿者（USERS index，null 就未接）；
// deadlineH = 相對而家幾多個鐘（負數 = 已過期）
const TASKS = [
  { by: 0, title: '幫買兩杯珍珠奶茶', category: 'buy', rewardFee: 60, itemSize: 'small',
    status: 'pending', city: '九龍', district: '油尖旺區', addressDetail: '彌敦道 100 號 7 樓',
    contactName: '小美', contactPhone: '91234567', deadlineH: 2,
    description: '少冰少甜，送到旺角地鐵站 B 出口交收' },
  { by: 1, title: '文件代送去東區寫字樓', category: 'deliver', rewardFee: 150, itemSize: 'medium',
    status: 'pending', city: '香港島', district: '中西區', addressDetail: '皇后大道中 1 號',
    destCity: '香港島', destDistrict: '東區', destAddress: '英皇道 200 號',
    contactName: '阿強', contactPhone: '92345678', deadlineH: 26 },
  { by: 0, title: '排隊買限量模型', category: 'queue', rewardFee: 100, itemSize: 'large',
    status: 'pending', city: '九龍', district: '深水埗區', addressDetail: '福華街 150 號門外',
    contactName: '小美', contactPhone: '91234567', deadlineH: -3,
    description: '早鳥場，最好朝早 6 點到' },
  { by: 0, title: '買一打蛋撻送沙田', category: 'buy', rewardFee: 80, itemSize: 'small',
    status: 'in_progress', runner: 1, city: '新界', district: '沙田區', addressDetail: '沙田正街 1 號',
    contactName: '小美', contactPhone: '91234567', deadlineH: 10 },
  { by: 1, title: '代收淘寶包裹送觀塘', category: 'deliver', rewardFee: 90, itemSize: 'medium',
    status: 'completed', runner: 0, city: '九龍', district: '觀塘區', addressDetail: '觀塘道 50 號自提點',
    contactName: '阿強', contactPhone: '92345678', deadlineH: 5 },
  { by: 0, title: '幫手拎衫去乾洗', category: 'other', rewardFee: 70,
    status: 'finished', runner: 1, city: '香港島', district: '灣仔區', addressDetail: '莊士敦道 20 號',
    contactName: '小美', contactPhone: '91234567', deadlineH: 48 },
  { by: 1, title: '代送花籃去元朗酒樓', category: 'deliver', rewardFee: 120, itemSize: 'large',
    status: 'cancelled', city: '新界', district: '元朗區', addressDetail: '元朗大馬路 88 號',
    contactName: '阿強', contactPhone: '92345678', deadlineH: 30 },
  { by: 1, title: '買新鮮水果送荃灣', category: 'buy', rewardFee: 55, itemSize: 'small',
    status: 'pending', city: '新界', district: '葵青區', addressDetail: '葵芳廣場 1 樓街市',
    destCity: '新界', destDistrict: '荃灣區', destAddress: '青山公路 1 號',
    contactName: '阿強', contactPhone: '92345678', deadlineH: 7,
    description: '蘋果 4 個、橙 4 個，唔要爛嘅' },
];

try {
  await connectDB();

  // 清走舊 seed 數據（帳號 + 佢哋發嘅單），重跑唔會重複
  const oldUsers = await User.find({ email: /^seed-/ }).lean();
  const oldIds = oldUsers.map((u) => String(u._id));
  if (oldIds.length) {
    await Task.deleteMany({ 'publisher.id': { $in: oldIds } });
    await User.deleteMany({ _id: { $in: oldIds } });
    console.log(`清走舊 seed：${oldIds.length} 個帳號`);
  }

  // 建帳號
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = await User.create(USERS.map((u) => ({ ...u, password: passwordHash })));

  // 建任務
  const now = Date.now();
  const tasks = await Task.create(TASKS.map((t) => ({
    publisher: { id: String(users[t.by]._id), name: users[t.by].name },
    ...(t.runner !== undefined
      ? { runner: { id: String(users[t.runner]._id), name: users[t.runner].name } }
      : {}),
    title: t.title,
    category: t.category,
    rewardFee: t.rewardFee,
    ...(t.itemSize ? { itemSize: t.itemSize } : {}),
    status: t.status,
    city: t.city,
    district: t.district,
    addressDetail: t.addressDetail,
    ...(t.destCity ? { destCity: t.destCity, destDistrict: t.destDistrict, destAddress: t.destAddress } : {}),
    contactName: t.contactName,
    contactPhone: t.contactPhone,
    deadline: new Date(now + t.deadlineH * HOUR),
    ...(t.description ? { description: t.description } : {}),
  })));

  console.log(`\nSeed 完成：${users.length} 個帳號 + ${tasks.length} 單任務`);
  console.log(`登入帳號（密碼一律 ${PASSWORD}）：`);
  for (const u of users) console.log(`  ${u.name}  ${u.email}`);
  console.log('\n任務一覽：');
  for (const t of tasks) console.log(`  [${t.status}] HK$${t.rewardFee} ${t.title}（${t.city}${t.district}）`);
} catch (err) {
  console.error('Seed 失敗：' + err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}

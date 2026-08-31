// 地區二級下拉資料。
// GET /api/errand/regions 同發佈任務要用，
// 用香港三大區域（city）+ 18 區（district）。

export const regions = [
  { city: '香港島', districts: ['中西區', '灣仔區', '東區', '南區'] },
  { city: '九龍', districts: ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'] },
  { city: '新界', districts: ['荃灣區', '屯門區', '元朗區', '北區', '大埔區', '西貢區', '沙田區', '葵青區', '離島區'] },
];

// 快速校驗：city 存在 + district 屬於該 city
export function isValidRegion(city, district) {
  const entry = regions.find((r) => r.city === city);
  return Boolean(entry && entry.districts.includes(district));
}

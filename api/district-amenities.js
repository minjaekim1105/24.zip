const districts = [
  ['강남구',11680], ['강동구',11740], ['강서구',11500],
  ['관악구',11620], ['구로구',11530], ['도봉구',11320],
  ['동대문구',11230], ['동작구',11590], ['마포구',11440],
  ['서대문구',11410], ['성동구',11200], ['성북구',11290],
  ['영등포구',11560], ['용산구',11170], ['은평구',11380],
  ['종로구',11110], ['중구',11140], ['송파구',11710],
  ['중랑구',11260], ['양천구',11470], ['서초구',11650],
  ['노원구',11350], ['광진구',11215], ['강북구',11305], ['금천구',11545]
];
const measures = {
  convenience: ['편의점', 25],
  supermarket: ['대형마트', 20],
  pharmacy: ['약국', 25],
  medical: ['병·의원', 30]
};
const medicalExclusions = ['61', '71', '72', '73'];
const mallService = 'LOCALDATA_082501';

function natural(value) {
  if (!/^\d+$/.test(String(value))) throw new Error('Invalid count');
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Invalid count');
  return number;
}

async function request(url) {
  const timeout = String(url).includes('apis.data.go.kr') ? 35000 : 12000;
  const response = await fetch(url, {signal: AbortSignal.timeout(timeout)});
  if (!response.ok) throw new Error('Upstream HTTP ' + response.status);
  return response;
}

function dataUrl(path, key, parameters) {
  const url = new URL(path, 'https://apis.data.go.kr');
  url.search = new URLSearchParams({ServiceKey: key, ...parameters});
  return url;
}

async function commercialCount(key, districtCode) {
  const url = dataUrl('/B553077/api/open/sdsc2/storeListInDong', key, {
    divId: 'signguCd', key: districtCode, indsSclsCd: 'G20405',
    pageNo: 1, numOfRows: 1, type: 'json'
  });
  const data = await (await request(url)).json();
  if (String(data.header?.resultCode) !== '00') throw new Error('Store API failure');
  return natural(data.body?.totalCount);
}

async function medicalCount(key, districtCode, pharmacy, clCd) {
  const path = pharmacy
    ? '/B551182/pharmacyInfoService/getParmacyBasisList'
    : '/B551182/hospInfoServicev2/getHospBasisList';
  const params = {sidoCd: 110000, sgguCd: districtCode, pageNo: 1, numOfRows: 1};
  if (clCd) params.clCd = clCd;
  const body = await (await request(dataUrl(path, key, params))).text();
  const code = body.match(/<(?:resultCode|returnReasonCode)>\s*(\d{1,3})\s*<\/(?:resultCode|returnReasonCode)>/)?.[1];
  if (Number(code) === 3 && /NODATA|NO_DATA|No data/i.test(body)) return 0;
  if (Number(code) !== 0) throw new Error('HIRA code ' + (code ?? 'missing'));
  return natural(body.match(/<totalCount>\s*(\d+)\s*<\/totalCount>/)?.[1]);
}

async function mallCounts(key) {
  const counts = Object.fromEntries(districts.map(([name]) => [name, 0]));
  const seen = new Set();
  let excludedMallRows = 0;
  let start = 1;
  let total;
  do {
    const end = start + 999;
    const url = 'http://openapi.seoul.go.kr:8088/' + encodeURIComponent(key)
      + '/json/' + mallService + '/' + start + '/' + end + '/';
    const data = (await (await request(url)).json())[mallService];
    if (data?.RESULT?.CODE !== 'INFO-000') throw new Error('Mall API failure');
    const pageTotal = natural(data.list_total_count);
    total ??= pageTotal;
    if (pageTotal !== total || data.row?.length !== Math.min(1000, total - start + 1)) {
      throw new Error('Incomplete mall records');
    }
    for (const row of data.row) {
      if (String(row.TRDSTATEGBN) !== '01' || row.UPTAENM?.trim() !== '대형마트') continue;
      const district = [row.RDNWHLADDR, row.SITEWHLADDR].map(address =>
        address?.trim().match(/^서울(?:특별시)?\s+(\S+)/)?.[1]
      ).find(name => Object.hasOwn(counts, name));
      if (!district || !row.MGTNO) {
        excludedMallRows++;
        continue;
      }
      if (seen.has(row.MGTNO)) continue;
      seen.add(row.MGTNO);
      counts[district]++;
    }
    start = end + 1;
  } while (start <= total);
  if (!seen.size) throw new Error('No operating large supermarkets returned');
  return {counts, excludedMallRows};
}

async function pool(items, limit, operation) {
  let next = 0;
  const results = Array(items.length);
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await operation(items[index]);
    }
  }));
  return results;
}

function score(rows) {
  return Object.fromEntries(rows.map(([name, counts]) => {
    const categories = Object.fromEntries(Object.entries(measures).map(([key, [label, maximum]]) => {
      const count = counts[key];
      const rank = 1 + rows.filter(([, other]) => other[key] > count).length;
      const points = count === 0 ? 0 : maximum * (6 - Math.ceil(rank / 5)) / 5;
      return [key, {label, count, rank, points}];
    }));
    return [name, {score: Object.values(categories).reduce((sum, item) => sum + item.points, 0), categories}];
  }));
}

async function collect({shopKey, hospKey, pharmKey, seoulKey}) {
  let malls;
  try { malls = await mallCounts(seoulKey); }
  catch (error) {
    const safe = /^(Upstream HTTP [0-9]{3}|Mall API failure|Incomplete mall records|Invalid mall record|No operating large supermarkets returned)$/.test(error.message);
    throw new Error('mall: ' + (safe ? error.message : 'lookup failed'));
  }
  const jobs = districts.flatMap(([name, storeCode], index) => {
    const hiraCode = 110001 + index;
    return [
      [name, 'convenience', () => commercialCount(shopKey, storeCode)],
      [name, 'pharmacy', () => medicalCount(pharmKey, hiraCode, true)],
      [name, 'medical', () => medicalCount(hospKey, hiraCode, false)],
      ...medicalExclusions.map(code =>
        [name, 'excluded', () => medicalCount(hospKey, hiraCode, false, code)])
    ];
  });
  const rows = new Map(districts.map(([name]) =>
    [name, {convenience: 0, supermarket: malls.counts[name], pharmacy: 0, medical: 0, excluded: 0}]
  ));
  const values = await pool(jobs, 12, async ([name, key, query]) => {
    try {
      return await query();
    } catch (error) {
      const status = /^(Upstream HTTP [0-9]{3}|HIRA code ([0-9]{1,3}|missing)|Invalid count)$/.test(error.message)
        ? error.message : error.name === 'TimeoutError' ? 'timeout' : 'lookup failed';
      throw new Error(name + ' ' + key + ': ' + status);
    }
  });
  jobs.forEach(([name, key], index) => { rows.get(name)[key] += values[index]; });
  for (const [name, row] of rows) {
    if (row.excluded > row.medical) throw new Error('medical counts disagree: ' + name);
    row.medical -= row.excluded;
  }
  return {updatedAt: new Date().toISOString(), districts: score([...rows]), excludedMallRows: malls.excludedMallRows};
}

const baseline = require('../dist/district-amenities-snapshot.json');
let cached = baseline;
let running;
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Method not allowed'});
  }
  const {
    PUBLIC_DATA_API_KEY,
    SHOP_API_KEY: shopKey = PUBLIC_DATA_API_KEY,
    HOSP_API_KEY: hospKey = PUBLIC_DATA_API_KEY,
    PHARM_API_KEY: pharmKey = PUBLIC_DATA_API_KEY,
    SEOUL_API_KEY: seoulKey
  } = process.env;
  if (![shopKey, hospKey, pharmKey, seoulKey].every(Boolean)) {
    return res.status(503).json({error: 'Facility API credentials are not configured'});
  }
  try {
    const maxAge = 86400;
    if (!cached || Date.now() - Date.parse(cached.updatedAt) >= maxAge * 1000) {
      running ??= collect({shopKey, hospKey, pharmKey, seoulKey})
        .then(result => { cached = result; })
        .finally(() => { running = undefined; });
      await running;
    }
    res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(cached);
  } catch {
    res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=300');
    return res.status(200).json(cached);
  }
};
module.exports.score = score;

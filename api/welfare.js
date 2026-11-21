module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const age = req.query.age;
  if (age !== undefined && (typeof age !== 'string' || !/^\d{1,3}$/.test(age) || Number(age) > 120)) {
    return res.status(400).end();
  }
  const key = process.env.WELFARE_API_KEY?.trim();
  if (!key) return res.status(503).end();
  try {
    const url = new URL('https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001');
    url.search = new URLSearchParams({serviceKey: decodeURIComponent(key), callTp:'L', pageNo:'1',
      numOfRows:'100', srchKeyCode:'003', searchWrd:'주거', ...(age === undefined ? {} : {age})});
    const result = await fetch(url, {signal: AbortSignal.timeout(18000)});
    const xml = await result.text();
    if (!result.ok || !/<wantedList[\s>]/.test(xml) || !/<totalCount>\s*\d+\s*<\/totalCount>/.test(xml)) {
      return res.status(502).end();
    }
    res.setHeader('Content-Type','application/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Vercel-CDN-Cache-Control','s-maxage=3600');
    return res.status(200).send(xml);
  } catch {
    return res.status(502).end();
  }
};

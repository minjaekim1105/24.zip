'use strict';

// Integrated from the teammate's Seoul open-data rent analyzer (tbLnOpendataRentV).
// IMPORTANT: transaction records are NOT currently available listings or unique homes.
const cache = new Map();
const running = new Map();
const TTL = 30 * 60 * 1000;
const SAMPLE_PAGES = 10;
// const API_BASE = 'https://openapi.seoul.go.kr:8088';
const API_BASE = 'http://openapi.seoul.go.kr:8088';
function validateInput(input) {
  if(!input || typeof input!=='object' || input.budget==null || input.monthlyRentBudget==null || String(input.budget).trim()==='' || String(input.monthlyRentBudget).trim()==='') throw new Error('보증금·월세 예산을 입력해 주세요.');
  const budget = Number(input.budget); // deposit, in 10,000 KRW
  const monthlyRentBudget = Number(input.monthlyRentBudget); // rent, in 10,000 KRW, management not in source
  const year = String(input.year || '2026');
  if (!/^20\d\d$/.test(year) || !Number.isFinite(budget) || !Number.isFinite(monthlyRentBudget) || budget<0 || monthlyRentBudget<0 || budget>10000000 || monthlyRentBudget>1000000) throw new Error('보증금·월세 예산 또는 연도 입력이 올바르지 않습니다.');
  return {year,budget,monthlyRentBudget};
}
async function page(key,year,index,total) {
  const start = (index-1)*1000+1;
  const end = total == null ? start+999 : Math.min(start+999,total);
  const url = `${API_BASE}/${encodeURIComponent(key)}/json/tbLnOpendataRentV/${start}/${end}/${year}/`;
  let last;
  for (let n=0;n<3;n++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error('서울시 공공데이터 서버 HTTP '+response.status);
      const json=await response.json();
      if (json.RESULT?.CODE && json.RESULT.CODE!=='INFO-000') throw new Error(json.RESULT.MESSAGE || json.RESULT.CODE);
      const result=json.tbLnOpendataRentV;
      if (!result || !Array.isArray(result.row)) throw new Error('전월세 API 응답 데이터 없음');
      return {total:Number(result.list_total_count)||0,rows:result.row};
    } catch(e) {last=e;if(n<2)await new Promise(r=>setTimeout(r,(n+1)*500));}
  }
  throw last;
}
// Reproducible evenly spread page indices (instead of changing random sample on every query).
function samplePageIds(totalPages) {
  const count=Math.min(totalPages,SAMPLE_PAGES);
  if(count<=1)return [1];
  return Array.from({length:count},(_,i)=>1+Math.round((totalPages-1)*i/(count-1)));
}
function summarize(rows,filters) {
  const districts=new Map();
  const neighborhoods=new Map();
  const rents=new Map();
  const deposits=new Map();
  for (const row of rows) {
    const name=String(row.CGG_NM||'').trim();
    const code=String(row.CGG_CD||'').trim();
    if (!name || !code)continue;
    if (!districts.has(name))districts.set(name,{regionName:name,regionCode:code,totalCount:0,monthlyTransactionCount:0,validMonthlyTransactionCount:0,conditions:{allMatchCount:0}});
    const d=districts.get(name);d.totalCount++;
    // User seeks monthly rent: exclude jeonse even though teammate's 'any' filter allowed it.
    if (String(row.RENT_SE||'').trim()!=='월세')continue;
    d.monthlyTransactionCount++;
    const amount=value=>value==null||String(value).trim()===''?NaN:Number(String(value).replaceAll(',',''));
    const deposit=amount(row.GRFE), rent=amount(row.RTFE);
    if(!Number.isFinite(deposit)||!Number.isFinite(rent)||deposit<0||rent<0)continue;
    d.validMonthlyTransactionCount++;
    if(!rents.has(name)) rents.set(name,[]);
    rents.get(name).push(rent);
    if(!deposits.has(name)) deposits.set(name,[]);
    deposits.get(name).push(deposit);
    const match=deposit<=filters.budget&&rent<=filters.monthlyRentBudget;
    if(match)d.conditions.allMatchCount++;
    const dong=String(row.STDG_NM || row.BJDONG_NM || '').trim();
    if(dong){
      if(!neighborhoods.has(name)) neighborhoods.set(name,new Map());
      const group=neighborhoods.get(name);
      if(!group.has(dong)) group.set(dong,{name:dong,valid:0,match:0});
      const item=group.get(dong);
      item.valid++;
      if(match)item.match++;
    }
  }
  for(const d of districts.values()){
    d.neighborhoods=Array.from(neighborhoods.get(d.regionName)?.values() || []);
    d.medianRent=median(rents.get(d.regionName));
    d.medianDeposit=median(deposits.get(d.regionName));
  }
  return [...districts.values()].sort((a,b)=>b.conditions.allMatchCount-a.conditions.allMatchCount);
}
function median(values){
  if(!values?.length)return null;
  values.sort((a,b)=>a-b);
  const middle=Math.floor(values.length/2);
  return (values[middle]+values[Math.floor((values.length-1)/2)])/2;
}
async function analyze(input,provider=process.env.SEOUL_API_KEY) {
  const f=validateInput(input);
  if(!provider)throw new Error('SEOUL_API_KEY 환경변수를 설정해야 합니다.');
  const cacheKey=JSON.stringify(f),previous=cache.get(cacheKey);
  if(previous&&Date.now()-previous.at<TTL)return {...previous.data,cached:true};
  if(running.has(cacheKey))return running.get(cacheKey);
  const job=(async()=>{
    const first=await page(provider,f.year,1);
    const totalPages=Math.ceil(first.total/1000);
    const pages=samplePageIds(totalPages);
    const all=[...first.rows];
    for(let i=0;i<pages.length;i+=3){
      const group=pages.slice(i,i+3).filter(x=>x!==1);
      const fetched=await Promise.all(group.map(x=>page(provider,f.year,x,first.total)));
      for(const item of fetched)all.push(...item.rows);
    }
    const data={year:f.year,totalRecords:first.total,analyzedRecords:all.length,pageCount:pages.length,totalPages,partial:pages.length<totalPages,sampling:pages.length<totalPages,selectedPages:pages,districts:summarize(all,f),source:'서울시 부동산 전월세가 정보',measure:'해당 연도 조건 충족 월세 거래 기록 표본 건수 (실시간 매물·고유 주택 수 아님)',managementFeeIncluded:false};
    cache.set(cacheKey,{at:Date.now(),data});
    return {...data,cached:false};
  })();
  running.set(cacheKey,job);
  try{return await job;}finally{running.delete(cacheKey);}
}
module.exports={analyze,summarize,samplePageIds,validateInput};

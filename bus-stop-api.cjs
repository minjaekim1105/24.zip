'use strict';
// 서울 열린데이터광장: busStopLocationXyInfo (정류소 위치 좌표)
let cache = {expires:0, rows:[]};
const valid = n => Number.isFinite(n);
async function load() {
  if (cache.expires > Date.now()) return cache.rows;
  const key=process.env.SEOUL_API_KEY;
  if (!key) throw new Error('SEOUL_API_KEY 환경변수가 설정되지 않았습니다.');
  const getPage=async(start,end)=>{
    const url=`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/busStopLocationXyInfo/${start}/${end}/`;
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('서울시 API 응답 오류: '+response.status);
    const data=await response.json();
    const payload=data.busStopLocationXyInfo;
    if(!payload || (payload.RESULT && payload.RESULT.CODE!=='INFO-000'))throw new Error(payload?.RESULT?.MESSAGE||data.RESULT?.MESSAGE||'정류소 데이터 형식 오류');
    return {total:Number(payload.list_total_count)||0,rows:payload.row||[]};
  };
  const first=await getPage(1,1000);
  const pages=[];
  for(let start=1001;start<=Math.min(first.total,30000);start+=1000)pages.push([start,Math.min(start+999,first.total)]);
  const rest=await Promise.all(pages.map(([start,end])=>getPage(start,end)));
  const rows=[...first.rows,...rest.flatMap(p=>p.rows)].map(r=>({
    id:String(r.STOPS_NO||''),name:String(r.STOPS_NM||''),lat:Number(r.YCRD),lng:Number(r.XCRD)
  })).filter(r=>r.id&&valid(r.lat)&&valid(r.lng)&&r.lat>37&&r.lat<38&&r.lng>126&&r.lng<128);
  cache={rows,expires:Date.now()+60*60*1000};
  return rows;
}
module.exports=async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=300');
  if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({error:'Method not allowed'}));return;}
  try{
    const u=new URL(req.url,'http://localhost');
    const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng'));
    const radius=Math.min(Math.max(Number(u.searchParams.get('radius'))||800,100),2000);
    if(!valid(lat)||!valid(lng)||lat<37||lat>38||lng<126||lng>128)throw new Error('서울 지역의 위도와 경도를 입력해 주세요.');
    const rows=await load();
    const selected=rows.map(r=>({...r,distance:Math.round(Math.hypot((r.lat-lat)*111320,(r.lng-lng)*111320*Math.cos(lat*Math.PI/180)))}))
      .filter(r=>r.distance<=radius).sort((a,b)=>a.distance-b.distance).slice(0,80);
    res.statusCode=200;res.end(JSON.stringify({source:'서울 열린데이터광장 busStopLocationXyInfo',count:selected.length,stops:selected}));
  }catch(error){res.statusCode=error.message.includes('환경변수')?503:502;res.end(JSON.stringify({error:error.message}));}
};

const cache=new Map();
function transitBreakdown(steps) {
  if (!Array.isArray(steps) || !steps.length) return null;
  const totals = {BUS: 0, SUBWAY: 0, WALKING: 0};
  const missing = new Set();
  let unknown=false;
  for (const step of steps) {
    const {type, time} = step?.properties ?? {};
    if (!Object.hasOwn(totals, type)) {if(!['WAITING','TRANSFER'].includes(type))unknown=true;continue;}
    if (!Number.isFinite(time) || time < 0) missing.add(type);
    else totals[type] += time;
  }
  const minutes = type => unknown || missing.has(type) ? null : totals[type] / 60;
  return {bus: minutes('BUS'), subway: minutes('SUBWAY'), walk: minutes('WALKING')};
}
function normalize(json,mode,httpStatus=200) {
  if(httpStatus===429||/LIMIT|QUOTA/i.test(String(json.status??json.code??'')))return {status:'rate_limit',message:'카카오 경로 조회 한도 초과',provider:'Kakao',httpStatus};
  if(json.status!=='OK')return {status:json.status==='NO_RESULTS'||json.status==='ROUTE_RESULT_NOT_FOUND'?'no_route':'error',message:'카카오 경로 조회 실패 · '+String(json.status??json.code??httpStatus),provider:'Kakao',providerCode:json.status??json.code??null,httpStatus};
  const candidates=mode==='transit'&&Array.isArray(json.routes)?json.routes:[];
  const selection=mode==='transit'?candidates.reduce((best,route,index)=>{
    const seconds=route?.properties?.totalTime;
    if(!Number.isFinite(seconds)||seconds<0)return best;
    return !best||seconds<best.seconds?{route,index,seconds}:best;
  },null):null;
  const route=mode==='transit'?selection?.route:json.route;
  const seconds=route?.properties?.totalTime;
  if(!Number.isFinite(seconds)||seconds<0)return {status:'no_route',message:'카카오 경로 응답에 총시간 없음'};
  const first=mode==='transit'?route.steps?.[0]?.properties:null;
  const lastVehicle=mode==='transit'&&Array.isArray(route.steps)?route.steps.filter(s=>['BUS','SUBWAY'].includes(s.properties?.type)).at(-1):null;
  const end=lastVehicle?.path?.points?.at(-1);
  const alightingCoords=Array.isArray(end)&&Number.isFinite(end[0])&&Number.isFinite(end[1])?{lat:end[1],lng:end[0]}:null;
  return {status:'ok',minutes:seconds/60,firstWalkMinutes:first?.type==='WALKING'&&Number.isFinite(first.time)?first.time/60:null,
    transitBreakdown:mode==='transit'?transitBreakdown(route.steps):null,
    transitUsed:mode==='transit'&&Array.isArray(route.steps)&&route.steps.length?Object.fromEntries([['subway','SUBWAY'],['bus','BUS'],['walk','WALKING']].map(([key,type])=>[key,route.steps.some(step=>step?.properties?.type===type)])):null,
    ...(mode==='transit'?{routeSelection:'shortest-returned-time',alightingCoords,selectedRouteIndex:selection.index,returnedRouteCount:candidates.length}:{}),
    walkingIncluded:mode==='transit',provider:'Kakao',providerCode:json.status,httpStatus,
    fetchedAt:new Date().toISOString()};
}
async function route(input) {
  if(!["gwanak","gwangjin","dongjak","dongdaemun","eunpyeong","gangnam","seocho","yeongdeungpo","songpa","jung","seongbuk","mapo","nowon","gangseo"].includes(input.districtId))return {status:'unsupported',message:'현재 탐색 대상 자치구가 아니에요.'};
  const secret=process.env.KAKAO_REST_API_KEY;
  if(!secret)return {status:'configuration',message:'KAKAO_REST_API_KEY 설정 필요'};
  const key=JSON.stringify([input.origin,input.destination,input.mode]);
  const previous=cache.get(key);
  if(previous&&Date.now()-previous.created<300000)return previous.promise;
  const promise=(async()=>{
    const url=new URL('https://dapi.kakao.com/v2/routing/'+(input.mode==='transit'?'publictraffic':'walk'));
    for(const [name,value]of Object.entries({start_x:input.origin.lng,start_y:input.origin.lat,end_x:input.destination.lng,end_y:input.destination.lat,input_coord:'WGS84'}))url.searchParams.set(name,String(value));
    try{
      const response=await fetch(url,{headers:{Authorization:'KakaoAK '+secret},signal:AbortSignal.timeout(20000),redirect:'error'});
      const result=normalize(await response.json(),input.mode,response.status);
      if(input.mode==='transit'&&result.status==='ok'){
        if(result.alightingCoords){
          const walk=await route({...input,mode:'walk',origin:result.alightingCoords});
          result.alightingWalkMinutes=walk.status==='ok'?walk.minutes:null;
          result.alightingWalkStatus=walk.status;
          result.alightingWalkSource='도보 API 별도 조회 · 총 이동시간에 추가 합산하지 않음';
        }else{result.alightingWalkMinutes=null;result.alightingWalkStatus='no_coordinates';}
      }
      return result;
    }catch{return {status:'error',message:'카카오 경로 서버 연결 오류 또는 시간 초과'};}
  })();
  if(cache.size>=100)cache.delete(cache.keys().next().value);
  cache.set(key,{created:Date.now(),promise});
  const result=await promise;if(result.status!=='ok')cache.delete(key);
  return result;
}
module.exports={route,normalize};

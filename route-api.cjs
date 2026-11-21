const cache=new Map();
module.exports=async function route(request,response){
  response.setHeader('Content-Type','application/json; charset=utf-8');
  response.setHeader('Cache-Control','no-store');
  const send=(data,code=200)=>{response.writeHead(code);response.end(JSON.stringify(data));};
  if(request.method!=='POST'){send({status:'error',message:'POST 요청이 필요해요.'},405);return;}
  let body='';
  try{
    for await(const chunk of request){body+=chunk;if(body.length>4096)throw Error('too large');}
    const input=JSON.parse(body);
    if(!["gwanak","gwangjin","dongjak","dongdaemun","eunpyeong","gangnam","seocho","yeongdeungpo","songpa","jung","seongbuk","mapo","nowon","gangseo"].includes(input.districtId)){send({status:'unsupported',message:'현재 탐색 대상 자치구가 아니에요.'},400);return;}
    const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>=33&&p.lat<=39&&p.lng>=124&&p.lng<=132;
    if(!valid(input.origin)||!valid(input.destination)){send({status:'error',message:'출발·도착 좌표를 확인해 주세요.'},400);return;}
    if(['transit','walk'].includes(input.mode)){send(await require('./kakao-route-api.cjs').route(input));return;}
    if(input.mode!=='car'){send({status:'unsupported',message:'선택한 수단의 실제 경로 서비스 미연동'});return;}
    const secret=process.env.KAKAO_MOBILITY_REST_API_KEY || process.env.KAKAO_REST_API_KEY;
    if(!secret){send({status:'configuration',message:'자가용 경로 REST API 키 설정 필요'});return;}
    const key=JSON.stringify(input);
    const existing=cache.get(key);
    if(existing&&Date.now()-existing.created<300000){send(await existing.promise);return;}
    const promise=(async()=>{
      const url=new URL('https://apis-navi.kakaomobility.com/v1/directions');
      url.searchParams.set('origin',input.origin.lng+','+input.origin.lat);
      url.searchParams.set('destination',input.destination.lng+','+input.destination.lat);
      url.searchParams.set('summary','true');
      const result=await fetch(url,{headers:{Authorization:'KakaoAK '+secret},signal:AbortSignal.timeout(15000)});
      if(result.status===429)return {status:'rate_limit',message:'차량 경로 조회 한도 초과'};
      if(!result.ok)return {status:'error',message:result.status===401||result.status===403?'경로 API 인증·사용 권한 확인 필요':'경로 제공사 조회 오류'};
      const json=await result.json(),route=json.routes?.[0];
      if(route?.result_code!==0||!Number.isFinite(route.summary?.duration))return {status:'no_route',message:'조회 가능한 차량 경로 없음'};
      return {status:'ok',minutes:route.summary.duration/60,firstWalkMinutes:null,provider:'Kakao Mobility',fetchedAt:new Date().toISOString()};
    })();
    if(cache.size>300)cache.delete(cache.keys().next().value);
    cache.set(key,{created:Date.now(),promise});
    const result=await promise;
    if(result.status!=='ok')cache.delete(key);
    send(result);
  }catch{send({status:'error',message:'경로 조회 요청 실패'},502);}
};

const candidates = {
  seongbuk:[['길음 생활권','서울 성북구 길음뉴타운래미안9단지아파트'],['종암 생활권','서울 성북구 종암삼성래미안아파트'],['돈암 생활권','서울 성북구 돈암현대아파트']],
  mapo:[['아현 생활권','서울 마포구 마포래미안푸르지오아파트'],['성산 생활권','서울 마포구 성산시영아파트'],['상암 생활권','서울 마포구 상암월드컵파크4단지아파트']],
  nowon:[['상계 생활권','서울 노원구 상계주공7단지아파트'],['중계 생활권','서울 노원구 중계건영3차아파트'],['월계 생활권','서울 노원구 월계그랑빌아파트']],
  gangseo:[['화곡 생활권','서울 강서구 화곡푸르지오아파트'],['등촌 생활권','서울 강서구 등촌아이파크아파트'],['마곡 생활권','서울 강서구 마곡엠밸리7단지아파트']],
  gwanak:[['서울대입구역 인근','서울 관악구 관악푸르지오'],['신림역 인근','서울 관악구 신림푸르지오'],['낙성대역 인근','서울 관악구 낙성대현대아파트']],
  gwangjin:[['건대입구역 인근','서울 광진구 자양현대아파트'],['구의역 인근','서울 광진구 구의현대2단지아파트'],['중곡역 인근','서울 광진구 중곡SK아파트']],
  dongjak:[['상도역 인근','서울 동작구 상도래미안1차아파트'],['흑석역 인근','서울 동작구 흑석한강푸르지오'],['노량진역 인근','서울 동작구 신동아리버파크']],
  dongdaemun:[['답십리 생활권','서울 동대문구 답십리래미안위브'],['전농 생활권','서울 동대문구 래미안크레시티'],['이문 생활권','서울 동대문구 이문e편한세상']],
  eunpyeong:[['녹번 생활권','서울 은평구 북한산푸르지오'],['응암 생활권','서울 은평구 백련산힐스테이트1차'],['진관 생활권','서울 은평구 은평뉴타운상림마을']],
  gangnam:[['역삼 생활권','서울 강남구 역삼래미안'],['대치 생활권','서울 강남구 대치삼성아파트'],['일원 생활권','서울 강남구 수서까치마을아파트']],
  seocho:[['서초 생활권','서울 서초구 서초래미안아파트'],['반포 생활권','서울 서초구 반포자이'],['양재 생활권','서울 서초구 양재우성아파트']],
  yeongdeungpo:[['문래 생활권','서울 영등포구 문래자이'],['당산 생활권','서울 영등포구 당산삼성래미안'],['신길 생활권','서울 영등포구 신길래미안에스티움']],
  songpa:[['잠실 생활권','서울 송파구 잠실엘스'],['문정 생활권','서울 송파구 문정래미안'],['가락 생활권','서울 송파구 가락쌍용1차아파트']],
  jung:[['신당 생활권','서울 중구 신당삼성아파트'],['황학 생활권','서울 중구 황학롯데캐슬베네치아'],['중림 생활권','서울 중구 중림삼성사이버빌리지']]
};
// Main service uses actual major-station coordinates, never nearby apartment coordinates.
const stationOrigins={gwanak:['신림역','서울대입구역','봉천역'],gwangjin:['건대입구역','구의역','강변역'],dongjak:['사당역','이수역','노량진역'],dongdaemun:['청량리역','회기역','외대앞역'],eunpyeong:['불광역','연신내역','구파발역'],gangnam:['강남역','선릉역','삼성역'],seocho:['교대역','서초역','고속터미널역'],yeongdeungpo:['여의도역','영등포역','당산역'],songpa:['잠실역','잠실새내역','종합운동장역'],jung:['시청역','을지로입구역','을지로3가역']};
const stationDistrictNames={gwanak:'관악구',gwangjin:'광진구',dongjak:'동작구',dongdaemun:'동대문구',eunpyeong:'은평구',gangnam:'강남구',seocho:'서초구',yeongdeungpo:'영등포구',songpa:'송파구',jung:'중구'};
for(const [id,names] of Object.entries(stationOrigins))candidates[id]=names.map(name=>[name,'서울 '+stationDistrictNames[id]+' '+name+' 지하철역']);
window.neighborhoodRoutes = (() => {
  const origins=new Map(),requests=new Map(),pointCache=new Map();
  const ttl=300000;
  const hasCoordinates=h=>Number.isFinite(h.destinationCoords?.lat)&&Number.isFinite(h.destinationCoords?.lng);
  function key(h,id){return JSON.stringify([id,h.destinationCoords?.lat,h.destinationCoords?.lng,h.mode]);}
  function aggregate(points,limit){
    const successful=points.filter(p=>p.status==='ok'&&Number.isFinite(p.minutes)&&p.minutes>=0);
    const times=successful.map(p=>p.minutes).sort((a,b)=>a-b);
    return {points,registered:points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).length,count:times.length,
      min:times.length?times[0]:null,max:times.length?times[times.length-1]:null,
      median:times.length>=2?(times[Math.floor((times.length-1)/2)]+times[Math.ceil((times.length-1)/2)])/2:null,
      within:limit!==''&&limit!=null?times.filter(t=>t<=Number(limit)).length:null};
  }
  async function resolveOrigins(district,retry=false){
    if(!retry&&origins.has(district.id))return origins.get(district.id);
    const old=origins.has(district.id)?await origins.get(district.id):[];
    const promise=Promise.all((candidates[district.id]??[]).slice(0,3).map(async([name,query],index)=>{
      if(old[index]?.status==='registered')return old[index];
      const station=Boolean(stationOrigins[district.id]);
      const base={id:district.id+(station?'-station-':'-')+index,name};
      try{
        const matches=await window.realMaps.search(query);
        const match=matches.find(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.address.includes(district.name)&&(station?p.name.trim().split(/\s+/)[0]===name:/아파트|푸르지오|래미안|자이|힐스테이트|캐슬|e편한/i.test(p.name)));
        if(!match)return {...base,status:'origin_missing',message:station?'주요 역 좌표 확인 실패':'주거 기준점 좌표 확인 실패'};
        return {...base,lat:match.lat,lng:match.lng,address:match.address,locationName:match.name,source:'Kakao Places 검색 확인',status:'registered'};
      }catch{return {...base,status:'origin_error',message:'기준점 검색 연결 오류'};}
    }));origins.set(district.id,promise);return promise;
  }
  async function loadDistrict(h,district,onUpdate=()=>{},retry=false){
    if(!h.destination||!hasCoordinates(h))return;
    if(!Object.hasOwn(candidates,district.id))return;
    const requestKey=key(h,district.id),existing=requests.get(requestKey);
    if(existing?.status==='loading')return existing.promise;
    if(!retry&&existing&&Date.now()-existing.created<ttl)return existing.promise;
    const entry={created:Date.now(),status:'loading',points:existing?.points??[]};
    requests.set(requestKey,entry);
    entry.promise=(async()=>{
      const points=await resolveOrigins(district,retry);
      entry.points=points.map(p=>entry.points.find(old=>old.id===p.id&&old.status==='ok')??p);onUpdate();
      const results=await Promise.all(points.map(async(point,index)=>{
        if(!Number.isFinite(point.lat))return point;
        const pointKey=JSON.stringify([district.id,point.id,point.lat,point.lng,h.destinationCoords.lat,h.destinationCoords.lng,h.mode]);
        let cached=pointCache.get(pointKey);
        if(!cached||Date.now()-cached.created>=ttl||(!cached.pending&&cached.result?.status!=='ok')){
          cached={created:Date.now(),pending:true};pointCache.set(pointKey,cached);
          cached.promise=(async()=>{try{
            const response=await fetch('/api/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({districtId:district.id,origin:{lat:point.lat,lng:point.lng},destination:h.destinationCoords,mode:h.mode})});
            const data=await response.json();return response.status===429?{status:'rate_limit',message:'조회 한도 초과 · 잠시 후 다시 시도해 주세요.'}:data;
          }catch{return {status:'error',message:'경로 서버 연결 오류'};}})().then(data=>{cached.pending=false;cached.result=data;return data;});
        }
        const result={...point,...await cached.promise};entry.points[index]=result;onUpdate();return result;
      }));entry.points=results;entry.status='complete';entry.created=Date.now();onUpdate();
    })();onUpdate();return entry.promise;
  }
  function get(h,id){
    if(!h.destination)return {status:'no_destination',...aggregate([],h.maxMinutes)};
    if(!hasCoordinates(h))return {status:'no_coordinates',...aggregate([],h.maxMinutes)};
    const data=requests.get(key(h,id));
    if(!data||Date.now()-data.created>=ttl&&data.status!=='loading')return {status:'idle',...aggregate([],h.maxMinutes)};
    return {status:data.status,...aggregate(data.points??[],h.maxMinutes)};
  }
  return {loadDistrict,get,aggregate};
})();

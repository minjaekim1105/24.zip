const districts = [
  { id:'gwanak', name:'관악구', deposit:1000, rent:50, management:7, access:92, culture:74, origin:'신림역', rail:'신림역 · 2호선, 신림선', dailyScore:79, localWalk:{station:5,amenities:8}, travel:{강남역:{transit:{total:33,includesWalking:true},walk:105,car:29}, 여의도역:{transit:{total:28,includesWalking:true},walk:112,car:27}} },
  { id:'gwangjin', name:'광진구', deposit:1500, rent:65, management:8, access:90, culture:94, origin:'건대입구역', rail:'건대입구역 · 2호선, 7호선', dailyScore:89, localWalk:{station:6,amenities:5}, travel:{강남역:{transit:{total:23,includesWalking:true},walk:96,car:25}, 여의도역:{transit:{total:42,includesWalking:true},walk:245,car:41}} },
  { id:'eunpyeong', name:'은평구', deposit:1200, rent:55, management:6, access:83, culture:81, origin:'불광역', rail:'불광역 · 3호선, 6호선', dailyScore:85, localWalk:{station:9,amenities:7}, travel:{강남역:{transit:{total:52,includesWalking:true},walk:260,car:55}, 여의도역:{transit:{total:36,includesWalking:true}}} },
  { id:'guro', name:'구로구', origin:'구로디지털단지역', rail:'구로디지털단지역 · 2호선', deposit:1000, rent:62, access:86, culture:72, dailyScore:76, travel:{강남역:{transit:{total:31,includesWalking:false,walkToStop:6,walkFromStop:3},walk:185}, 여의도역:{transit:{total:31,includesWalking:true},walk:95}} },
  { id:'mapo', name:'마포구', origin:'망원역', rail:'망원역 · 6호선', deposit:2000, rent:72 },
  { id:'seongdong', name:'성동구' },
  { id:'jongno', name:'종로구' }, { id:'jung', name:'중구' }, { id:'yongsan', name:'용산구' },
  { id:'dongdaemun', name:'동대문구' }, { id:'jungnang', name:'중랑구' }, { id:'seongbuk', name:'성북구' },
  { id:'gangbuk', name:'강북구' }, { id:'dobong', name:'도봉구' }, { id:'nowon', name:'노원구' },
  { id:'seodaemun', name:'서대문구' }, { id:'yangcheon', name:'양천구' }, { id:'gangseo', name:'강서구' },
  { id:'geumcheon', name:'금천구' }, { id:'yeongdeungpo', name:'영등포구' }, { id:'dongjak', name:'동작구' },
  { id:'seocho', name:'서초구' }, { id:'gangnam', name:'강남구' }, { id:'songpa', name:'송파구' },
  { id:'gangdong', name:'강동구' }
];
const candidateIds = ['gwanak','gwangjin','dongjak','dongdaemun','eunpyeong','gangnam','seocho','yeongdeungpo','songpa','jung'];
// Comparable fictional fixtures, all using the same units and scoring fields.
const candidateFixtures = [
  ['dongjak',1500,62,8,88,83,80,'사당역',27,38,130,170,30,36],
  ['dongdaemun',1200,53,7,86,85,82,'청량리역',45,48,210,230,43,47],
  ['gangnam',3000,95,12,94,96,97,'선릉역',15,40,38,210,16,42],
  ['seocho',2500,85,10,91,90,88,'교대역',18,35,45,180,19,37],
  ['yeongdeungpo',1800,70,9,90,88,87,'여의도역',38,12,180,20,35,10],
  ['songpa',2000,78,9,88,90,93,'잠실역',30,52,125,260,32,50],
  ['jung',2200,80,10,93,92,90,'시청역',40,30,200,145,38,29]
];
for (const [id,deposit,rent,management,access,dailyScore,culture,origin,gangnamTransit,yeouidoTransit,gangnamWalk,yeouidoWalk,gangnamCar,yeouidoCar] of candidateFixtures) {
  Object.assign(districts.find((d) => d.id === id), {
    deposit,rent,management,access,dailyScore,culture,origin,rail:origin + ' 인근 예시 노선',
    localWalk:{station:6,amenities:7},
    travel:{
      강남역:{transit:{total:gangnamTransit,includesWalking:true},walk:gangnamWalk,car:gangnamCar},
      여의도역:{transit:{total:yeouidoTransit,includesWalking:true},walk:yeouidoWalk,car:yeouidoCar}
    }
  });
}
// Use the same ten districts throughout residence and destination selection.
for (let index = districts.length - 1; index >= 0; index--) {
  if (!candidateIds.includes(districts[index].id)) districts.splice(index,1);
}
const priorities={housing:{label:'주거비'},commute:{label:'이동시간'},convenience:{label:'생활 편의시설'}};
const criterionKeys=Object.keys(priorities);
const canonicalCriterion=key=>({budget:'housing',transport:'commute',daily:'convenience',housing:'housing',commute:'commute',convenience:'convenience'})[key]??'';
const legacyCriterion=key=>({housing:'budget',commute:'transport',convenience:'daily'})[canonicalCriterion(key)]??'';
const amenityEvaluations = new Map();
let amenityLookupStarted = false;

async function loadDistrictAmenities() {
  const response = await fetch('/api/district-amenities', {
    signal: AbortSignal.timeout(305000)
  });
  if (!response.ok) throw new Error('District amenities unavailable');
  const payload = await response.json();
  applyDistrictAmenities(payload);
  try { localStorage.setItem('24zip-district-counts-v1', JSON.stringify(payload)); } catch {}
}

function applyDistrictAmenities({districts: results, updatedAt}) {
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error('Invalid update date');
  const evaluations = districts.map(district => {
    const result = results?.[district.name];
    const categories = ['convenience', 'supermarket', 'pharmacy', 'medical']
      .map(key => result?.categories?.[key]);
    if (!Number.isFinite(result?.score) || result.score < 0 || result.score > 100 ||
        categories.some(item => typeof item?.label !== 'string' ||
          !Number.isSafeInteger(item.count) || item.count < 0 ||
          !Number.isFinite(item.points) || item.points < 0) ||
        result.score !== categories.reduce((sum, item) => sum + item.points, 0)) {
      throw new Error('Incomplete district amenities');
    }
    const breakdown = categories.map(({label, count, rank, points}) =>
      label + ' ' + count.toLocaleString('ko-KR') + '곳 · ' + rank + '위 (' + points + '점)').join(' · ');
    return [district.id, {status:'evaluated', score:result.score,
      dataSource:'공공데이터·서울 열린데이터광장', evaluatedAt:updatedAt,
      details:new Date(updatedAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}) + ' 집계 · 서울 25개 자치구 내 시설 수 순위 · ' + breakdown}];
  });
  for (const [id, evaluation] of evaluations) amenityEvaluations.set(id, evaluation);
}

async function ensureAmenityAnalysis() {
  if (!criterionAvailability.convenience || amenityLookupStarted) return;
  amenityLookupStarted = true;
  for (const district of districts) amenityEvaluations.set(district.id, {status:'loading', details:'생활 편의시설 조회 중…'});
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem('24zip-district-counts-v1'));
    applyDistrictAmenities(saved);
  } catch { saved = null; }
  const refresh = () => {
    if (!['results','map'].includes(state.page)) return;
    const y = window.scrollY;
    render(state.page,false);
    window.scrollTo(0,y);
  };
  if (!saved || Date.now() - Date.parse(saved.updatedAt) >= 86400000) {
    try {
      const response = await fetch('/api/scorecard').then(r=>r.ok?r:fetch('/district-amenities-snapshot.json')).catch(()=>fetch('/district-amenities-snapshot.json'));
      if (response.ok) {
        const snapshot = await response.json();
        if (!saved || Date.parse(snapshot.updatedAt) > Date.parse(saved.updatedAt)) {
          applyDistrictAmenities(snapshot);
          saved = snapshot;
        }
      }
    } catch { /* Live lookup below can still supply facility counts. */ }
  }
  if (saved) {
    refresh();
    if (Date.now() - Date.parse(saved.updatedAt) < 86400000) return;
  }
  try {
    await loadDistrictAmenities();
  } catch {
    if (saved) return;
    for (const district of districts) amenityEvaluations.set(district.id, {
      status:'unrated', details:'자치구별 시설 수를 조회하지 못했습니다.'
    });
  }
  refresh();
}

const criterionAvailability={housing:true,commute:true,convenience:true};
function selectedOrder(h){
 const keys=Array.isArray(h.priorityOrder)?h.priorityOrder:[h.priority];
 return [...new Set(keys.map(canonicalCriterion).filter(key=>criterionKeys.includes(key)&&criterionAvailability[key]))];
}
function rankLabels(h){
 return selectedOrder(h).map((key,index)=>(index+1)+'순위 · '+priorities[key].label);
}
function priorityWeightPolicy(order){
 if(!order.length)return null;
 const weights=Object.fromEntries(criterionKeys.map(key=>[key,order.length===1?25:20]));
 weights[order[0]]=50;
 if(order.length>1)weights[order[1]]=30;
 return weights;
}
function normalizeHousing(h){
 const order=selectedOrder(h);
 return {...h,priorityOrder:order,priorities:[...criterionKeys],priority:order[0]||'',priorityNeedsReselect:!order.length&&Boolean(h.priority||h.priorityNeedsReselect)};
}

const districtMapRows = [
  ['','','','','gangbuk','dobong','nowon',''],
  ['','','eunpyeong','jongno','seongbuk','dongdaemun','jungnang',''],
  ['gangseo','','mapo','seodaemun','jung','seongdong','gwangjin','gangdong'],
  ['','yangcheon','yeongdeungpo','dongjak','yongsan','seocho','gangnam','songpa'],
  ['','guro','geumcheon','gwanak','','','','']
];
const districtStations = {
  gwanak:['신림역','서울대입구역','봉천역','낙성대역','서울대벤처타운역'],
  gwangjin:['건대입구역','구의역','강변역','군자역','아차산역'],
  dongjak:['사당역','이수역','노량진역','흑석역','상도역'],
  dongdaemun:['청량리역','회기역','외대앞역','신이문역','장한평역'],
  eunpyeong:['불광역','연신내역','구파발역','녹번역','응암역'],
  gangnam:['강남역','선릉역','삼성역','역삼역','압구정역'],
  seocho:['교대역','서초역','고속터미널역','남부터미널역','양재역'],
  yeongdeungpo:['여의도역','영등포역','당산역','영등포구청역','문래역'],
  songpa:['잠실역','잠실새내역','종합운동장역','가락시장역','문정역'],
  jung:['시청역','을지로입구역','을지로3가역','충무로역','동대문역사문화공원역']
};
for (const row of districtMapRows) {
  for (let index = 0; index < row.length; index++) {
    if (!candidateIds.includes(row[index])) row[index] = '';
  }
}
const destinationPlaces = [
  ...districts.flatMap(({id,name}) => districtStations[id].map((station) => ({name:station,detail:name + ' · 지하철역'}))),
  {name:'서울시청',detail:'서울 중구 세종대로 · 건물'},
  {name:'서울 강남구 테헤란로',detail:'도로명 주소'},
  {name:'서울 영등포구 여의대로',detail:'도로명 주소'}
];
const projects = {
  rent:{ name:'광진구 청년 월세 지원', districtId:'gwangjin', scope:'광진구', benefit:'월세 부담을 줄이기 위해 월세 일부 지원', field:'household', label:'1인 가구 여부',
    options:[['yes','1인 가구'],['no','다인 가구']], condition:'1인 가구',
    period:'광진구 단위의 가상 사업입니다. 예시 신청 기간은 미정입니다.', docs:['임대차계약서','월세 이체 내역','가족관계증명서'],
    steps:['구청 모집 공고 확인','공고에 맞춰 서류 준비','접수 기간에 신청'] },
  loan:{ name:'청년 임차보증금 이자지원', scope:'서울 전역', benefit:'임차보증금 대출 이자 일부 지원', field:'income', label:'본인 연소득 (만원)', condition:'본인 연소득 5,000만 원 이하',
    url:'https://housing.seoul.go.kr/site/main/content/sh01_040901', period:'신청 가능 여부는 공식 안내에서 확인해 주세요.', docs:['주민등록등본','소득 증빙','임대차계약 관련 서류'],
    steps:['서울주거포털에서 추천서 신청 절차 확인','추천서 신청 및 서류 제출','추천서 발급 후 은행 대출 심사 진행'] }
};
const localNotices = [
  ['gwanak','관악형 청년 월세 지원','월세 일부 지원','https://www.gwanak.go.kr/site/gwanak/ex/bbsNew/View.do?not_ancmt_mgt_no=40631&typeCode=1'],
  ['gwangjin','광진형 청년월세 지원','월세 일부 지원','https://gwangjin.eminwon.seoul.kr/emwp/gov/mogaha/ntis/web/ofr/action/OfrAction.do?context=NTIS&homepage_pbs_yn=Y&jndinm=OfrNotAncmtEJB&method=selectOfrNotAncmt&methodnm=selectOfrNotAncmtRegst&not_ancmt_mgt_no=16695&not_ancmt_se_code=01%2C02%2C04&pageIndex=1&subCheck=Y'],
  ['dongjak','청년 월세 및 전세보증금 대출이자 지원','월세 또는 전세보증금 대출이자 지원','https://www.dongjak.go.kr/yeyak/progrm/master/yeyak/view.do?menuNo=1600011&pageIndex=1&prgSn=9223&tmplatSeCd=95&useAt=Y'],
  ['eunpyeong','은평형 청년월세 지원','월세 일부 지원','https://youth.seoul.go.kr/infoData/sprtInfo/view.do?key=2309130006&sprtInfoId=67106']
];
// Future official-search results can populate these same notice fields.
delete projects.rent;
for (const [districtId,name,benefit,url] of localNotices) {
  const district = districts.find((d) => d.id === districtId);
  projects[districtId + '-2026'] = {
    name,benefit,districtId,scope:district.name,scopeType:'district',status:'접수 종료',
    year:2026,url,source:{url,kind:'official-notice',origin:'user-provided'},rulesVerified:false,
    field:'household',label:'1인 가구 여부',options:[['yes','1인 가구'],['no','다인 가구']],condition:'1인 가구',
    period:'2026년 모집 회차 접수 종료 · 당시 공고와 요건 참고',
    docs:['당시 공식 공고의 제출서류 목록 확인'],steps:['공식 공고 열기','당시 요건과 첨부서류 확인']
  };
}
Object.assign(projects.loan,{scopeType:'city',status:'접수 여부 공식 안내 확인',rulesVerified:true,
  source:{url:projects.loan.url,kind:'official-guide'}});
const state = {
  page:'home', housing:{routeEnabled:true,deposit:'', monthly:'', trip:'', destination:'', destinationCoords:null, destinationDetails:null, mode:'transit', maxMinutes:'60', priorities:[...criterionKeys], priority:''},
  district:null, project:null, answers:{}, comparison:[], mapDistrict:null, result:null
};
const names = { home:['01','서비스 소개'], housing:['02','주거 조건'], results:['03','추천 결과'], map:['03','지도 비교'], qualify:['04','자격 정보'], decision:['05','조건 확인 결과'], help:['06','신청 도움'] };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = (value) => Number(value).toLocaleString('ko-KR') + '만 원';
const nav = (page, label, secondary = false) => '<button type="button" class="' + (secondary ? 'secondary' : '') + '" data-go="' + page + '">' + label + '</button>';
const heading = (title, description = '') => '<p class="kicker">' + names[state.page].join(' · ') + '</p><h1 tabindex="-1">' + title + '</h1>' + (description ? '<p class="muted">' + description + '</p>' : '');
const fitRules={cost:[[.70,100],[.85,90],[1,80],[1.10,60],[1.25,40],[1.50,20],[Infinity,0]],time:[[.50,100],[.70,90],[.85,80],[1,70],[1.15,50],[1.30,30],[Infinity,0]]};
const bandFit=(ratio,bands)=>bands.find(([limit])=>ratio<=limit)?.[1]??0;
const budgetScore=(budget,reference)=>{
 if(reference==null||!Number.isFinite(reference)||reference<0||budget===''||!Number.isFinite(Number(budget))||Number(budget)<0)return null;
 return Number(budget)===0?(reference===0?100:0):bandFit(reference/Number(budget),fitRules.cost);
};

const travelModes = [['transit','대중교통'],['walk','도보'],['car','자가용']];
const travelModeLabel = (mode) => travelModes.find(([key]) => key === mode)?.[1] ?? '대중교통';

function routeMinutes(route,mode) {
  if (mode === 'walk' || mode === 'car') return route?.[mode] ?? null;
  const transit = route?.transit;
  if (transit?.total == null) return null;
  if (transit.includesWalking) return transit.total;
  if (transit.walkToStop == null || transit.walkFromStop == null) return null;
  return transit.total + transit.walkToStop + transit.walkFromStop;
}

const localWalkScore = (base,minutes) => minutes == null ? base : (base + Math.max(0,100 - minutes * 4)) / 2;

function ranked(housing = state.housing) {
  const { deposit, monthly, destination, mode, maxMinutes, priorities:selectedPriorities, priority } = housing;

  return districts.filter((district) => candidateIds.includes(district.id)).map((record) => {
    // Only sourced, explicitly verified housing references may enter live scoring.
    const district={...record,deposit:null,rent:null,management:null,access:null,dailyScore:null,culture:null,localWalk:null};
    if(record.housingSource?.verified===true && record.housingSource.url && record.housingSource.asOf) Object.assign(district,{deposit:record.verifiedHousing?.deposit??null,rent:record.verifiedHousing?.rent??null,management:record.verifiedHousing?.management??null});
    const neighborhood = housing.routeEnabled===false?{status:'disabled',median:null,count:0,registered:0,points:[],min:null,max:null,within:null}:window.neighborhoodRoutes.get(housing,district.id);
    const minutes = neighborhood.median;
    const monthlyCost = district.management == null || district.rent == null ? null : district.rent + district.management;
    const budgetFit=false; // Trade-history proportions cannot certify an individual home's affordability.
    const rentEvidence=window.rentData?.get(housing,districts.filter(d=>candidateIds.includes(d.id)).map(d=>d.name),district.name);
    const scores={
      budget:rentEvidence?.status==='ok'&&Number.isFinite(rentEvidence.score)?rentEvidence.score:null,
      access:null,
      transport:!destination||neighborhood.count<2||!Number.isFinite(minutes)||!(Number(maxMinutes)>0)?null:bandFit(minutes/Number(maxMinutes),fitRules.time),
      daily:amenityEvaluations.get(district.id)?.score??null,culture:null
    };
    const order=selectedOrder(housing);
    const chosenPriority=order[0];
    const priorityRequired=!chosenPriority||!criterionAvailability[chosenPriority];
    const rawWeights=priorityWeightPolicy(order)??{housing:0,commute:0,convenience:0};
    const targetWeights={budget:rawWeights.housing,transport:rawWeights.commute,convenience:rawWeights.convenience};
    const seed={...district,scores,rentEvidence,minutes,neighborhood,monthlyCost,budgetFit,convenienceEvaluation:amenityEvaluations.get(district.id)};
    const evaluations=evaluationState(seed);
    const assessedKeys=criterionKeys.filter(key=>Number.isFinite(evaluations[key].score));
    const usable=assessedKeys.filter(key=>rawWeights[key]>0),sum=usable.reduce((n,key)=>n+rawWeights[key],0);
    const weights={housing:0,commute:0,convenience:0,budget:0,transport:0,access:0,daily:0,culture:0};
    let assignedWeight=0;for(const [index,key] of usable.entries()){weights[key]=index===usable.length-1?100-assignedWeight:rawWeights[key]/sum*100;assignedWeight+=weights[key];}
    weights.budget=weights.housing;weights.transport=weights.commute;weights.daily=weights.convenience;
    const weightPolicyPending=priorityRequired;
    const total=!weightPolicyPending&&sum?usable.reduce((n,key)=>n+evaluations[key].score*rawWeights[key],0)/sum:undefined;
    return {...seed,evaluations,weightPolicyPending,scores:{...scores,housing:scores.budget,commute:scores.transport,convenience:evaluations.convenience.score},weights,targetWeights,assessedKeys,rankingSignature:assessedKeys.join('|'),scoreMode:assessedKeys.length===3?'complete':'partial',provisional:assessedKeys.length<3,total};

  }).sort((a,b) => ((b.total ?? -1) - (a.total ?? -1)) || ((a.minutes ?? Infinity) - (b.minutes ?? Infinity)) || a.name.localeCompare(b.name,'ko')); 
}

const projectEntries = (district) => Object.entries(projects).filter(([, project]) => !project.districtId || project.districtId === district.id);
function budgetReason(label, reference, budget) {
  const difference = Number(budget) - reference;
  const comparison = difference === 0 ? '예산 상한과 같아요.'
    : difference > 0 ? '예산보다 ' + money(difference) + ' 낮아요.'
    : '예산을 ' + money(-difference) + ' 초과해요.';
  return label + ' · 예시 ' + money(reference) + '이고 입력 예산은 ' + money(budget) + '이에요. ' + comparison;
}
function travelSummary(district) {
  const {destination,mode} = state.housing;
  if (!destination) return '목적지 이동시간 · 적용 안 함';
  const origin = district.origin ? district.origin + ' 인근 예시 주거 기준점' : '정보 없음';
  const estimate = district.minutes == null ? '이동시간 정보 없음' : '예시 ' + district.minutes + '분';
  return travelModeLabel(mode) + ' · 출발 기준점 ' + origin + ' → ' + escapeHtml(destination) + ' · 예상 이동시간 ' + estimate;
}

function localAccessReason(minutes,label) {
  return minutes == null ? '' : ' 기준점에서 ' + label + '까지 도보 예시 ' + minutes +
    '분을 반영했어요. 기본 점수와 도보 점수(100점에서 1분당 4점 차감, 최저 0점)의 평균이에요.';
}
const formatWeight = (weight) => Number(weight.toFixed(1));
const exampleScore = (score) => score == null ? '정보 없음' : score.toFixed(1) + ' / 100점';

function scoreReasons(district) {
  const {deposit,monthly,destination,maxMinutes,mode} = state.housing;
  const reasons = {
    budget:district.rentEvidence?rentEvidenceText(district):[district.deposit == null ? '보증금 정보 없음' : budgetReason('보증금',district.deposit,deposit),
      district.rent == null ? '월세 정보 없음' : '예시 월세 ' + money(district.rent),
      (district.monthlyCost === null ? '관리비 정보 없음 · 월 주거비 예산 충족 여부 확인 불가. 월 주거비 점수는 산정할 수 없어요.'
        : budgetReason('월 주거비',district.monthlyCost,monthly))],
    access:(district.rail ?? '기준역·노선 정보 없음') + (district.access == null ? '' : ' · 역과 노선 접근성의 예시 평가 점수예요.') +
      (destination ? '' : localAccessReason(district.localWalk?.station,'가까운 역·정류장')),
    transport:routeEvidence(district),
    daily:escapeHtml(validConvenience(district.convenienceEvaluation).details),
    culture:district.culture == null ? '여가·문화시설 평가 자료 없음' : '여가·문화시설에 대한 자치구별 예시 평가 점수예요.'
  };
}
function recommendationReason(district) {
  const {priority} = state.housing;
  const reasons = scoreReasons(district);
  return Object.keys(priorities).sort((a,b) => (district.weights[b] ?? 0) - (district.weights[a] ?? 0)).map((key) => {
    const weight = district.weights[key];
    const score = ' · ' + exampleScore(district.scores[key]) + (weight ? ' · 반영 ' + formatWeight(weight) + '%' : '');
    const label = priorities[key].label + (key === priority ? ' 우선' : '');
    const details = [reasons[key]].flat().map((reason) => '<li>' + reason + '</li>').join('');
    return '<li><strong>' + label + score + '</strong><ul class="reason-details">' + details + '</ul></li>';
  }).join('');
}
const supportDetails = (project) => '<strong>' + escapeHtml(project.name) + '</strong><p>' + escapeHtml(project.benefit) +
  '</p><small>적용 범위 · ' + project.scope + ' · ' + (project.scopeType === 'city' ? '서울시 공통 사업' : '자치구 자체 사업') +
  '</small><p>' + project.status + (project.year ? ' · ' + project.year + '년 모집 회차' : '') +
  '</p><a href="' + escapeHtml(project.url) + '" target="_blank" rel="noopener noreferrer">공식 공고·안내 보기</a>' +
  (project.status === '접수 종료' ? '<p class="muted">종료된 공고의 당시 요건을 참고할 수 있어요.</p>' : '');
const localNoticeStatus = (district) => projectEntries(district).some(([,p]) => p.districtId)
  ? '' : '<p class="muted">확인된 구 자체 공고 없음</p>';
const selected = () => ({ district:districts.find(({id}) => id === state.district), project:projects[state.project] });
const values = () => state.answers[state.district + ':' + state.project] ?? {};
const numberField = (name,label,value,required = false,max = '') => '<label>' + label + '<input name="' + name + '" type="number" min="0" step="1" ' + (max ? 'max="' + max + '"' : '') + ' value="' + escapeHtml(value ?? '') + '" ' + (required ? 'required' : '') + '></label>';
const selectField = (name,label,value,options) => '<label>' + label + '<select name="' + name + '">' + options.map(([key,text]) => '<option value="' + key + '"' + (name === 'priority' && key === '' ? ' disabled hidden' : '') + (key === value ? ' selected' : '') + '>' + text + '</option>').join('') + '</select></label>';

const districtTotal = (district) => district.total == null ? '데이터 부족' : exampleScore(district.total);
function recommendationCohort(scores){
 const groups=new Map();
 for(const d of scores){if(d.total==null||!d.assessedKeys?.length)continue;const k=d.rankingSignature;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d);}
 return [...groups.values()].sort((a,b)=>b[0].assessedKeys.length-a[0].assessedKeys.length||b.length-a.length||a[0].rankingSignature.localeCompare(b[0].rankingSignature))[0]??[];
}
const recommended=scores=>recommendationCohort(scores).slice(0,3);

function budgetStatus(d) {
  if(d.rentEvidence?.score!=null)return '거래 표본 기준 예산 충족률 '+d.rentEvidence.score.toFixed(1)+'% · 개별 매물의 예산 충족을 보장하지 않아요.';
  if(d.monthlyCost==null || d.deposit==null) return '개별 보증금·월세 참고값 없음 · 거래 표본 자료를 확인해 주세요.';
  if(d.budgetFit) return '입력 예산 이내';
  const h=state.housing;
  const differences=[];
  if(d.deposit>Number(h.deposit)) differences.push('보증금 '+money(d.deposit-Number(h.deposit))+' 초과');
  if(d.monthlyCost>Number(h.monthly)) differences.push('월 주거비 '+money(d.monthlyCost-Number(h.monthly))+' 초과');
  return '추가 비교 후보 · '+differences.join(' · ');
}
const districtSupports = (district) => projectEntries(district).map(([,project]) =>
  '<div class="support">' + supportDetails(project) + '</div>').join('') + localNoticeStatus(district);

function scoreDetail(district,key) {
  if (!district.scores) return '<p>정보 없음</p>';
  const score = district.scores[key];
  const label = exampleScore(score) + (score == null || district.total == null ? '' : ' · 반영 ' + formatWeight(district.weights[key]) + '%');
  return '<p><strong>' + label + '</strong><br>' + [scoreReasons(district)[key]].flat().join('<br>') + '</p>';
}

function comparisonTable(districts) {
  if (!districts.length) return '';
  const rows = [
    ['종합점수',districtTotal],
    ...Object.keys(priorities).map((key) => [priorities[key].label,(district) => scoreDetail(district,key)]),
    ['관련 주거지원사업',districtSupports]
  ];
  return '<div class="comparison"><table><caption>선택한 자치구 비교 · ' + districts.length + '/2</caption><thead><tr><th scope="col">비교 항목</th>' +
    districts.map((d) => '<th scope="col">' + d.name + '<br><button type="button" class="secondary" data-remove="' + d.id +
      '" id="project-'+d.id+'-'+key+'" aria-label="' + d.name + ' 비교 해제">해제</button></th>').join('') + '</tr></thead><tbody>' +
    rows.map(([label,content]) => '<tr><th scope="row">' + label + '</th>' +
      districts.map((d) => '<td>' + content(d) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
const availablePriorities = () => criterionKeys;
const firstPriority = (keys,current) => keys.includes(current) ? current : '';
const priorityOptions = (keys) => [['','1순위 조건 선택'],...keys.map((key) => [key,priorities[key].label])];
const budgetDisplay = (value) => value === '' ? '미입력' : money(value);

const destinationMethods = [['search','주소·건물명·역 검색'],['station','구·역으로 찾기'],['pin','지도에서 선택']];
const districtOptions = [['','자치구 선택'],...districts.slice().sort((a,b) => a.name.localeCompare(b.name,'ko')).map(({id,name}) => [id,name])];
const normalizeSearch = (value) => value.toLowerCase().replace(/\s+/g,'');
const matchingPlaces = (query) => {
  const normalized = normalizeSearch(query);
  return normalized ? destinationPlaces.filter(({name,detail}) => normalizeSearch(name + detail).includes(normalized)) : [];
};

function searchResults(query) {
  if (!query.trim()) return '';
  const matches = matchingPlaces(query);
  return matches.length ? '<ul>' + matches.map(({name,detail}) =>
    '<li><button class="secondary" type="button" data-place="' + escapeHtml(name) + '">' +
    escapeHtml(name) + ' · ' + escapeHtml(detail) + '</button></li>').join('') + '</ul>'
    : '<p>일치하는 예시 목적지가 없어요.</p>';
}


function radioGroup(name,label,value,options) {
  return '<fieldset class="button-group"><legend>' + label + '</legend><div>' +
    options.map(([key,text]) => '<label><input type="radio" name="' + name + '" value="' + key + '"' +
      (key === value ? ' checked' : '') + '><span>' + text + '</span></label>').join('') + '</div></fieldset>';
}

const destinationIcon='<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
function validDestination(place){
 return Boolean(place?.name && Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat)<=90 && Math.abs(place.lng)<=180);
}
function setCandidate(editor,place){
 editor.candidate=validDestination(place)?place:null;
 editor.querySelector('[data-candidate]').textContent=editor.candidate?.name||'미선택';
 editor.querySelector('[data-finish]').disabled=!editor.candidate;
 for(const button of editor.querySelectorAll('[data-search-index]')){
   button.setAttribute('aria-pressed',String(editor.searchItems[Number(button.dataset.searchIndex)]===editor.candidate));
 }
}
function invalidateSearch(form) {
  clearTimeout(form.searchTimer);
  form.searchGeneration=(form.searchGeneration??0)+1;
}
function queueDestinationSearch(form,input) {
  invalidateSearch(form);
  const query=input.value.trim();
  form.searchItems=[];
  const output=form.querySelector('#destination-results');
  if(form.composing || !query){output.innerHTML='';return;}
  const generation=form.searchGeneration;
  output.innerHTML='<p role="status">검색 중…</p>';
  form.searchTimer=setTimeout(async()=>{
    try{
      const items=await window.realMaps.search(query);
      if(!form.isConnected||form.composing||generation!==form.searchGeneration)return;
      form.searchItems=items;
      output.innerHTML=items.length?'<p>검색 결과 (총 '+items.length+'건)</p><ul>'+items.map((p,i)=>'<li><button type="button" class="secondary" data-search-index="'+i+'" aria-pressed="false">'+destinationIcon+'<span><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.address||'주소 정보 없음')+'</small></span></button></li>').join('')+'</ul>':'<p role="status">검색 결과가 없어요. 주소나 장소명을 바꿔 보세요.</p>';
    }catch(error){
      if(form.isConnected&&generation===form.searchGeneration)output.innerHTML='<p role="alert">'+escapeHtml(error.message)+'</p>';
    }
  },350);
}
function destinationPicker(h){
 const chosen=Boolean(h.destination);
 return '<fieldset class="dest-choice"><legend>목적지</legend><div><button type="button" data-open-destination aria-haspopup="dialog" aria-pressed="'+chosen+'">'+destinationIcon+' 목적지 선택</button><button type="button" data-no-destination aria-pressed="'+!chosen+'">목적지 없음</button></div></fieldset>'+
 '<input type="hidden" name="destination" value="'+escapeHtml(h.destination||'')+'"><div id="destination-fields"'+(chosen?'':' hidden')+'><strong>선택한 목적지</strong><div class="dest-confirmed">'+destinationIcon+'<b id="destination-confirmed">'+escapeHtml(h.destination||'')+'</b><button type="button" class="secondary" data-change-destination aria-haspopup="dialog">변경하기</button></div></div><p class="field-error" id="error-destination"></p>';
}
function confirmDestination(form,place){
 const chosen=validDestination(place);
 const name=chosen?place.name:'';
 form.destinationCoords=chosen?{lat:place.lat,lng:place.lng}:null;
 form.destinationDetails=chosen?{name,address:place.address||'',...form.destinationCoords,source:place.source}:null;
 form.elements.namedItem('destination').value=name;
 form.querySelector('#destination-confirmed').textContent=name;
 form.querySelector('[data-open-destination]').setAttribute('aria-pressed',String(chosen));
 form.querySelector('[data-no-destination]').setAttribute('aria-pressed',String(!chosen));
 updateHousingForm(form);
}
function openDestinationDialog(opener){
 const housingForm=opener.form;
 const dialog=document.createElement('dialog');
 dialog.className='dest-dialog';
 dialog.setAttribute('aria-labelledby','dest-dialog-title');
 dialog.innerHTML='<form class="dest-editor"><div class="dest-head"><span>'+destinationIcon+'</span><h2 id="dest-dialog-title">목적지 선택</h2><button type="button" data-close aria-label="닫기">×</button></div>'+
 '<div class="dest-body">'+radioGroup('destinationMethod','목적지 찾는 방법','search',destinationMethods)+
 '<section data-picker="search"><label class="dest-search"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input type="search" autofocus aria-label="주소·건물명·역 검색" id="destination-search" placeholder="예) 서울역, 강남구청, 홍익대학교"></label><div id="destination-results" class="destination-results" aria-live="polite"></div></section>'+
 '<section data-picker="station" hidden>'+selectField('destinationDistrict','자치구','',districtOptions)+selectField('destinationStation','지하철역','',[['','구를 먼저 선택해 주세요']])+'<p id="station-search-status" role="status"></p></section>'+
 '<section data-picker="pin" hidden></section></div>'+
 '<div class="dest-foot"><p aria-live="polite">선택된 목적지 · <strong data-candidate></strong></p><div><button type="button" class="secondary" data-clear>목적지 없음</button><button type="button" data-finish>선택 완료 →</button></div></div></form>';
 document.body.append(dialog);
 const editor=dialog.querySelector('form');
 const input=editor.querySelector('#destination-search');
 const pinPanel=editor.querySelector('[data-picker="pin"]');
 const committed={...housingForm.destinationDetails,...housingForm.destinationCoords,name:housingForm.elements.destination.value};
 setCandidate(editor,committed);
 function close(){
   invalidateSearch(editor);
   dialog.close();dialog.remove();
   (opener.closest('[hidden]')?housingForm.querySelector('[data-open-destination]'):opener).focus();
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 editor.addEventListener('submit',event=>event.preventDefault());
 editor.addEventListener('keydown',event=>{
   if(event.key==='Escape' && !event.isComposing){event.preventDefault();close();return;}
   if(event.target===input && !event.isComposing && ['Enter','ArrowDown'].includes(event.key)){
     event.preventDefault();editor.querySelector('[data-search-index]')?.focus();
   }
 });
 input.addEventListener('compositionstart',()=>{editor.composing=true;invalidateSearch(editor);});
 input.addEventListener('compositionend',()=>{editor.composing=false;queueDestinationSearch(editor,input);});
 input.addEventListener('input',()=>{setCandidate(editor,null);queueDestinationSearch(editor,input);});
 editor.addEventListener('change',event=>{
   const field=event.target;
   if(!field.name)return;
   invalidateSearch(editor);
   if(field.name==='destinationMethod'){
     for(const panel of editor.querySelectorAll('[data-picker]'))panel.hidden=panel.dataset.picker!==field.value;
     pinPanel.replaceChildren();
     if(field.value==='pin')mountDestinationMap(editor,committed);
     if(field.value==='search'){queueDestinationSearch(editor,input);input.focus();}
     if(field.value==='station')selectDestinationStation(editor,editor.elements.destinationStation.value);
   }
   if(field.name==='destinationDistrict'){
     editor.elements.destinationStation.replaceChildren(new Option('역 선택',''),...(districtStations[field.value]||[]).map(name=>new Option(name,name)));
     editor.querySelector('#station-search-status').textContent='';
     setCandidate(editor,null);
   }
   if(field.name==='destinationStation')selectDestinationStation(editor,field.value);
 });
 editor.addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button)return;
   if(button.hasAttribute('data-close'))close();
   if(button.hasAttribute('data-clear')){confirmDestination(housingForm,null);close();}
   if(button.hasAttribute('data-finish')&&validDestination(editor.candidate)){confirmDestination(housingForm,editor.candidate);close();}
   if(button.hasAttribute('data-search-index'))setCandidate(editor,editor.searchItems[Number(button.dataset.searchIndex)]);
 });
 dialog.showModal();input.focus();
}

function findStationPlace(items,station,districtName) {
  return items.find(place=>{
    const name=place.name.replace(/\s+/g,' ').trim();
    return (name===station || (name.startsWith(station+' ') && /호선|경의중앙선|수인분당선|신림선|신분당선/.test(name.slice(station.length)))) &&
      place.address.includes('서울') && place.address.includes(districtName) &&
      Number.isFinite(place.lat) && Number.isFinite(place.lng);
  });
}
async function selectDestinationStation(form,station) {
  const districtId=form.elements.namedItem('destinationDistrict').value;
  const district=districts.find(d=>d.id===districtId);
  setCandidate(form,null);
  const generation=form.searchGeneration;
  const status=form.querySelector('#station-search-status');
  if(!station){status.textContent='역을 선택해 주세요.';return;}
  if(!district){status.textContent='자치구를 먼저 선택해 주세요.';return;}
  status.textContent=station+' 위치와 주소 조회 중…';
  const current=()=>form.isConnected && generation===form.searchGeneration &&
    form.elements.namedItem('destinationStation').value===station &&
    form.elements.namedItem('destinationDistrict').value===districtId;
  try{
    const items=await window.realMaps.search('서울 '+district.name+' '+station);
    if(!current())return;
    const place=findStationPlace(items,station,district.name);
    if(!place){status.textContent='선택한 '+district.name+'에서 '+station+'과 일치하는 역 좌표를 찾지 못했어요. 주소·역 검색이나 지도에서 선택해 주세요.';return;}
    setCandidate(form,{...place,name:station,source:'kakao-station'});
    status.textContent=station+' 위치·주소 확인 완료';
  }catch(error){
    if(current())status.textContent='역 위치 조회 실패 · '+error.message;
  }
}

function updateTimePreset(input){
 if(input.name!=='timePreset')return;
 const form=input.form;
 if(input.value!=='custom')form.elements.maxMinutes.value=input.value;
 form.querySelector('#custom-time').hidden=input.value!=='custom';
}
function housingSummary(h) {

  const labels = rankLabels(h);
  return '<ul><li>최대 보증금 · ' + budgetDisplay(h.deposit) + '</li><li>최대 월세 · ' + budgetDisplay(h.monthly) + ' (관리비 제외)' +
    '</li><li>목적지 · ' + (escapeHtml(h.destination)||'목적지 없이 추천') +
    '</li><li>이동 수단 · ' + (h.destination ? travelModeLabel(h.mode) : '적용 안 함') + '</li><li>최대 이동시간 · ' + (h.destination ? escapeHtml(h.maxMinutes) + '분' : '적용 안 함') +
    '</li><li>추천 우선순위' + (labels.length ? labels.map(label=>'<div>'+label+'</div>').join('') : ' · 미선택') + '</li></ul>';
}


function housingNumber(name,label,value,hint = '',min = 0,step = 'any') {
  return '<div><label for="housing-' + name + '">' + label + '</label><div class="number-control">' +
    '<input inputmode="' + (step === '1' ? 'numeric' : 'decimal') + '" id="housing-' + name + '" name="' + name +
    '" type="number" min="' + min + '" step="' + step + '" required value="' + escapeHtml(value) +
    '" aria-describedby="' + (hint ? 'hint-' + name + ' ' : '') + 'error-' + name + '">' +
    '<span>' + (['deposit','monthly'].includes(name) ? '만원' : '분') + '</span></div>' +
    (hint ? '<p id="hint-' + name + '" class="muted field-hint">' + hint + '</p>' : '') +
    '<p class="field-error" id="error-' + name + '" aria-live="polite"></p></div>';
}

function readHousing(form) {
  const data = new FormData(form);
  const trip = data.get('destination') ? (state.housing.trip||'work') : '';
  const chosen = [...criterionKeys];
  const order=selectedOrder(state.housing);
  return {
    routeEnabled:data.has('routeEnabled'),deposit:data.get('deposit'), monthly:data.get('monthly'), trip,
    destination:trip ? data.get('destination') : '', destinationCoords:trip ? (form.destinationCoords ?? null) : null, destinationDetails:trip ? form.destinationDetails ?? null : null, destinationQuery:data.get('destination')||'', mode:data.get('mode'), maxMinutes:data.get('maxMinutes'),
    priorities:chosen, priorityOrder:order, priority:order[0]||'',priorityNeedsReselect:!order.length&&Boolean(state.housing.priorityNeedsReselect)
  };
}

function updateHousingForm(form) {
  const h = readHousing(form);
  form.querySelector('#destination-fields').hidden = !h.trip;
  form.querySelector('#time-field').hidden = !h.destination;
  form.querySelector('#housing-summary').innerHTML = housingSummary(h);
  state.housing=h;saveSession();
  if(h.priority){form.querySelector('.priority-reselect-notice')?.remove();const error=form.querySelector('#error-priority');if(error)error.textContent='';form.querySelector('[role="group"][aria-label="추천 우선순위"]')?.removeAttribute('aria-invalid');}
  const routeLabel=document.querySelector('[data-route-switch-label]');if(routeLabel)routeLabel.textContent=h.routeEnabled?'ON':'OFF';
}

function validateHousing(form,h) {
  const fields = {
    deposit:'0 이상의 보증금을 만원 단위로 입력해 주세요.',
    monthly:'0 이상의 월세를 만원 단위로 입력해 주세요. 관리비는 제외해 주세요.',
    destination:'검색 결과, 역 또는 지도 핀으로 목적지를 확정해 주세요.',
    maxMinutes:'최대 이동시간을 1분 이상의 정수로 입력해 주세요.'
  };
  let firstError;
  for (const [name,message] of Object.entries(fields)) {
    const input = form.elements.namedItem(name);
    const active = name === 'destination' ? Boolean(h.trip) : name === 'maxMinutes' ? Boolean(h.destination) : true;
    const invalid = active && (name === 'destination' ? !h.destination : !input.validity.valid);
    form.querySelector('#error-' + name).textContent = invalid ? message : '';
    if (invalid) {
      input.setAttribute('aria-invalid','true');
      firstError ??= name === 'destination' ? form.querySelector('[data-open-destination]') : input;
      if (name === 'maxMinutes') form.querySelector('#custom-time').hidden = false;
    } else input.removeAttribute('aria-invalid');
  }
  const invalidPriority=!h.priority||!criterionAvailability[h.priority];
  const priorityError=form.querySelector('#error-priority');if(priorityError)priorityError.textContent=invalidPriority?'추천 우선순위를 한 가지 이상 선택해 주세요.':'';
  if(invalidPriority){form.querySelector('[role="group"][aria-label="추천 우선순위"]')?.setAttribute('aria-invalid','true');firstError??=form.querySelector('[name="priority"]:not(:disabled)');}
  firstError?.focus();
  return !firstError;
}
const imageMapPoints = {
  eunpyeong:[32,29],dongdaemun:[64,37],jung:[53,47],gwangjin:[75,53],
  yeongdeungpo:[29,65],dongjak:[43,72],gwanak:[43,85],seocho:[61,79],
  gangnam:[73,72],songpa:[86,66]
};
function imageMap(scores,picker = false) {
  return '<div class="image-map-scroll"><div class="image-map"><img src="seoul-map.svg" alt="서울과 한강의 위치를 단순화한 안내 지도">' +
    scores.map((district) => {
      const [x,y] = imageMapPoints[district.id];
      const action = picker ? 'data-pin="' + districtStations[district.id][0] + '"' : 'data-map="' + district.id + '"';
      return '<button type="button" style="left:' + x + '%;top:' + y + '%" ' + action +
        ' aria-pressed="' + (!picker && state.comparison.includes(district.id)) + '">' + (!picker && state.comparison.includes(district.id)?'✓ ':'') + district.name +
        (picker ? '<small>' + districtStations[district.id][0] + '</small>' : '<strong class="map-score-value">' + (district.total==null?'데이터 부족':district.total.toFixed(1)+' / 100') + '</strong>') + '</button>';
    }).join('') + '</div></div>';
}

function resultConditions(h) {
  const move = h.destination ? escapeHtml(h.destination) + ' · ' + travelModeLabel(h.mode) + ' · 허용 ' + h.maxMinutes + '분' : '목적지 없이 추천';
  return '<p class="result-conditions">보증금 최대 ' + money(h.deposit) + ' · 월세 최대 ' + money(h.monthly) + ' (관리비 제외)' +
    '<br>' + move + (canonicalCriterion(h.priority)?' · '+rankLabels(h).join(' / '):'') + '</p>';
}
function myConditions(h,editable=false){
 if(editable)return mapConditionsDashboard(h);
 const entries=[['최대 보증금',money(h.deposit)+' 이하'],['최대 월세',money(h.monthly)+' 이하'],['이동 목적지',h.destination||'목적지 없이 추천'],['추천 우선순위',rankLabels(h).join(' / ')||'미선택']];
 if(h.destination)entries.push(['이동 조건',travelModeLabel(h.mode)+' · 허용 '+h.maxMinutes+'분']);
 return '<section class="my-conditions" aria-label="내 조건"><div class="my-conditions-heading"><h2>내 조건</h2>'+(editable?'<button type="button" class="secondary" data-go="housing">조건 수정</button>':'')+'</div><dl>'+entries.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+escapeHtml(value)+'</dd></div>').join('')+'</dl><small>월세는 관리비 제외</small></section>';
}
function mapConditionsDashboard(h){
 const priority=rankLabels(h).join(' / ')||'미선택';
 return '<section class="my-conditions map-conditions-dashboard" aria-label="내 조건"><div class="my-conditions-heading"><h2>내 조건</h2><button type="button" class="secondary" data-go="housing">조건 수정</button></div><dl class="map-budget-highlights"><div><dt>최대 보증금</dt><dd>'+escapeHtml(money(h.deposit))+'</dd></div><div><dt>최대 월세</dt><dd>'+escapeHtml(money(h.monthly))+'</dd></div></dl><div class="map-destination-line"><span class="map-destination-name"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-8 8-13a8 8 0 1 0-16 0c0 5 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>'+escapeHtml(h.destination||'목적지 없이 추천')+'</span>'+(h.destination?'<span class="map-condition-badge">'+escapeHtml(travelModeLabel(h.mode))+' · 허용 '+escapeHtml(String(h.maxMinutes))+'분</span>':'')+'</div><div class="map-priority-line"><span>추천 우선순위</span><strong class="map-condition-badge">'+escapeHtml(priority)+'</strong></div><small>월세는 관리비 제외</small></section>';
}
function shortReasons(d) {
  const h = state.housing;
  const reasons = scoreReasons(d);
  const primary = legacyCriterion(h.priority) && d.scores[legacyCriterion(h.priority)] != null ? legacyCriterion(h.priority) : 'budget';
  const text = primary === 'budget'
    ? '예시 월 주거비 ' + money(d.monthlyCost) + '은 예산 ' + money(h.monthly) + '보다 ' +
      money(Number(h.monthly) - d.monthlyCost) + ' 낮거나 같아요. 보증금도 입력 예산 이내예요.'
    : primary === 'transport' ? reasons.transport
    : priorities[primary].label + '를 1순위로 반영했어요. 이 구의 예시 평가 점수는 ' + d.scores[primary].toFixed(1) + ' / 100예요.';
  const second = primary !== 'budget' ? budgetReason('월 주거비',d.monthlyCost,h.monthly)
    : d.minutes != null ? reasons.transport : null;
  return '<ul>' + [text,second].filter(Boolean).map(t=>'<li>'+t+'</li>').join('') + '</ul>';
}
function resultSupport(d,local) {
  const entries = projectEntries(d).filter(([,p]) => Boolean(p.districtId) === local);
  if (!entries.length) return '<p>' + (local ? '확인된 자치구 자체 공고가 없어요' : '확인된 공통 공고가 없어요') + '</p>';
  return entries.map(([key,p]) => '<section class="result-project"><div class="project-labels"><span>' +
    (p.scopeType === 'city' ? '서울시 공통' : '구 자체') + '</span><span>' + escapeHtml(p.status) +
    '</span><span>지역에 있는 사업 · 개인 조건 미확인</span></div><h4>' + escapeHtml(p.name) + '</h4><p>' + escapeHtml(p.benefit) +
    '</p><small>적용 범위 · ' + escapeHtml(p.scope) + (p.year ? ' · '+p.year+'년 모집 회차' : '') +
    '</small><div class="project-actions"><button type="button" data-district="' + d.id + '" data-project="' + key +
    '" aria-label="' + d.name + ' ' + escapeHtml(p.name) + ' ' + (p.status==='접수 종료'?'당시 요건 확인':'내 조건 확인하기') + '">' +
    (p.status==='접수 종료'?'당시 요건 확인':'내 조건 확인하기') + '</button><a href="' + escapeHtml(p.url) +
    '" target="_blank" rel="noopener noreferrer">공식 공고 보기 ↗</a></div></section>').join('');
}


const displayMinutes=value=>Number(value.toFixed(1));
function routeRange(d) {
  const r=d.neighborhood;
  if(r?.status==='disabled')return '이동시간 조회 OFF';
  if(!r||r.status==='no_destination')return '목적지 미선택';
  if(r.status==='idle')return '조회 전';
  if(r.status==='no_coordinates')return '목적지 좌표 없음';
  if(r.status==='loading')return '조회 중…';
  if(r.count===1){
    const point=r.points.find(p=>p.status==='ok');
    return point&&Number.isFinite(r.min)?point.name+' 기준 약 '+displayMinutes(r.min)+'분':'기준점 1곳 조회 · 상세 정보 없음';
  }
  if(r.count>1&&(!Number.isFinite(r.min)||!Number.isFinite(r.max)))return Number.isFinite(r.median)?'중앙값 '+displayMinutes(r.median)+'분':'정보 없음';
  if(r.count>1)return r.min===r.max?'약 '+displayMinutes(r.min)+'분':'약 '+displayMinutes(r.min)+'–'+displayMinutes(r.max)+'분';
  if(r.points.some(p=>p.status==='rate_limit'))return '조회 한도 초과';
  if(r.points.length&&r.registered===0)return '기준점 미등록';
  if(r.points.some(p=>p.status==='configuration'))return '경로 키 설정 필요';
  if(r.points.some(p=>p.status==='unsupported'))return '선택 수단 미연동';
  if(r.points.some(p=>['error','origin_error'].includes(p.status)))return '조회 오류';
  return '조회 결과 없음';
}
function routeEvidence(d) {
  const r=d.neighborhood;
  if(r.status==='no_destination')return '목적지가 없어 이동시간 항목을 평가에서 제외했어요.';
  if(r.status==='no_coordinates')return '목적지 좌표가 확정되지 않았어요. 주거 조건에서 목적지를 다시 선택해 주세요.';
  if(r.status==='idle')return '자동 조회 대기 중이에요. 확인된 실제 경로가 없어 아직 점수와 순위를 계산하지 않았어요.';
  return routeRange(d)+' · 등록 '+r.registered+'곳 중 '+r.count+'곳 조회. '+(r.count>=2?'중앙값 '+displayMinutes(r.median)+'분을 이동시간 점수에 반영해요. ':r.count===1?'조회 범위가 한 곳이어서 구 단위 이동시간 점수에서 제외해요. ':'유효한 시간이 없어 이동시간 점수에서 제외해요. ')+'유효한 기준점 2곳 이상이면 종합점수와 순위에 반영해요.';
}
function segmentTime(point,key){
  if(point.status!=='ok')return '정보 없음';
  // Transit WALKING steps do not establish complete origin-to-destination walking coverage.
  if(key==='walk')return '미제공';
  const value=point.transitBreakdown?.[key];
  return value==null?'정보 없음':value===0&&point.transitUsed?.[key]===false?'미이용':displayMinutes(value)+'분';
}
function routeQueryControl(d) {
  const h=state.housing;
  return '<strong id="route-summary-'+d.id+'" tabindex="-1">'+(h.destination?travelModeLabel(h.mode)+' · '+routeRange(d):'목적지 미설정')+'</strong>';
}

function departureTotalText(point,limit) {
  if(point.status!=='ok'||!Number.isFinite(point.minutes))return escapeHtml(point.message||'정보 없음');
  let value=String(displayMinutes(point.minutes));
  if(limit!==''&&limit!=null&&point.minutes>Number(limit)&&Number(value)<=Number(limit)){
    let digits=2;while(digits<=6&&Number(value)<=Number(limit))value=point.minutes.toFixed(digits++);
    if(Number(value)<=Number(limit))value=String(point.minutes);
  }
  return value+'분';
}
function boardingTime(point){
 const b=point.transitBreakdown;
 if(point.status!=='ok'||!Number.isFinite(b?.subway)||!Number.isFinite(b?.bus))return null;
 return b.subway+b.bus;
}
function segmentDifference(point){
 const boarding=boardingTime(point),walk=point.transitBreakdown?.walk;
 if(boarding==null||!Number.isFinite(walk)||!Number.isFinite(point.minutes))return '구간 정보가 부족해 총시간과 비교할 수 없어요.';
 const difference=point.minutes-boarding-walk;
 return Math.abs(difference)<=.15?'전체 도보 시간은 별도 제공되지 않아요.':difference>0?'확인된 구간 합계와의 차이 '+displayMinutes(difference)+'분 · 응답에 명시된 도보 구간만 합산, 세부 내역 미확인':'제공된 총시간과 구간 합계가 일치하지 않아요 · 세부 내역 미확인';
}
function departureNumberRow(point,h) {
  const success=point.status==='ok'&&Number.isFinite(point.minutes),hasLimit=h.maxMinutes!==''&&h.maxMinutes!=null;
  const within=success&&point.minutes<=Number(h.maxMinutes);
  const segments=[['boarding','교통수단 탑승','train'],['walk','하차 후 목적지까지 도보','walk']];
  return '<article class="departure-number-row '+(h.mode==='transit'?'with-segments':'total-only')+'"><div class="departure-place"><strong>'+escapeHtml(point.name)+'</strong>'+
    (point.locationName?'<small>'+escapeHtml(point.locationName)+'</small>':'')+(point.address?'<small>'+escapeHtml(point.address)+'</small>':'')+'</div>'+
    '<div class="departure-total"><span class="departure-total-label">'+(h.mode==='walk'?'목적지까지 도보':h.mode==='car'?'자가용 예상 이동시간':'총 이동시간')+'</span><strong class="'+(success?'departure-total-number':'departure-total-status')+'">'+departureTotalText(point,h.maxMinutes)+'</strong>'+
    (success&&hasLimit?'<span class="departure-limit-badge '+(within?'within':'over')+'">'+(within?'기준 이내':'기준 초과')+'</span>':'')+'</div>'+
    (h.mode==='transit'?'<div class="departure-segments">'+segments.map(([key,label,icon])=>{
      const boarding=boardingTime(point);
      const text=key==='boarding'?(boarding==null?'정보 없음':boarding===0&&point.transitUsed?.subway===false&&point.transitUsed?.bus===false?'미이용':displayMinutes(boarding)+'분'):(success&&Number.isFinite(point.alightingWalkMinutes)?displayMinutes(point.alightingWalkMinutes)+'분':success?'미제공':'정보 없음'),numeric=/분$/.test(text);
      return '<div class="departure-segment segment-'+key+'">'+resultIcon(icon)+'<span class="departure-segment-label">'+label+'</span><strong class="'+(numeric?'departure-segment-number':'departure-segment-status')+'">'+text+'</strong>'+(key==='boarding'?'<small class="boarding-components">지하철 '+segmentTime(point,'subway')+' · 버스 '+segmentTime(point,'bus')+'</small>':'')+'</div>';
    }).join('')+'</div>':'')+'</article>';
}
function departureDetails(d) {
  const r=d.neighborhood,h=state.housing;
  if(['disabled','idle','no_destination','no_coordinates'].includes(r.status))return '';
  const points=r.points,transit=h.mode==='transit',limit=h.maxMinutes!==''&&h.maxMinutes!=null;
  const failed=points.some(p=>p.status!=='ok');
  return '<section class="departure-summary" aria-live="polite"><p><strong>'+d.name+' 주요 역 기준점 '+r.registered+'곳 → '+escapeHtml(h.destination)+'</strong></p>'+
    (r.count?'<p>'+(limit?h.maxMinutes+'분 이내 '+r.within+'곳 / ':'')+'조회된 '+r.count+'곳 · 등록 '+r.registered+'곳 중 '+r.count+'곳 조회</p>':'<p>'+routeRange(d)+'</p>')+
    (r.status==='loading'?'<small>조회 중…</small>':'')+
    (r.count?'<details class="departure-details departure-number-details" data-departure-id="'+d.id+'"'+(state.departureOpen?.[d.id]?' open':'')+'><summary id="departure-toggle-'+d.id+'" aria-expanded="'+Boolean(state.departureOpen?.[d.id])+'">출발지별 시간 보기</summary><div class="departure-number-list">'+points.map(p=>departureNumberRow(p,h)).join('')+'</div><div class="departure-number-note">'+(transit?'<ul><li><strong>총 예상 이동시간:</strong> 기존 대중교통 API의 총시간</li><li><strong>하차 후 목적지까지 도보:</strong> 별도 도보 API 조회값</li><li>제공된 경로 중 최단시간 기준</li></ul>':'주요 역 기준점에서 출발한 결과예요.')+'</div></details>':'')+
    (r.status!=='loading'&&(failed||!r.count)?'<small>일부 경로를 확인하지 못했어요. 확인된 결과만 사용해요.</small>':'')+'</section>';
}
let routeRefreshPending=false;
function loadNeighborhoodRoutes(id,retry=false){
  const h={...state.housing,destinationCoords:state.housing.destinationCoords?{...state.housing.destinationCoords}:null};
  const district=districts.find(d=>d.id===id);
  if(!district||!h.destination||!h.destinationCoords)return;
  state.resultSelectionAutomatic=false;
  const signature=JSON.stringify([h.destinationCoords,h.mode]);
  window.neighborhoodRoutes.loadDistrict(h,district,()=>{
    if(routeRefreshPending)return;routeRefreshPending=true;
    requestAnimationFrame(()=>{routeRefreshPending=false;
      if(!['results','map'].includes(state.page)||JSON.stringify([state.housing.destinationCoords,state.housing.mode])!==signature)return;
      if(state.page==='results'&&state.resultDistrictId!==id)return;
      const scroll=window.scrollY;render(state.page,false);window.scrollTo(0,scroll);
    });
  },retry);
}

// One automatic comparison per destination/mode in this page session.
// Budget, weights and allowed time do not trigger new route requests.
const automaticRouteRuns=new Map();
const automaticRouteKey=h=>JSON.stringify([h.destinationCoords?.lat,h.destinationCoords?.lng,h.mode,h.routeEnabled!==false]);
function automaticRouteStatus(){
 if(state.housing.routeEnabled===false)return '이동시간 조회 OFF · 경로 API를 호출하지 않아요.';
 const run=automaticRouteRuns.get(automaticRouteKey(state.housing));
 return run?(run.running?'실제 이동시간 자동 계산 중 · '+run.done+' / '+run.total+'개 구 완료. 완료된 구부터 순위를 표시해요.':run.message||'실제 이동시간 자동 계산 완료 · '+run.done+' / '+run.total+'개 구 확인.'):'목적지의 실제 이동시간을 자동으로 확인해요.';
}
function ensureAutomaticRoutes(){
 const h={...state.housing,destinationCoords:state.housing.destinationCoords?{...state.housing.destinationCoords}:null};
 if(h.routeEnabled===false||!h.destination||!Number.isFinite(h.destinationCoords?.lat)||!Number.isFinite(h.destinationCoords?.lng))return;
 const key=automaticRouteKey(h);
 if(automaticRouteRuns.has(key))return automaticRouteRuns.get(key).promise;
 const targets=districts.filter(d=>candidateIds.includes(d.id));
 const run={running:true,done:0,total:targets.length};automaticRouteRuns.set(key,run);
 const refresh=()=>{if(automaticRouteKey(state.housing)!==key||!['results','map'].includes(state.page))return;const y=window.scrollY;render(state.page,false);window.scrollTo(0,y);};
 run.promise=Promise.resolve().then(async()=>{
   try{
     for(const district of targets){
       if(automaticRouteKey(state.housing)!==key){run.message='이동 조건이 변경되어 이전 조회를 중단했어요.';break;}
       await window.neighborhoodRoutes.loadDistrict(h,district);
       run.done++;refresh();
       const points=window.neighborhoodRoutes.get(h,district.id).points??[];
       if(points.some(p=>p.status==='rate_limit'||p.status==='configuration'||p.alightingWalkStatus==='rate_limit'||p.alightingWalkStatus==='configuration')){run.message='조회 한도 또는 API 설정 문제로 자동 조회를 중단했어요. 확인된 구만 비교해요.';break;}
     }
   }catch{run.message='일부 경로 조회에 실패했어요. 확인된 구만 비교해요.';}
   finally{run.running=false;refresh();}
 });
 return run.promise;
}

function resultExplorer(scores,items) {
  const unique=[...new Map(scores.map(d=>[d.id,d])).values()];
  const top=[...new Map(items.map(d=>[d.id,d])).values()];
  const topIds=new Set(top.map(d=>d.id));
  const others=unique.filter(d=>!topIds.has(d.id));
  if(state.resultSelectionAutomatic || !unique.some(d=>d.id===state.resultDistrictId)) state.resultDistrictId=top[0]?.id ?? unique[0]?.id ?? null;
  const selected=unique.find(d=>d.id===state.resultDistrictId);
  const outside=selected&&!topIds.has(selected.id);
  const otherSummary=d=>state.housing.priority==='budget'&&d.monthlyCost!=null?'월 주거비 '+money(d.monthlyCost)+' · 예시':state.housing.priority==='transport'&&d.neighborhood.count?travelModeLabel(state.housing.mode)+' '+routeRange(d):'';
  const row=(d,index)=>'<div class="district-result-row"><button type="button" class="district-result-choice" id="district-choice-'+d.id+'" data-result-district="'+d.id+'" aria-pressed="'+(selected?.id===d.id)+'">'+
    (index!=null?'<span class="rank-badge">'+(index+1)+'위</span>':'')+'<span class="district-choice-text"><strong>'+d.name+'</strong><small>'+
    (index!=null?'<span class="district-score-pill">'+(d.total==null?'데이터 부족':d.total.toFixed(1)+' / 100')+'</span><span class="district-example">'+(d.assessedKeys?.length<3?'부분 평가':'평가 완료')+'</span>':otherSummary(d))+
    '</small></span><span class="district-row-arrow" aria-hidden="true">›</span></button><div class="mobile-detail-slot" data-detail-slot="'+d.id+'"></div></div>';
  return '<div class="results-master-detail"><aside class="results-district-list" aria-label="자치구 탐색"><h2>추천 자치구</h2>'+
    (top.length?top.map(row).join(''):'<p>추천 결과가 없어요. 다른 자치구도 살펴보세요.</p>')+
    (others.length?'<button type="button" class="other-district-toggle secondary" data-other-districts aria-expanded="'+Boolean(state.otherDistrictsOpen)+'" aria-controls="other-district-list">'+
      (state.otherDistrictsOpen?'다른 자치구 접기 ▴':'다른 자치구 '+others.length+'곳 보기 ▾')+'</button>'+
      (outside&&!state.otherDistrictsOpen?'<p class="collapsed-selection-name">선택한 구 · '+selected.name+'</p>':'')+
      '<div id="other-district-list"'+(state.otherDistrictsOpen?'':' hidden')+'>'+others.map(d=>row(d,null)).join('')+'</div>':'')+
    '<div class="collapsed-selection-slot"></div></aside><div class="result-detail-host">'+
    (selected?'<div class="selected-result-detail">'+resultCard(selected)+'</div>':'<section class="panel"><h2>자치구 상세</h2><p>왼쪽 목록에서 살펴볼 자치구를 선택해 주세요.</p></section>')+
    '</div></div>';
}
function placeResultDetail() {
  if(state.page!=='results')return;
  const detail=app.querySelector('.selected-result-detail');
  if(!detail)return;
  let target=app.querySelector('.result-detail-host');
  if(window.matchMedia('(max-width: 860px)').matches) {
    const slot=app.querySelector('[data-detail-slot="'+state.resultDistrictId+'"]');
    target=slot&&!slot.closest('[hidden]')?slot:app.querySelector('.collapsed-selection-slot');
  }
  if(target&&detail.parentElement!==target)target.appendChild(detail);
}
window.matchMedia?.('(max-width: 860px)').addEventListener('change',placeResultDetail);

function resultIcon(name) {
  const paths={bus:'<rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 11h16M8 7h8M2 7v4m20-4v4M7 20v2m10-2v2M7 15h1m8 0h1"/>',walk:'<circle cx="14" cy="4" r="2"/><path d="m11 8 4 1 3 4 3 1M11 8l-3 5-4 1m7-6-1 8-4 6m4-6 5 2 2 4m-2-13-2 6"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',sliders:'<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',home:'<path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3z"/>',coins:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 4 16 4 16 0V6M4 12v6c0 4 16 4 16 0v-6"/>',train:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M9 3v8M15 3v8M8 22l2-3m6 3-2-3M8 15h1m6 0h1"/>',building:'<path d="M3 21h18M5 21V6h4V3h10v18M9 6v15M12 7h4m-4 4h4m-4 4h4m-4 4h4"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>'};
  return '<svg class="result-line-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths[name]+'</svg>';
}
function resultScoreTiles(d) {
  const h=state.housing;
  const entries=[['budget','주거비 절약'],['access','교통 편의성'],['daily','생활 편의시설']];
  const condition=key=>key==='budget'
    ? '보증금 최대 '+money(h.deposit)+'<br>월세 최대 '+money(h.monthly)+' (관리비 제외)'
    : (h.priority===key?'1순위 조건':h.priorities.includes(key)?'중요 조건으로 선택':'별도 우선순위 미지정');
  return '<section class="result-condition-tiles"><h3>'+resultIcon('star')+'조건별 점수</h3><div class="condition-tile-grid">'+entries.map(([key,label])=>'<div class="condition-tile"><span>'+label+'</span><strong>'+(d.scores[key]==null?'정보 없음':d.scores[key].toFixed(1)+'<small> / 100</small>')+'</strong><small>예시</small><p class="tile-user-condition"><span>내 조건</span>'+condition(key)+'</p></div>').join('')+'</div></section>';
}

function transportScoreState(d) {
  const r=d.neighborhood;
  if(r.status==='no_destination')return '목적지를 선택하면 확인할 수 있어요';
  if(r.status==='no_coordinates')return '목적지 좌표 미확정';
  if(r.status==='loading')return '조회 중…';
  if(r.status==='idle')return '조회 후 확인';
  if(r.count===1)return '기준점 부족';
  return r.count>=2&&d.scores.transport!=null?'':routeRange(d);
}
function scoreRouteControl(d) {
  return !state.housing.destination?'<small>목적지를 선택하면 자동으로 조회해요.</small>':'';
}

function scoreRowEvidence(d,key) {
  if(key==='budget'&&d.rentEvidence)return rentEvidenceText(d)+(d.total==null?' 두 항목의 유효한 자료가 모이면 종합점수를 계산해요.':' 주거비 '+d.weights.budget+'% · 이동시간 '+d.weights.transport+'%를 실제로 반영했어요.');
  if(key==='daily')return scoreReasons(d).daily;
  if(key!=='transport')return [scoreReasons(d)[key]].flat().join(' ')+(key==='budget'?(d.scores.budget==null?' 확인된 실제 주거비가 없어 예산 평가와 종합점수에서 제외했어요.':' 월 주거비 80% + 보증금 20%로 계산해요. 종합점수 반영 '+d.weights.budget+'%.'):' 실제 자료가 없어 평가에서 제외했어요.');
  const r=d.neighborhood,h=state.housing;
  if(r.count>=2)return '등록 '+r.registered+'곳 중 '+r.count+'곳 조회 · 중앙값 '+displayMinutes(r.median)+'분 · 허용시간 '+h.maxMinutes+'분 · '+h.maxMinutes+'분 이내 '+r.within+'곳. '+travelModeLabel(h.mode)+' · '+escapeHtml(h.destination)+' 기준. 중앙값 ÷ 허용시간 비율의 구간별 점수로 계산해요. 주거비 '+d.weights.budget+'%, 이동시간 '+d.weights.transport+'%를 종합점수와 순위에 반영해요.';
  return routeEvidence(d)+(r.count===1?' 허용시간 '+h.maxMinutes+'분 · '+h.maxMinutes+'분 이내 '+r.within+'곳.':'');
}

function rentEvidenceText(d){
 const r=d.rentEvidence,h=state.housing;
 if(!r||r.status==='idle')return '월세 거래 자료 조회 대기 중';
 if(r.status==='invalid')return '보증금과 월세 예산을 확인해 주세요.';
 if(r.status==='loading')return '서울시 월세 거래 자료 조회 중…';
 if(r.status==='error')return r.message;
 if(r.score==null)return '보증금·월세가 모두 확인되는 유효한 월세 거래 표본이 없어 주거비 점수를 계산하지 않아요.';
 if(!Number.isFinite(r.count)||!Number.isFinite(r.analyzedCount)||!r.data)return '확인된 주거비 평가 자료';
 return '보증금 '+money(h.deposit)+' 이하 · 월세 '+money(h.monthly)+' 이하를 동시에 충족한 거래 표본 '+r.count.toLocaleString('ko-KR')+'건 / 해당 구 유효 월세 거래 표본 '+r.analyzedCount.toLocaleString('ko-KR')+'건 · 예산 충족률 '+r.score.toFixed(1)+'% → '+r.score.toFixed(1)+' / 100점. '+r.data.year+'년 거래 표본 '+r.data.analyzedRecords.toLocaleString('ko-KR')+'건 분석 · 관리비 제외 · 현재 매물 수 아님.';
}
function rentEvidencePanel(d){
 const r=d.rentEvidence,h=state.housing;
 const text=r?.status==='ok'&&r.score!=null?'보증금 '+money(h.deposit)+' 이하 · 월세 '+money(h.monthly)+' 이하 충족 '+r.count.toLocaleString('ko-KR')+'건 / 해당 구 유효 월세 거래 '+r.analyzedCount.toLocaleString('ko-KR')+'건. '+r.data.year+'년 거래 표본 '+r.data.analyzedRecords.toLocaleString('ko-KR')+'건 분석 · 관리비 제외.':rentEvidenceText(d);
 return '<section class="panel rent-evidence-panel" aria-live="polite"><h3>예산에 맞는 월세 거래 표본</h3><p>'+escapeHtml(text)+'</p><small>서울시 전월세 거래이력 표본이며, 현재 매물 수나 개별 주택 수가 아니에요.</small></section>';
}

function ensureRentAnalysis(){
 if(!window.rentData)return;
 const h={...state.housing},snapshot=window.rentData.get(h);
 if(snapshot.status!=='idle')return;
 const key=window.rentData.key(h);
 const pending=window.rentData.load(h);
 const status=app.querySelector('.rent-evidence-panel p');if(status)status.textContent='서울시 월세 거래 자료 조회 중…';
 pending.then(()=>{
   if(window.rentData.key(state.housing)!==key||!['results','map'].includes(state.page))return;
   const y=window.scrollY;render(state.page,false);window.scrollTo(0,y);
 });
}

function validConvenience(input){
 if(input?.status==='evaluated'&&Number.isFinite(input.score)&&input.score>=0&&input.score<=100&&input.dataSource&&input.evaluatedAt)return {score:input.score,status:'evaluated',dataSource:input.dataSource,evaluatedAt:input.evaluatedAt,details:input.details??'확인된 생활 편의시설 자료'};
 return {score:null,status:input?.status??'unrated',dataSource:null,evaluatedAt:null,details:input?.details??(criterionAvailability.convenience?'생활 편의시설 조회 대기 중':'생활 편의시설 자료 없음')};
}
function evaluationState(d){
 if(d.evaluations)return d.evaluations;
 const r=d.rentEvidence,n=d.neighborhood;
 return {
  housing:{score:d.scores.budget,status:d.scores.budget!=null?'evaluated':r?.status??'unrated',dataSource:r?.status==='ok'?'서울시 전월세 거래 표본':null,evaluatedAt:r?.status==='ok'?new Date(r.at??Date.now()).toISOString():null,details:rentEvidenceText(d)},
  commute:{score:d.scores.transport,status:d.scores.transport!=null?'evaluated':n.status,dataSource:d.scores.transport!=null?'Kakao 경로 API':null,evaluatedAt:n.points?.find(p=>p.fetchedAt)?.fetchedAt??null,details:routeRange(d)},
  convenience:validConvenience(d.convenienceEvaluation)
 };
}
function dashboardC(d){
 const items=evaluationState(d),icons={housing:'home',commute:'train',convenience:'building'};
 const cards=criterionKeys.map(key=>{
   const item=items[key],scored=Number.isFinite(item.score),label=key==='convenience'?'편의시설':priorities[key].label;
   const evidence=key==='housing'?(scored?'예산 충족 '+d.rentEvidence.count.toLocaleString('ko-KR')+' / '+d.rentEvidence.analyzedCount.toLocaleString('ko-KR')+'건':['idle','loading'].includes(item.status)?'거래 표본 조회 중…':item.status==='error'?(d.rentEvidence?.message||'거래 자료 조회 실패'):'유효 거래 자료 없음'):key==='commute'?(scored?travelModeLabel(state.housing.mode)+' · '+routeRange(d)+' · 중앙값 '+displayMinutes(d.minutes)+'분':item.details):item.details;
   return '<article class="criterion-score-card'+(scored?'':' is-unrated')+'" data-criterion="'+key+'"><h3>'+resultIcon(icons[key])+label+'</h3><div class="criterion-score-number">'+(scored?item.score.toFixed(1):'—')+'</div><div class="criterion-score-unit">'+(scored?'/ 100점':item.status==='loading'?'조회 중':'미평가')+'</div><div class="criterion-score-meter"'+(scored?' role="meter" aria-label="'+label+' 점수" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+item.score.toFixed(1)+'"':' aria-hidden="true"')+'><span style="width:'+(scored?Math.min(100,Math.max(0,item.score)):0)+'%"></span></div><p>'+escapeHtml(evidence)+'</p>'+(key==='convenience' && item.details==='자치구별 시설 수를 조회하지 못했습니다.' ? '<button type="button" class="secondary" data-retry-amenities>편의시설 다시 조회</button>' : '')+(selectedOrder(state.housing).includes(key)?'<small class="criterion-first">'+(selectedOrder(state.housing).indexOf(key)+1)+'순위 조건</small>':'')+(key==='housing'?'<details class="housing-evidence"><summary>근거 보기</summary><p>'+escapeHtml(rentEvidenceText(d))+'</p><small>실거래 표본이며 현재 매물 수나 개별 주택 수가 아니에요.</small></details>':'')+'</article>';
 });
 return '<section class="criteria-dashboard" aria-label="조건별 점수"><div class="criteria-dashboard-grid">'+cards.join('')+'</div><details class="weight-help"><summary>적용 가중치</summary><p>'+criterionKeys.map(k=>priorities[k].label+' '+(d.weights[k]??d.weights[legacyCriterion(k)]??0).toFixed(1)+'%').join(' · ')+'</p></details>'+departureDetails(d)+'</section>';
}
function evaluationSummary(d){
 const items=evaluationState(d),done=criterionKeys.filter(k=>Number.isFinite(items[k].score)),missing=criterionKeys.filter(k=>!Number.isFinite(items[k].score));
 return '<section class="evaluation-summary" aria-live="polite"><strong>현재 추천 점수 '+(d.total==null?'미평가':d.total.toFixed(1)+'점')+'</strong><p>'+done.map(k=>priorities[k].label).join(' · ')+(done.length?' '+done.length+'개 항목 평가':'평가된 항목 없음')+(missing.length?' · '+missing.map(k=>priorities[k].label).join(' · ')+' 미평가':' · 평가 완료')+'</p><small>'+done.map(k=>priorities[k].label+' '+(d.weights[k]??d.weights[legacyCriterion(k)]??0).toFixed(1)+'%').join(' · ')+'</small></section>';
}

function neighborhoodBudget(d){
 const rows=d.rentEvidence?.row?.neighborhoods || [];
 const candidates=rows.filter(x=>x.valid>=5).sort((a,b)=>b.match/b.valid-a.match/a.valid || b.valid-a.valid || a.name.localeCompare(b.name,'ko'));
 const list=candidates.slice(0,3).map(x=>'<li>'+escapeHtml(x.name)+' · '+(100*x.match/x.valid).toFixed(1)+'% ('+x.match+'/'+x.valid+'건)</li>').join('');
 return '<section><h3>이 구에서 예산에 맞는 법정동</h3><p>유효 월세 거래가 5건 이상인 동을 예산 충족률순으로 비교합니다. 동률이면 표본이 많은 동을 우선합니다. 이동시간과 편의시설은 구 단위 평가입니다.</p>'+(list?'<ol>'+list+'</ol>':'<p>순위를 표시할 법정동 표본이 부족합니다.</p>')+'<a href="https://data.seoul.go.kr/dataList/OA-21276/S/1/datasetView.do">서울시 전월세 거래 자료</a> · <a href="/contract.html?district='+encodeURIComponent(d.name)+'">이 구의 계약 전 지원 확인</a></section>';
}
function compareFacts(d){
 const rent=d.rentEvidence, median=rent?.row?.medianRent;
 const minutes=d.neighborhood?.count>=2?d.neighborhood.median:null;
 const facts=[];
 function difference(value,limit,unit){
   const gap=Number((value-Number(limit)).toFixed(1));
   return gap===0?'내 상한과 같음':Math.abs(gap)+unit+(gap>0?' 초과':' 여유');
 }
 const h=state.housing;
 const rentStatus=rent?.status==='ok'?'유효 거래 표본 없음':rentEvidenceText(d);
 facts.push(['월세 중앙값',Number.isFinite(median)?money(median)+' · '+difference(median,h.monthly,'만원'):rentStatus,
  Number.isFinite(rent?.analyzedCount)?d.name+' 유효 월세 거래 '+rent.analyzedCount+'건 · 관리비 제외':'서울시 전월세 거래 표본 · 관리비 제외']);
 const origins=(d.neighborhood?.points??[]).filter(p=>p.status==='ok').map(p=>p.name||p.label).filter(Boolean);
 facts.push(['이동시간 중앙값',Number.isFinite(minutes)?displayMinutes(minutes)+'분 · '+difference(minutes,h.maxMinutes,'분'):routeRange(d)||'미평가',
  (origins.length?origins.join(', '):d.name+' 주요 역 기준점')+' → '+(h.destination||'목적지 미설정')+' · '+travelModeLabel(h.mode)]);
 const pct=rent?.score;
 facts.push(['보증금·월세 동시 충족',Number.isFinite(pct)?pct.toFixed(1)+'%':'미평가',Number.isFinite(pct)?rent.count+'건 충족 · '+(rent.analyzedCount-rent.count)+'건 예산 초과':'유효 거래 표본으로 계산']);
 return facts;
}
function fitSummary(d){
 const rows=compareFacts(d).map(([label,value,basis])=>
  '<tr><th scope="row">'+escapeHtml(label)+'</th><td><strong>'+escapeHtml(value)+'</strong><small>'+escapeHtml(basis)+'</small></td></tr>');
 const rentRetry=d.rentEvidence?.status==='error'?'<button type="button" class="secondary" data-retry-rent>주거비 다시 조회</button>':'';
 const routeRetry=state.housing.routeEnabled!==false&&state.housing.destinationCoords&&d.neighborhood.count<2&&['idle','complete'].includes(d.neighborhood.status)?
  '<button type="button" class="secondary" data-route-query="'+d.id+'" data-route-retry>이동시간 다시 조회</button>':'';
 return '<section class="v3-facts"><table><caption>주거비·이동시간 비교</caption><thead><tr><th scope="col">항목</th><th scope="col">내 조건과 비교</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>'+rentRetry+routeRetry+'</section>';
}
function resultCard(d){
 const count=criterionKeys.filter(k=>Number.isFinite(evaluationState(d)[k].score)).length;
 return '<article class="card result-card"><div class="card-head"><h2>'+d.name+'</h2><span class="score"><b>'+(d.total==null?'—':d.total.toFixed(1)+' / 100')+'</b><small>'+(d.weightPolicyPending?'우선순위 선택 필요':count===3?'평가 완료':count?'부분 평가 · 임시':'미평가')+'</small></span></div>'+dashboardC(d)+fitSummary(d)+neighborhoodBudget(d)+
 '<section class="result-supports district-supports"><h3>'+resultIcon('building')+'자치구 주거지원사업</h3>'+resultSupport(d,true)+'</section><section class="result-supports common-supports"><h3>'+resultIcon('building')+'서울시·공통 지원사업</h3>'+resultSupport(d,false)+'</section></article>';
}


function mapTravel(d){return travelModeLabel(state.housing.mode)+' · '+routeRange(d);}
function compactNotices(d) {
  return ['district','city'].map(scope=>{
    const entries=projectEntries(d).filter(([,p])=>(p.districtId?'district':'city')===scope);
    return '<div class="compact-notices"><small>'+(scope==='district'?'자치구 사업':'서울시·공통')+'</small>'+
      (entries.length?entries.map(([,p])=>'<p><a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(p.url)+'">'+escapeHtml(p.name)+'</a><small>'+escapeHtml(p.status)+'</small></p>').join(''):'<p>확인된 자체 공고 없음</p>')+'</div>';
  }).join('');
}
let mapViewScores=[];
function mapCompareAction(d){
 if(state.comparison.includes(d.id))return '<button type="button" data-remove="'+d.id+'">비교 대상에서 제외</button>';
 if(state.comparison.length<2)return '<button type="button" data-compare="'+d.id+'">비교 대상에 추가</button>';
 return '<p>비교 대상이 2곳이에요. 교체할 구를 선택해 주세요.</p><div class="actions">'+state.comparison.map(id=>'<button type="button" class="secondary" data-replace="'+id+'" data-with="'+d.id+'">'+districts.find(g=>g.id===id).name+' 교체</button>').join('')+'</div>';
}
function mapRegionSummary(d){
 const e=evaluationState(d);
 return '<aside class="map-region-summary" id="district-detail"><p class="kicker">선택 지역 요약</p><h2>'+d.name+'</h2><strong class="map-region-total">'+(d.total==null?'미평가':d.total.toFixed(1)+' <small>/ 100점</small>')+'</strong><span class="map-evaluation-status">'+(d.total==null?'미평가':d.provisional?'부분 평가 · 임시':'평가 완료')+'</span><dl>'+criterionKeys.map(k=>'<div><dt>'+priorities[k].label+'</dt><dd>'+(e[k].score==null?'미평가':e[k].score.toFixed(1)+' / 100')+'</dd></div>').join('')+'</dl><p class="map-travel-summary">'+escapeHtml(mapTravel(d))+'</p>'+fitSummary(d)+mapCompareAction(d)+'</aside>';
}
function mapComparison(items){
 const rows=[['종합 추천 점수',d=>d.total==null?'미평가':d.total.toFixed(1)+' / 100'],...compareFacts(items[0]).map(([label],i)=>[label,d=>{const [,value,basis]=compareFacts(d)[i];return escapeHtml(value)+'<small>'+escapeHtml(basis)+'</small>';}]),...criterionKeys.map(k=>[priorities[k].label,d=>{const e=evaluationState(d)[k];return (e.score==null?'미평가':e.score.toFixed(1)+' / 100')+(k==='commute'?'<small>'+escapeHtml(mapTravel(d))+'</small>':'');}])];
 return '<section class="map-score-comparison"><h2>추천 지역 비교</h2><div class="map-compare-table"><div class="compare-heading"><strong>평가 항목</strong>'+items.map(d=>'<strong>'+d.name+'</strong>').join('')+'</div>'+rows.map(([label,value])=>'<div class="compare-data-row"><h3>'+label+'</h3>'+items.map(d=>'<div><strong>'+value(d)+'</strong></div>').join('')+'</div>').join('')+'</div></section>';
}
function mapExtraDetails(d){return '<section class="map-extra-details"><h2>'+d.name+' 상세 정보</h2>'+departureDetails(d)+'<details><summary>점수 근거 보기</summary>'+criterionKeys.map(k=>'<h3>'+priorities[k].label+'</h3><p>'+escapeHtml(evaluationState(d)[k].details)+'</p>').join('')+'</details><section class="result-supports district-supports"><h3>자치구 주거지원사업</h3>'+resultSupport(d,true)+'</section><section class="result-supports common-supports"><h3>서울시·공통 지원사업</h3>'+resultSupport(d,false)+'</section></section>';}

const views = {


  home:() => `
    <section class="intro-hero" aria-labelledby="intro-title">
      <div class="intro-art" aria-hidden="true"></div>
      <div class="intro-logo"><img src="logo.png?v=2" alt="24.zip"></div>
      <div class="intro-copy">
        <h1 id="intro-title" tabindex="-1">내 조건에 맞는 <em>서울 동네</em>부터,<br> 받을 수 있는 <em>주거지원</em>까지</h1>
        <p class="intro-description">주거비, 이동시간, 생활 편의시설을 비교해 내 조건에 맞는 서울 자치구를<br> 추천받고, 관심 있는 주택의 주거지원제도도 확인해 보세요.</p>
        <div class="intro-actions">
          <button type="button" data-go="housing">내 조건으로 동네 찾기 <span aria-hidden="true">→</span></button>
          <a href="/contract.html">관심 주택의 지원 확인</a>
        </div>
        <ul class="intro-features">
          <li><span class="intro-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/></svg></span><div><h2>지역 추천</h2><p>내 조건에 맞는<br>서울 동네를 추천해요.</p></div></li>
          <li><span class="intro-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8H8a2.5 2.5 0 1 1 2.4-3.3L12 8Zm0 0h4a2.5 2.5 0 1 0-2.4-3.3L12 8Z"/></svg></span><div><h2>주거지원 확인</h2><p>관심 주택의<br>지원제도를 확인해요.</p></div></li>
          <li><span class="intro-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 18v-6h3v6zm6 0V8h3v10zm6 0V3h3v15z"/></svg></span><div><h2>비교 분석</h2><p>주거비, 이동시간,<br>생활 편의시설을 비교해요.</p></div></li>
        </ul>
      </div>
    </section>` + (state.hasResults ? '<div class="intro-return">'+nav('results','내 추천 결과 보기',true)+'</div>' : ''),
  housing:() => {
    const h = normalizeHousing(state.housing);
    const preset = ['30','45','60'].includes(h.maxMinutes) ? h.maxMinutes : 'custom';
    return '<div class="temporary-route-switch"><label><span>임시 · 이동시간 조회</span><input type="checkbox" role="switch" name="routeEnabled" form="housing-form"'+(h.routeEnabled!==false?' checked':'')+'><b data-route-switch-label>'+(h.routeEnabled!==false?'ON':'OFF')+'</b></label></div>'+heading('주거 조건 입력','예산과 이동 조건을 알려주면, 내게 맞는 동네와 관련 주거지원을 함께 보여드려요.') +
      '<form class="housing-form housing-layout" id="housing-form" novalidate><div class="form-cards">' +
      '<section class="input-card"><h2>예산</h2><div class="budget-grid">' +
      housingNumber('deposit','최대 보증금',h.deposit) +
      housingNumber('monthly','최대 월세',h.monthly,'월세만 입력해 주세요. 관리비는 포함하지 않아요. 서울시 전월세 거래 자료에는 관리비가 제공되지 않습니다.') + '</div></section>' +
      '<section class="input-card"><h2>이동</h2>' +
      destinationPicker(h) + '<div id="time-field"' + (h.destination ? '' : ' hidden') + '>' +
      radioGroup('mode','이동 수단',h.mode,travelModes) +
      radioGroup('timePreset','최대 허용 이동시간',preset,[['30','30분'],['45','45분'],['60','60분'],['custom','직접 입력']]) +
      '<div id="custom-time"' + (preset === 'custom' ? '' : ' hidden') + '>' +
      housingNumber('maxMinutes','최대 허용 이동시간 (분)',h.maxMinutes,'',1,'1') +
      '</div><p class="muted">예상 이동시간은 실제 경로 조회 후 추천 결과와 지도 비교에서 확인할 수 있어요.</p></div></section>' +
      '<section class="input-card"><h2>추천 우선순위</h2><p class="muted">세 가지 조건을 중요하게 생각하는 순서대로 선택해 주세요. 선택한 순서에 따라 1순위, 2순위, 3순위가 지정됩니다. 선택한 항목을 다시 누르면 선택이 취소됩니다.</p>'+(h.priorityNeedsReselect?'<p class="priority-reselect-notice" role="status">이전에 선택한 우선순위는 현재 사용할 수 없어요. 추천 우선순위를 다시 선택해 주세요.</p>':'')+'<div class="criteria-priority-options" role="group" aria-label="추천 우선순위">'+
      criterionKeys.map(key=>{
        const rank=h.priorityOrder.indexOf(key)+1;
        return '<label><input type="checkbox" name="priority" value="'+key+'"'+(rank?' checked':'')+'><span>'+priorities[key].label+'<small class="priority-rank">'+(rank?rank+'순위':'')+'</small></span></label>';
      }).join('')+
      '</div><p class="field-error" id="error-priority" aria-live="polite"></p><p class="muted" id="convenience-priority-hint">생활 편의시설은 서울 25개 자치구의 시설 수 순위를 기준으로 평가합니다.</p></section></div>'+
      '<aside class="input-card input-summary"><h2>입력 조건 확인</h2><div id="housing-summary">' + housingSummary(h) +
      '</div><button type="submit">추천 결과 보기 <span aria-hidden="true">→</span></button></aside></form>';
  },

  results:() => {
    const h=state.housing;
    const scores=ranked();
    const items=recommended(scores);
    return '<div class="results-page-heading"><div>'+heading('내 조건에 맞는 서울 자치구','확인된 자료를 바탕으로 자치구를 비교해 보세요.')+'</div><div class="results-heading-actions"><button type="button" class="secondary" id="results-map-action" data-go="map">'+resultIcon('map')+'지도에서 비교</button><button type="button" class="secondary" id="results-housing-action" data-go="housing">'+resultIcon('sliders')+'주거 조건 수정</button></div></div>'+myConditions(h)+
      (!items.length?'<section class="panel empty-results"><h2>아직 실제 자료로 평가한 자치구가 없어요</h2><p>'+(scores.some(d=>d.rentEvidence?.status==='error')?'거래 자료 조회에 실패했어요. 조건 수정 후 다시 제출하면 재조회합니다.':'거래·경로 자료를 확인하고 있어요. 확인된 항목부터 표시합니다.')+'</p>'+nav('housing','주거 조건 수정',true)+'</section>':
        items.length<3?'<p class="result-notice">현재 평가에 필요한 자료가 확인된 '+items.length+'곳만 표시했어요. 조회가 완료된 다른 구도 비교 대상에 추가돼요.</p>':'')+
      resultExplorer(scores,items)+'<div class="actions result-tools result-bottom-tools">'+nav('map','지도에서 비교')+nav('housing','주거 조건 수정')+'</div>'+
      '<details class="panel scoring"><summary>점수 계산 기준</summary><p>점수는 100점 만점으로 계산하고 표시합니다. 추천 순위는 반올림 전 종합점수로 정하며, 동점이면 실제 이동시간 중앙값이 짧은 구를 먼저 표시합니다.</p><p>주거비 점수 = 보증금·월세 상한을 동시에 충족한 해당 구 거래 표본 건수 ÷ 해당 구의 보증금·월세가 모두 확인되는 유효 월세 거래 표본 건수 × 100입니다. 현재 매물 수가 아닌 2026년 거래 표본이며 관리비는 제외합니다. 유효한 월세 표본이 없으면 정보 없음, 유효 표본은 있지만 예산 충족 거래가 0건이면 0점입니다. 다른 구의 건수는 점수에 영향을 주지 않습니다. 이 점수를 주거비 항목으로 종합 추천에 반영합니다.</p><p>실제 경로가 2곳 이상 조회되면 중앙값을 사용합니다. 중앙값 ÷ 허용시간이 50% 이하 100점, 70% 이하 90점, 85% 이하 80점, 100% 이하 70점, 115% 이하 50점, 130% 이하 30점, 그 이상 0점입니다. 한 가지만 선택하면 1순위 50%, 나머지 각각 25%입니다. 두 가지 이상 선택하면 1순위 50%, 2순위 30%, 남은 항목 20%입니다. 미평가 항목을 제외하고 나머지 가중치의 합이 100%가 되도록 조정합니다. 모든 항목이 미평가면 점수를 표시하지 않습니다. 생활 편의시설은 서울 25개 자치구의 편의점·대형마트·약국·병의원 수를 항목별로 순위화합니다. 항목별 배점은 25·20·25·30점입니다. 1~5위부터 5개 순위마다 배점의 100%, 80%, 60%, 40%, 20%를 적용합니다. 같은 시설 수는 공동 순위이며 0곳은 0점입니다. 조회 실패 시 미평가로 표시합니다. 평가 항목 수가 많은 구 중 같은 항목 조합을 갖춘 구끼리 임시 순위를 비교합니다. 표본 비율은 현재 매물 수나 개별 주택의 예산 충족을 보장하지 않습니다.</p></details>';
  },

  map:() => {
    const scores=mapViewScores=ranked(),focused=scores.find(d=>d.id===state.mapDistrict)??recommended(scores)[0]??scores[0];
    const compared=state.comparison.map(id=>scores.find(d=>d.id===id)).filter(Boolean);
    return '<div class="map-comparison-page">'+heading('지도에서 동네 비교','지도에서 자치구를 골라 최대 두 곳을 비교해 보세요.')+myConditions(state.housing,true)+
      '<div data-map-toolbar></div><div class="map-overview-grid"><div class="map-canvas-column"><div id="comparison-kakao-map" class="real-map" aria-label="서울 자치구 지도"></div></div>'+mapRegionSummary(focused)+'</div><p class="map-status" role="status"></p>'+
      '<section class="map-selection"><h2>비교 대상 '+compared.length+'/2</h2><p class="muted">지도 마커는 상세 확인, 아래 구 이름은 비교 대상 선택이에요.</p><div class="district-pick-list" aria-label="비교 자치구 선택">'+scores.map(d=>'<button type="button" class="secondary'+(state.comparison.includes(d.id)?' is-compared':'')+'" data-map-pick="'+d.id+'" aria-pressed="'+state.comparison.includes(d.id)+'">'+(state.comparison.includes(d.id)?'✓ ':'')+d.name+'</button>').join('')+'</div><div class="selected-districts">'+compared.map(d=>'<span>'+d.name+' <button type="button" class="secondary" data-remove="'+d.id+'" aria-label="'+d.name+' 비교 해제">해제</button></span>').join('')+'</div>'+(compared.length<2?'<p>비교할 자치구를 '+(compared.length?'한 곳 더':'최대 두 곳')+' 선택해 주세요.</p>':'')+'</section>'+
      (compared.length===2?mapComparison(compared):'')+mapExtraDetails(focused)+'<div class="actions map-return">'+nav('results','추천 결과로 돌아가기')+'</div></div>';
  },
  qualify:() => {
    const { district, project } = selected();
    const a = values();
    const blank = [['','선택 또는 나중에 입력']];
    return heading('사업별 자격 정보','나이·소득 답변은 화면 메모리에서만 사용합니다. 모르는 항목은 비워 둘 수 있어요.') +
      '<form id="eligibility-form" class="panel narrow"><p class="kicker">' + district.name + '</p><h2>' + project.name + '</h2>' + supportDetails(project) +
      numberField('age','만 나이',a.age,false,'120') +
      selectField('owner','무주택 여부',a.owner,[...blank,['yes','무주택'],['no','주택 소유']]) +
      (project.field === 'income' ? numberField('income',project.label,a.income) : selectField('household',project.label,a.household,[...blank,...project.options])) +
      '<div class="actions"><button>신청 조건 확인하기</button>' + nav('results','추천 결과로 돌아가기',true) + '</div></form>';
  },
  decision:() => {
    const {district,project} = selected();
    const {status,reasons} = state.result;
    const actions = {
      pass:nav('help','신청 도움 보기'),
      unknown:nav('qualify','정보 보완하기'),
      fail:nav('results','다른 구 선택') + nav('home','메인으로 돌아가기',true)
    };
    return heading('신청 조건 확인 결과') + '<section class="panel narrow"><p class="kicker">' + district.name + '</p><h2>' + project.name + '</h2><h3 class="status">' + {pass:'입력한 항목 충족',fail:'미충족',unknown:'추가 확인 필요'}[status] + '</h3><ul>' + reasons.map((reason) => '<li>' + reason + '</li>').join('') + '</ul><small>예시 확인 결과입니다. 실제 신청 가능 여부는 공식 공고에서 확인해 주세요.</small><div class="actions">' + actions[status] + nav('housing','주거 조건 수정',true) + '</div></section>';
  },
  help:() => {
    const {district,project} = selected();
    return heading('신청 준비하기') + '<section class="panel narrow"><p class="kicker">' + district.name + '</p><h2>' + project.name + '</h2><h3>신청 기간</h3><p>' + project.period + '</p><h3>필요 서류 · 예시</h3><ul>' +
      project.docs.map((doc) => '<li>' + doc + '</li>').join('') + '</ul><h3>신청 절차 · 예시</h3><ol>' + project.steps.map((step) => '<li>' + step + '</li>').join('') +
      '</ol><div class="actions">' + (project.url ? '<a class="button" href="' + project.url + '" target="_blank" rel="noopener noreferrer">공식 신청처로 이동</a>' : '<span class="status">링크 준비 중</span>') + nav('results','추천 결과로 돌아가기',true) + '</div></section>';
  }
};

function assess(project, answers) {
  if (!project.rulesVerified) return {status:'unknown',reasons:['2026년 접수 종료 공고입니다. 당시 상세 자격 기준은 공식 공고에서 확인해 주세요. 입력한 예시 답변으로 실제 자격을 확정하지 않습니다.']};
  const conditions = [
    ['age','만 19~39세', (value) => Number(value) >= 19 && Number(value) <= 39],
    ['owner','무주택', (value) => value === 'yes'],
    [project.field,project.condition, project.field === 'income' ? (value) => Number(value) <= 5000 : (value) => value === 'yes']
  ];
  const missing = [];
  const failed = [];
  for (const [field,label,test] of conditions) {
    if (!answers[field]) missing.push(label);
    else if (!test(answers[field])) failed.push(label);
  }
  if (failed.length) return { status:'fail', reasons:failed.map((label) => label + ' 예시 기준을 충족하지 않았어요.') };
  if (missing.length) return { status:'unknown', reasons:missing.map((label) => label + ' 항목의 답변이 필요해요.') };
  return { status:'pass', reasons:['입력한 답변이 ' + conditions.map(([,label]) => label).join(', ') + ' 예시 기준을 충족해요.'] };
}


function mountDestinationMap(editor,committed){
 const panel=editor.querySelector('[data-picker="pin"]');
 panel.innerHTML='<div id="destination-kakao-map" class="real-map" aria-label="목적지 선택 지도"></div><p class="map-status" role="status"></p>';
 const node=panel.firstElementChild;
 const place=editor.candidate||committed;
 window.realMaps.mount(node,{pick:true,coords:validDestination(place)?place:null,onPick(coords,name,address){
   if(node.isConnected)setCandidate(editor,{...coords,name,address,source:'map'});
 }});
}
const app = document.querySelector('#app');
app.addEventListener('toggle', (event) => {
  if(event.target.matches('[data-departure-id]')) {state.departureOpen ??= {};state.departureOpen[event.target.dataset.departureId]=event.target.open;event.target.querySelector('summary').setAttribute('aria-expanded',String(event.target.open));saveSession();return;}
  if (!event.target.matches('[data-score-details]')) return;
  event.target.querySelector('summary').setAttribute('aria-expanded',String(event.target.open));
}, true);

const sessionStateKey='24zip-current-session-v1';
function saveSession(){
  try{const {answers,result,...navigation}=state;sessionStorage.setItem(sessionStateKey,JSON.stringify(navigation));}catch{}
}
function restoreSession(){
  try{
    const saved=JSON.parse(sessionStorage.getItem(sessionStateKey)||'null');
    if(!saved||!views[saved.page])return;
    delete saved.answers;delete saved.result;Object.assign(state,saved);if(!state.hasResults && ['results','map'].includes(saved.page))state.hasResults=true;
    state.housing=normalizeHousing({...state.housing,priorities:state.housing.priorities??[]});
    if(!validDestination({name:state.housing.destination,...state.housing.destinationCoords})){
      Object.assign(state.housing,{trip:'',destination:'',destinationCoords:null,destinationDetails:null,destinationQuery:''});
    }
    if(!state.housing.priority&&['results','map'].includes(state.page)){state.housing.priorityNeedsReselect=true;state.page='housing';}
    if(['qualify','decision','help'].includes(state.page)&&(!projects[state.project]||!districts.some(d=>d.id===state.district)))state.page='results';
    if(state.page==='decision'&&!state.result)state.page='qualify';
  }catch{}
}
async function showWelfare(panel, age) {
  const status = panel.querySelector('p');
  try {
    const query = age == null || age === '' ? '' : '?age=' + encodeURIComponent(age);
    const response = await fetch('/api/welfare' + query);
    if (!response.ok) throw new Error('Welfare lookup failed');
    const doc = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (!doc.querySelector('wantedList') || doc.querySelector('parsererror')) throw new Error('Invalid welfare data');
    const items = [...doc.querySelectorAll('servList')];
    status.textContent = items.length ? (query ? '입력한 만 나이로 조회한 ' : '') + '주거 관련 사업 ' + items.length + '건입니다. 소득·가구 등 세부 요건은 사업별 안내에서 확인하세요.' : '조회된 주거 관련 사업이 없습니다.';
    for (const item of items) {
      const card = document.createElement('article');
      const heading = document.createElement('h3');
      heading.textContent = item.querySelector('servNm')?.textContent;
      const summary = document.createElement('p');
      summary.textContent = item.querySelector('servDgst')?.textContent;
      card.append(heading, summary);
      const id = item.querySelector('servId')?.textContent.trim();
      if (/^WLF[0-9]+$/.test(id)) {
        const link = document.createElement('a');
        link.href = 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=' + id;
        link.textContent = '복지로에서 상세 조건 보기';
        card.append(link);
      }
      panel.append(card);
    }
  } catch {
    status.textContent = '복지사업을 불러오지 못했습니다. ';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '다시 조회';
    retry.onclick = () => { status.textContent = '조회 중…'; showWelfare(panel, age); };
    status.append(retry);
  }
}

const defaultPrevious = {housing:'home', results:'housing', map:'results', qualify:'results', decision:'qualify', help:'decision'};
function render(page, focus = true, goingBack = false) {
  state.pageTrail ??= [];
  if (page === 'home') state.pageTrail = [];
  else if (page !== state.page && !goingBack) state.pageTrail.push(state.page);
  const activeId=!focus?document.activeElement?.id:null;
  state.page = page;
  saveSession();
  document.body.dataset.page = page;
  app.innerHTML = views[page]();
  if (page !== 'home') app.insertAdjacentHTML('afterbegin','<button type="button" class="secondary page-back" data-back>← 뒤로가기</button>');
  if (page === 'decision') {
    app.insertAdjacentHTML('beforeend','<section class="panel narrow" id="welfare-programs"><h2>중앙부처 주거 복지사업</h2><p aria-live="polite">복지로 사업 조회 중…</p></section>');
    showWelfare(app.querySelector('#welfare-programs'));
  }
  if(page==='results') {placeResultDetail();saveSession();ensureAutomaticRoutes();ensureRentAnalysis();}
  if(page==='map'){ensureRentAnalysis();ensureAutomaticRoutes();}
  if(['results','map'].includes(page))ensureAmenityAnalysis();
  if(page === 'map') window.realMaps.mount(app.querySelector('#comparison-kakao-map'),{destination:state.housing.destination&&state.housing.destinationCoords?{...state.housing.destinationCoords,name:state.housing.destination}:null,districts:mapViewScores,focused:state.mapDistrict ?? recommended(mapViewScores)[0]?.id ?? mapViewScores[0].id,compared:state.comparison,viewport:state.mapViewport,onView(view){state.mapViewport=view;},onSelect(id){state.mapDistrict=id;render('map',false);}});

  if (page === 'housing') {
    const form = app.querySelector('#housing-form');
    form.destinationCoords = state.housing.destinationCoords;
    form.destinationDetails = state.housing.destinationDetails;
  }
  if(!focus&&activeId){const restored=document.getElementById(activeId);if(restored){const focusTarget=restored.disabled?restored.closest('.score-comparison-item,.fact-box'):restored;focusTarget?.focus({preventScroll:true});}}
  if (focus) {
    app.querySelector('h1').focus({preventScroll:true});
    window.scrollTo(0,0);
  }
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-retry-amenities')) {
    amenityLookupStarted = false;
    ensureAmenityAnalysis();
    render(state.page, false);
    return;
  }
  if (button.hasAttribute('data-back')) {
    render(state.pageTrail.pop() || defaultPrevious[state.page] || 'home', true, true);
    return;
  }
  if(button.dataset.resultDistrict){if(state.resultDistrictId!==button.dataset.resultDistrict)state.scoreEvidenceOpen={};state.resultSelectionAutomatic=false;state.resultDistrictId=button.dataset.resultDistrict;render('results',false);app.querySelector('[data-result-district="'+state.resultDistrictId+'"]')?.focus({preventScroll:true});return;}
  if('otherDistricts' in button.dataset){state.otherDistrictsOpen=!state.otherDistrictsOpen;render('results',false);app.querySelector('[data-other-districts]')?.focus({preventScroll:true});return;}
  if(button.dataset.routeQuery){loadNeighborhoodRoutes(button.dataset.routeQuery,'routeRetry' in button.dataset);return;}
  if(button.hasAttribute('data-retry-rent')){window.rentData.retry(state.housing);ensureRentAnalysis();render(state.page,false);return;}


  if ('changeDestination' in button.dataset || 'openDestination' in button.dataset){openDestinationDialog(button);return;}
  if ('noDestination' in button.dataset){confirmDestination(button.form,null);return;}
  if (button.dataset.go) {
    if(button.dataset.go==='map' && state.page==='results')state.mapDistrict=state.resultDistrictId;
    if(button.dataset.go==='results' && state.page==='map' && state.mapDistrict){
      state.resultDistrictId=state.mapDistrict;state.resultSelectionAutomatic=false;
    }
    render(button.dataset.go);
  }
  if (button.dataset.project) {
    state.district = button.dataset.district;
    state.project = button.dataset.project;
    render('qualify');
  }

  if(button.dataset.mapPick){
    const id=button.dataset.mapPick;state.mapDistrict=id;
    if(state.comparison.includes(id))state.comparison=state.comparison.filter(v=>v!==id);
    else if(state.comparison.length<2)state.comparison=[...state.comparison,id];
    render('map',false);app.querySelector('[data-map-pick="'+id+'"]')?.focus({preventScroll:true});
  }
  if (button.dataset.replace) {
    state.comparison=state.comparison.map(id=>id===button.dataset.replace?button.dataset.with:id);
    render('map',false);
  }
  if (button.dataset.map || button.dataset.compare || button.dataset.remove) {
    const { map, compare, remove } = button.dataset;
    if (map) state.mapDistrict = map;
    if (remove || state.comparison.includes(compare)) {
      state.comparison = state.comparison.filter((id) => id !== (remove ?? compare));
    } else if (compare) {
      if(state.comparison.length<2) state.comparison = [...state.comparison,compare];
    }
    render('map',false);
    const focusTarget = compare ? '[data-compare="' + compare + '"]'
      : '[data-map="' + (map ?? remove) + '"]';
    app.querySelector(focusTarget)?.focus({preventScroll:true});

  }
});


app.addEventListener('input', (event) => {
  const form = event.target.form;
  if (form?.id !== 'housing-form') return;
  if(event.target.name==='priority'){
    const input=event.target;
    const order=selectedOrder(state.housing).filter(key=>key!==input.value);
    if(input.checked)order.push(input.value);
    state.housing.priorityOrder=order;
    for(const option of form.querySelectorAll('[name="priority"]')){
      const rank=order.indexOf(option.value)+1;
      option.labels[0].querySelector('.priority-rank').textContent=rank?rank+'순위':'';
    }
  }
  updateTimePreset(event.target);
  updateHousingForm(form);
});


window.addEventListener('pagehide',saveSession);
app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'housing-form') {
    const housing = readHousing(event.target);
    if (!validateHousing(event.target,housing)) return;
    state.housing = housing;
    window.rentData?.retry(housing);
    const routeRun=automaticRouteRuns.get(automaticRouteKey(housing));
    if(routeRun&&!routeRun.running)automaticRouteRuns.delete(automaticRouteKey(housing));
    state.hasResults=true;state.resultSelectionAutomatic=!state.resultDistrictId;state.departureOpen={};state.scoreSectionOpen=false;state.scoreEvidenceOpen={};

    render('results');
  }
  if (event.target.id === 'eligibility-form') {
    const data = Object.fromEntries(new FormData(event.target));
    state.answers[state.district + ':' + state.project] = data;
    state.result = assess(projects[state.project],data);
    render('decision');
  }
});
restoreSession();
if(new URLSearchParams(window.location.search).get('screen') === 'home') state.page='home';
render(state.page,false);

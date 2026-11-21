// Application links verified against the district directory on Seoul's single-household portal.
const districtApplications = {
  '강남구': '1568332cc9484f06b809db685ff44613',
  '강동구': '82ed003959074f01b7f739169e566d51',
  '강북구': '08fe95a64fb44c0389a9195e9581ffa6',
  '강서구': '894c9a978b644dea890a55b9f9eb0e12',
  '관악구': 'a4d0613f5baf49c8ba754b7c7b50d848',
  '광진구': '74478e6081444227851b6dac9ef449ed',
  '구로구': 'bcbab87d57a24b1e9516ecbdcf4ea3da',
  '금천구': '97e9e5a497ec4225941563ccd147eabf',
  '노원구': 'df97f3f2f5f34d76bdb8aa248db28d15',
  '도봉구': '8646bf5530f94e2899bd3b22f82af84d',
  '동대문구': '06351b8539ee4a80b8b7509c5570cae0',
  '동작구': 'a5bb460691b94ee48fceab6b5d65a971&seoul_link_yn=Y',
  '마포구': '244ba1bf37e74b28b8227e32244e3ef5',
  '서대문구': 'a99003126d9e4417b6e5569e15111d66',
  '서초구': '93d15fafa08649b19740ac8e8de7bbca',
  '성동구': '52a5c4a149894926b7a3ba32618b0d9a',
  '성북구': 'd4da99c61d404b1ca301fcd22882c4ce',
  '송파구': '6960641606f84e31a35e0283867bcbcc',
  '양천구': 'ba96808e02144c9592322995242fe39f',
  '영등포구': 'fbc7af76db794d2e8685e7a9519bfc4f',
  '용산구': '4cdffd9e543d4f8891c13fd20659067a',
  '은평구': '87488002220549ab8c6189ba390f0dca',
  '종로구': '7fed1e7086d24889befe3ef9ee136f35',
  '중구': 'efdead167f9743e1889c9de7353a6859',
  '중랑구': 'd2ac602347b24279bd507310cbb2cfdb'
};

const portalDistrictCodes = {
  '종로구': '1111000000',
  '중구': '1114000000',
  '용산구': '1117000000',
  '성동구': '1120000000',
  '광진구': '1121500000',
  '동대문구': '1123000000',
  '중랑구': '1126000000',
  '성북구': '1129000000',
  '강북구': '1130500000',
  '도봉구': '1132000000',
  '노원구': '1135000000',
  '은평구': '1138000000',
  '서대문구': '1141000000',
  '마포구': '1144000000',
  '양천구': '1147000000',
  '강서구': '1150000000',
  '구로구': '1153000000',
  '금천구': '1154500000',
  '영등포구': '1156000000',
  '동작구': '1159000000',
  '관악구': '1162000000',
  '서초구': '1165000000',
  '강남구': '1168000000',
  '송파구': '1171000000',
  '강동구': '1174000000'
};

const settlementNotices = [
  {
    district:'성북구', title:'신규 전입 1인가구 웰컴키트',
    terms:'2026년에 다른 시·군·구에서 성북구로 전입한 1인가구. 공고에 별도 연령 제한이 기재되어 있지 않습니다.',
    method:'성북구청 카카오톡 채널에서 신청서와 설문을 작성하세요. 안전물품은 소방·구급·공구 세트 중 하나를 선택합니다. 재고는 복지정책과(02-2241-2283)에 확인하세요.',
    url:'https://www.sb.go.kr/www/selectBbsNttView.do?bbsNo=41&key=6350&nttNo=9581355',
    reviewThrough:'2026-12-31'
  },
  {
    district:'은평구', title:'은빛SOL라이프 전입 1인가구 웰컴행복박스',
    terms:'1962~2007년생으로, 2026년에 다른 시·도 또는 자치구에서 은평구로 전입한 1인가구입니다.',
    method:'공식 공고의 온라인 신청서에서 설문과 희망 물품을 제출하세요. 중장년은 주소지 동주민센터에서도 신청할 수 있습니다. 예산 소진 여부는 가족정책과(02-351-6193)에 확인하세요.',
    url:'https://www.ep.go.kr/dong/selectBbsNttView.do?bbsNo=42&key=4285&nttNo=313034',
    fromYear:1962,toYear:2007,end:'2026-12-18'
  },
  {
    district:'영등포구', title:'전입 1인가구 정착용 웰컴키트',
    terms:'2026년 1월 1일 이후 타 자치구에서 전입한 만 20세 이상 1인가구입니다.',
    method:'센터 방문 또는 온라인 신청 후 방문 수령하는 회차였습니다.',
    url:'https://ydp1in.or.kr/program/256',closed:true,end:'2026-11-30'
  }
];

function forDistrict(district, birthYear, today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})){
  const application=districtApplications[district];
  if(typeof application!=='string')return [];
  const counseling={
    district,title:'1인가구 전월세 안심계약 도움서비스',
    terms:'서울에 거주하거나 독립해 거주할 예정인 1인가구가 대상입니다. 공식 신청 안내에 별도 연령 제한이 없습니다.',
    method:'전월세 계약 상담과 집 보기 동행은 무료입니다. '+district+' 신청 페이지에서 상담을 예약하세요.',
    url:'https://1in.seoul.go.kr/front/bsns/bsnsApplcntStep1Page.do?bsns_id='+application
  };
  return [counseling,...settlementNotices.filter(n=>n.district===district&&!n.closed&&today<=(n.end||n.reviewThrough)&&
    (!birthYear||!n.fromYear||(birthYear>=n.fromYear&&birthYear<=n.toYear)))];
}

function isHousingService(title,description=''){
  const text=(title+' '+description).replace(/\s/g,'');
  if(/취업상담|홍보용기념품|입원비/.test(title.replace(/\s/g,'')))return false;
  if(/전월세.*(?:안심계약|계약상담)|집보기동행/.test(text))return true;
  if(/전입/.test(text)&&/1인가구|일인가구/.test(text)&&/정착물품|웰컴(?:키트|행복박스)/.test(text))return true;
  if(/상담|현물|기념품|입원비|웰컴키트/.test(title))return false;
  return /주거급여|주거비|임차료|월세|보증금|임대주택|주택공급|주택개량|주거환경개선|주거지원|전세자금|주거취약/.test(text);
}

function cards(district,birthYear){
  // Only reviewed catalog text and official URLs enter this markup.
  const notices=forDistrict(district,birthYear);
  if(!notices.length)return '';
  const search=new URL('https://1in.seoul.go.kr/front/partcptn/partcptnListPage.do');
  search.searchParams.set('p_atdrc',portalDistrictCodes[district]);
  search.searchParams.set('p_searchtxt','전입');
  return notices.map(n=>'<article class="result-project"><h3>'+n.title+'</h3><strong>접수 여부 확인 필요</strong><p>'+n.terms+'</p><p>'+n.method+'</p><a target="_blank" rel="noopener noreferrer" href="'+n.url+'">'+n.district+' 공식 안내·신청 ↗</a></article>').join('')+
    '<p><a target="_blank" rel="noopener noreferrer" href="'+search.href+'">'+district+' 전입 지원 최신 공고 찾기 ↗</a></p>';
}
const localHousingSupport={forDistrict,cards,isHousingService};
if(typeof window!=='undefined')window.localHousingSupport=localHousingSupport;
if(typeof module!=='undefined')module.exports=localHousingSupport;

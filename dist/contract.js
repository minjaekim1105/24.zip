'use strict';
const notices = [
  {id:'rent', title:'서울시 청년월세지원', period:'2026.05.06 ~ 05.19', url:'https://housing.seoul.go.kr/site/main/board/notice/12667', other:'신청일 서울 주민등록, 무주택·가구 유형, 재산, 기존 수혜·중복 지원 등'},
  {id:'move', title:'청년 부동산 중개보수 및 이사비 지원 · 하반기', period:'2026.08.18 ~ 08.31', url:'https://www.seoul.go.kr/news/news_notice.do?nttNo=463813', other:'전입신고일, 세대주·계약자 일치, 무주택, 부모 소유 주택, 중복 수혜 등'}
];
function assess(id, input) {
  const {area, deposit, rent, year, income}=input;
  const fail=[], pending=[], pass=[];
  function check(ok,yes,no){(ok?pass:fail).push(ok?yes:no);}
  check(area==='seoul','서울 소재 주택','서울 외 주택은 대상 지역에서 제외');
  if(id==='rent'||id==='gwanak'){
    check(deposit<=8000,'보증금 8천만원 이하','보증금 8천만원 초과');
    if(rent===0) fail.push('월세가 없는 계약');
    else if(rent<=60) pass.push('월세 60만원 이하');
    else {
      const converted=rent+(id==='gwanak'?Math.floor(deposit*0.045/12):deposit*0.045/12);
      check((id!=='gwanak'||deposit<8000)&&converted<=90+1e-9,'환산 월세 '+converted.toLocaleString('ko-KR')+'만원으로 예외 기준 이내','공고의 보증금·환산 월세 예외 기준 초과');
    }
  } else {
    const total=deposit+rent*100;
    if(deposit===0 && rent===0) fail.push('유상 전·월세 계약 필요');
    else check(total<=20000,'거래금액 '+total.toLocaleString('ko-KR')+'만원으로 2억원 이하','보증금 + 월세 × 100이 2억원 초과');
  }
  if(!year) pending.push('출생연도 미입력');
  else if(id==='rent' && year>=1983 && year<1986) pending.push('군 복무기간에 따른 연령 상한 연장 확인');
  else check(year>=1986 && year<=2007,'공고 출생연도 범위 충족','공고 출생연도 범위 밖');
  if(!income) pending.push('공고별 건강보험료 기준으로 소득 확인');
  else check(income!=='high' && (id!=='rent'||income!=='low'),'입력한 소득 구간 충족','입력한 소득 구간이 공고 범위 밖');
  return {fail,pending,pass};
}
const districtOffices = {
  "강남구": "www.gangnam.go.kr",
  "강동구": "www.gangdong.go.kr",
  "강북구": "www.gangbuk.go.kr",
  "강서구": "www.gangseo.seoul.kr",
  "관악구": "www.gwanak.go.kr",
  "광진구": "www.gwangjin.go.kr",
  "구로구": "www.guro.go.kr",
  "금천구": "www.geumcheon.go.kr",
  "노원구": "www.nowon.kr",
  "도봉구": "www.dobong.go.kr",
  "동대문구": "www.ddm.go.kr",
  "동작구": "www.dongjak.go.kr",
  "마포구": "www.mapo.go.kr",
  "서대문구": "www.sdm.go.kr",
  "서초구": "www.seocho.go.kr",
  "성동구": "www.sd.go.kr",
  "성북구": "www.sb.go.kr",
  "송파구": "www.songpa.go.kr",
  "양천구": "www.yangcheon.go.kr",
  "영등포구": "www.ydp.go.kr",
  "용산구": "www.yongsan.go.kr",
  "은평구": "www.ep.go.kr",
  "종로구": "www.jongno.go.kr",
  "중구": "www.junggu.seoul.kr",
  "중랑구": "www.jungnang.go.kr"
};
const districtNotices = {
  "관악구": {
    "title": "관악형 청년 월세 지원",
    "dates": "4월 6일 ~ 4월 13일",
    "detail": "거주기간과 소득 등을 심사하는 청년 월세 지원입니다.",
    "url": "https://www.gwanak.go.kr/site/gwanak/ex/reservation/re00403.do?riIdx=RI003274&riType=A"
  },
  "광진구": {
    "title": "광진형 청년월세 지원",
    "dates": "8월 18일 ~ 8월 28일",
    "detail": "청년 1인가구와 신혼부부에게 월세를 월 최대 20만원, 최대 12개월 지원한 회차입니다.",
    "url": "https://gwangjin.eminwon.seoul.kr/emwp/gov/mogaha/ntis/web/ofr/action/OfrAction.do?context=NTIS&homepage_pbs_yn=Y&jndinm=OfrNotAncmtEJB&method=selectOfrNotAncmt&methodnm=selectOfrNotAncmtRegst&not_ancmt_mgt_no=16695&not_ancmt_se_code=01%2C02%2C04&pageIndex=1&subCheck=Y"
  },
  "동작구": {
    "title": "청년 월세 및 전세보증금 대출이자 지원",
    "dates": "2월 2일 ~ 2월 27일",
    "detail": "무주택 청년 1인가구와 신혼부부의 월세 또는 전세대출 이자를 지원한 회차입니다.",
    "url": "https://www.dongjak.go.kr/yeyak/progrm/master/yeyak/view.do?menuNo=1600011&pageIndex=1&prgSn=9223&tmplatSeCd=95&useAt=Y"
  },
  "은평구": {
    "title": "은평형 청년월세 지원",
    "dates": "1월 19일 ~ 2월 13일",
    "detail": "무주택 청년에게 월세를 월 최대 10만원, 최대 12개월 지원한 회차입니다.",
    "url": "https://youth.seoul.go.kr/infoData/sprtInfo/view.do?key=2309130006&sprtInfoId=67106"
  }
};
if(typeof module!=='undefined') module.exports={assess};
if(typeof document!=='undefined'){
  const form=document.querySelector('#check'), results=document.querySelector('#results');
  const selector=form.elements.area, local=document.querySelector('#local-support');
  function showDistrict(){
    local.replaceChildren();
    results.replaceChildren();
    const district=selector.value;
    if(!district) return;
    if(district==='other'){
      local.textContent='현재 지역 지원 안내는 서울 25개 자치구를 대상으로 합니다.';
      return;
    }
    function add(tag, text, parent=local){
      const element=document.createElement(tag);
      element.textContent=text;
      parent.append(element);
      return element;
    }
    function link(label,url,parent){
      const a=add('a',label,parent);
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
    }
    add('h2',district+'에서 확인할 주거지원');
    const record=districtNotices[district];
    if(record){
      const card=add('article','');
      add('h3',record.title,card);
      add('strong','해당 회차 접수 마감 · 2026년 '+record.dates,card);
      add('p',record.detail+' 전입 시점과 주민등록 등 세부 요건은 공고에서 확인하세요.',card);
      link('공식 공고 보기 ↗',record.url,card);
    }else{
      add('p','24zip에 등록된 '+district+' 자체 주거비 모집 공고가 아직 없습니다. 추가 사업은 구청에서 확인하세요.');
    }
    const card=add('article','');
    add('h3','전월세 안심계약 도움서비스',card);
    add('p','서울시 공통 · 자치구별 운영. 서울에 혼자 거주하거나 독립할 예정이라면 계약 전에 무료 상담과 집보기 동행을 문의할 수 있어요.',card);
    link(district+' 상담 문의처·예약 방법 ↗','https://1in.seoul.go.kr/front/intropage/intropageShow.do?page_id=b6f12a6f04b84e49922a79938b792490',card);
    const office=districtOffices[district];
    if(office) link(district+'청에서 다른 복지·지원 공고 찾기 ↗','https://'+office,local);
    add('p','자료 확인일 2026.11.21 · 현재 거주지와 이사 예정지는 사업별로 다르게 심사할 수 있어요.');
  }
  const preset=new URLSearchParams(location.search).get('district');
  if(Object.hasOwn(districtOffices,preset))selector.value=preset;
  selector.addEventListener('change',showDistrict);
  showDistrict();
  form.addEventListener('input',()=>results.replaceChildren());
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const f=new FormData(form), input={area:Object.hasOwn(districtOffices,f.get('area'))?'seoul':'other',deposit:Number(f.get('deposit')),rent:Number(f.get('rent')),year:Number(f.get('year')),income:f.get('income')};
    const programs=[...notices];
    if(f.get('area')==='관악구') programs.push({id:'gwanak',title:'관악형 청년 월세 지원',period:'2026.04.06 ~ 04.13',url:districtNotices['관악구'].url,other:'공고일 관악구 주민등록 및 거주, 무주택 1인가구 또는 청년 신혼부부, 재산·중복수혜·공공임대 등 제한'});
    results.innerHTML='<h2>입력한 조건으로 비교한 결과</h2>'+programs.map(n=>{
      const {fail,pending,pass}=assess(n.id,input);
      const status=fail.length?'입력 조건 불충족':pending.length?'추가 정보 필요':'입력 조건 충족';
      return '<article><small>'+ (n.id==='gwanak'?'관악구 자체 사업':'서울시 공통 사업')+'</small><h3>'+n.title+'</h3><p class="period">접수 마감 · '+n.period+'</p><strong>'+status+'</strong><ul>'+[...fail,...pending,...pass].map(v=>'<li>'+v+'</li>').join('')+'</ul><p>별도 심사 항목 · '+n.other+'</p><small>공고 확인일 2026.11.21 · 해당 회차 기준</small><br><a href="'+n.url+'" target="_blank" rel="noopener">공식 모집 공고 보기 ↗</a></article>';
    }).join('');
  });
}

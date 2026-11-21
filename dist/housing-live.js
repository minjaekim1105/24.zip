const districts = [{ name: '성북구', rent: 55, deposit: 1000, commute: null, transport: 82, facilities: 76, safety: 72, culture: 70, x: 57, y: 30 }, { name: '동작구', rent: 62, deposit: 1300, commute: null, transport: 88, facilities: 79, safety: 75, culture: 72, x: 49, y: 67 }, { name: '관악구', rent: 48, deposit: 900, commute: null, transport: 73, facilities: 75, safety: 68, culture: 69, x: 48, y: 83 }, { name: '마포구', rent: 70, deposit: 1600, commute: null, transport: 90, facilities: 92, safety: 76, culture: 95, x: 30, y: 47 }, { name: '광진구', rent: 63, deposit: 1400, commute: null, transport: 86, facilities: 87, safety: 77, culture: 82, x: 77, y: 51 }, { name: '노원구', rent: 49, deposit: 900, commute: null, transport: 72, facilities: 74, safety: 78, culture: 71, x: 70, y: 17 }, { name: '강서구', rent: 54, deposit: 1050, commute: null, transport: 74, facilities: 76, safety: 71, culture: 73, x: 14, y: 57 }, { name: '영등포구', rent: 65, deposit: 1450, commute: null, transport: 89, facilities: 87, safety: 69, culture: 85, x: 33, y: 66 }];
        const official = { rent: 'https://housing.seoul.go.kr/site/main/content/sh01_060513', move: 'https://youth.seoul.go.kr/youthConts.do?key=2310100044&sc_bbsStngSn=2212200001&sc_pbancSeCd=015' };
        const policies = [{ id: 'rent', name: '서울시 청년월세지원', scope: '서울시 공통', desc: '청년의 월세 부담 완화를 위한 지원사업', url: official.rent, docs: ['임대차계약서', '주민등록등본', '월세 납부 증빙', '공고상 추가 제출서류'], steps: ['공식 공고에서 모집기간·자격 확인', '계약 및 소득 관련 서류 준비', '서울주거포털 신청 방법 확인', '공식 신청처에서 접수'] }, { id: 'move', name: '청년 중개보수·이사비 지원', scope: '서울시 공통', desc: '이사 시 발생한 중개보수 및 이사비 일부 지원', url: official.move, docs: ['주민등록 관련 서류', '임대차계약서', '중개보수·이사비 지출 증빙', '공고상 추가 제출서류'], steps: ['공고 기준 이사·전입 요건 확인', '지출 증빙서류 준비', '청년몽땅정보통 모집 공고 확인', '공식 신청처에서 접수'] }];
        let state = { page: 'home', budget: 70, deposit: 1000, destination: '', destinationAddress: '', destinationLat: null, destinationLng: null, destinationSource: '', maxTime: 60, mode: '대중교통', priorities: ['transport', 'cost'], first: 'transport', selectedDistrict: '', selectedPolicy: 'rent', showCount: 3, age: '', income: '', household: '1', homeless: 'unknown', contract: 'unknown', resident: 'unknown', checks: {}, results: null }; try { let saved = JSON.parse(sessionStorage.getItem('zip24state-real-routes-v1')); if (saved && typeof saved === 'object') state = { ...state, ...saved, page: 'home' } } catch (e) { }
        if (!['cost', 'transport'].includes(state.first)) state.first = 'cost';
        function save() { try { sessionStorage.setItem('zip24state-real-routes-v1', JSON.stringify(state)) } catch (e) { } } function set(k, v) { state[k] = v; save() } function go(page) { state.page = page; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }) } function resetAll() { try { sessionStorage.removeItem('zip24state-real-routes-v1') } catch (e) { } location.reload() } function toggleMenu(force) { let el = document.getElementById('menu'); el.classList.toggle('hidden', force === false ? true : force === true ? false : !el.classList.contains('hidden')) } function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) } function progress(active) { let steps = [['input', '조건 입력'], ['recommend', '지역 추천'], ['eligibility', '자격 확인'], ['result', '결과 확인'], ['assist', '신청 도움']]; let idx = steps.findIndex(x => x[0] === active); if (active === 'map') idx = 1; return '<div class="progress">' + steps.map((s, i) => `${i ? '<div class="connector"></div>' : ''}<div class="step ${i <= idx ? 'active' : ''}"><span class="num">${i + 1}</span><span>${s[1]}</span></div>`).join('') + '</div>' } function heading(tag, h, p) { return `<div class="heading"><span class="tag">${tag}</span><h1>${h}</h1><p>${p}</p></div>` } function skyline() { return `<svg class="skyline" viewBox="0 0 850 310" preserveAspectRatio="xMidYMax slice" role="img" aria-label="서울의 주택과 남산타워를 표현한 일러스트"><path d="M0 260 Q130 130 230 235T460 230T850 190V310H0" fill="#6397a0"/><path d="M0 282 Q160 210 260 256T550 235T850 248V310H0" fill="#2c6875"/><path d="M490 130h12V63h7v67h12v70h-31z" fill="#385d7b"/><path d="M482 76h45l-7-12h-30z" fill="#385d7b"/><path d="M495 33h6v37h-6z" fill="#385d7b"/><path d="M0 248h113v62H0zM142 205h101v105H142zM265 230h115v80H265zM545 214h111v96H545zM679 190h171v120H679z" fill="#fbf5e9"/><path d="M0 245h115l-10-24H20zM142 205h101l-7-20h-85zM265 230h115l-14-23h-90zM545 213h111l-22-22h-75zM679 190h171l-18-23H697z" fill="#b35e46"/><g fill="#91b9d4"><rect x="32" y="264" width="22" height="22"/><rect x="69" y="264" width="22" height="22"/><rect x="163" y="223" width="20" height="26"/><rect x="199" y="223" width="20" height="26"/><rect x="301" y="251" width="23" height="25"/><rect x="347" y="251" width="23" height="25"/><rect x="564" y="234" width="22" height="25"/><rect x="611" y="234" width="22" height="25"/><rect x="702" y="213" width="30" height="27"/><rect x="750" y="213" width="30" height="27"/><rect x="801" y="213" width="30" height="27"/></g><path d="M0 300 Q240 279 450 300T850 287" stroke="#d8c1a7" stroke-width="14" fill="none"/></svg>` } function home() { return `<div class="panel hero"><div class="hero-art">${skyline()}</div><div class="hero-content"><span class="tag">SEOUL YOUTH HOUSING GUIDE</span><h1>내 조건에 맞는<br>서울 동네 찾기</h1><p>주거비부터 교통, 생활환경, 주거지원제도까지<br>나에게 맞는 서울의 동네를 한곳에서 살펴보세요.</p><button class="btn primary" onclick="go(&quot;input&quot;)">내 조건으로 시작하기 →</button></div></div><div class="feature-row"><div class="mini"><span class="svgicon">01</span><b>맞춤 동네 추천</b><small>예산과 생활 우선순위 분석</small></div><div class="mini"><span class="svgicon">02</span><b>지역별 비교</b><small>주거비와 이동시간 비교</small></div><div class="mini"><span class="svgicon">03</span><b>지원사업 확인</b><small>자격조건 점검과 신청 안내</small></div></div><div class="notice">현재 버전은 해커톤 시연용 프로토타입입니다. 주거비는 예시이며, 지도·장소 검색과 직접 조회한 이동시간은 카카오 API를 사용합니다.</div>` }
        const priorityList = [['cost', '주거비 절약'], ['transport', '교통 편의']]; function formInput() { return `${progress('input')}<section class="panel">${heading('STEP 01 · 주거 조건 입력', '어떤 서울 동네를 찾고 있나요?', '원하는 조건을 알려주시면 나에게 맞는 지역을 추천해드려요.')}<div class="formgrid"><div class="field"><label for="budget">월 주거비 상한 (월세 + 관리비)</label><input id="budget" type="number" min="0" max="1000" step="5" value="${esc(state.budget)}" onchange="set('budget',Number(this.value))"><div class="helper">단위: 만원 · 시연 데이터는 지역 평균이 아닌 가상 참고값입니다.</div></div><div class="field"><label for="deposit">최대 보증금</label><input id="deposit" type="number" min="0" max="100000" step="100" value="${esc(state.deposit)}" onchange="set('deposit',Number(this.value))"><div class="helper">단위: 만원</div></div><div class="field destination-field"><label for="destination">주요 이동 목적지</label><div class="address-search"><div class="address-input-wrap"><input id="destination" type="text" placeholder="예: 광화문역, 서울시청, 서울특별시청" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="addressSuggestions" aria-expanded="false" value="${esc(state.destination)}" oninput="onDestinationInput(this.value)" onkeydown="onDestinationKeydown(event)"><div id="addressSuggestions" class="address-suggestions hidden" role="listbox"></div></div><button type="button" class="btn secondary address-button" onclick="openAddressSearch()">주소 검색</button></div><div id="destinationStatus" class="helper" aria-live="polite">${state.destinationAddress ? '선택된 주소: ' + esc(state.destinationAddress) : ''}</div><div class="helper">장소 검색 결과나 주소 검색으로 목적지를 확정해 주세요. 추천 화면의 조회 버튼으로 실제 이동시간을 확인해요.</div></div><div class="field"><label for="maxTime">허용 이동시간</label><select id="maxTime" onchange="set('maxTime',Number(this.value))">${[20, 30, 40, 50, 60, 90, 120].map(v => `<option value="${v}" ${state.maxTime === v ? 'selected' : ''}>${v}분 이내</option>`).join('')}</select></div><div class="field"><label for="mode">이동 수단</label><select id="mode" onchange="set('mode',this.value)">${['대중교통', '도보', '자가용'].map(v => `<option ${state.mode === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div><div class="subhead">어떤 조건을 더 중요하게 생각하나요?</div><div class="chips"><button type="button" class="chip ${state.first !== 'transport' ? 'selected' : ''}" onclick="set('first','cost');render()">주거비 절약 우선</button><button type="button" class="chip ${state.first === 'transport' ? 'selected' : ''}" onclick="set('first','transport');render()">목적지 이동시간 우선</button></div><p class="helper" style="margin-top:9px">주거비와 이동시간을 함께 고려해, 선택한 우선순위에 따라 개인별 적합도를 계산합니다.</p><div class="notice">주거비·보증금은 예시 참고값입니다. 목적지까지의 실제 경로를 조회한 뒤 두 항목에 가중치를 적용해 적합도를 계산합니다.</div><div class="actions"><button class="btn" onclick="go('home')">이전으로</button><button class="btn primary" onclick="validateAndGo()">추천 결과 확인하기 →</button></div></section>` } function togglePriority(id) { state.priorities = state.priorities.includes(id) ? state.priorities.filter(x => x !== id) : [...state.priorities, id]; if (!state.priorities.includes(state.first)) state.first = state.priorities[0] || ''; save(); render() } function validateAndGo(){if(!Number.isFinite(Number(state.budget))||Number(state.budget)<=0||!Number.isFinite(Number(state.deposit))||Number(state.deposit)<0){modal('입력값 확인','월 주거비는 0보다 크게, 보증금은 0 이상 입력해 주세요.');return;}if(!state.destination||(!state.destinationAddress&&!liveHousing().destinationCoords)){modal('목적지 선택','장소 검색 결과 또는 주소 검색으로 목적지를 확정해 주세요.');return;}state.showCount=3;state.liveError='';save();go('recommend');}
        /*
         * 24.zip 개인별 적합도: 비용 0~100점 + 이동시간 0~100점을 가중 평균.
         * 아래 기준은 팀 내부에서 조정하는 '시연용 정책값'이며, 통계적으로 검증된 기준이 아님.
         * 팀원 실측 데이터를 연결할 때 districts의 rent(월세+관리비), deposit, commute를 교체.
         * 향후 monthlyTotal이 있으면 이를 우선 사용함.
         */
        const SCORING_RULES = {
            weights: { costFirst: { cost: 0.7, transport: 0.3 }, transportFirst: { cost: 0.3, transport: 0.7 } },
            // 월 주거비 / 사용자의 월 예산 비율 -> 비용 하위 점수
            costBands: [[0.70,100], [0.85,90], [1.00,80], [1.10,60], [1.25,40], [1.50,20], [Infinity,0]],
            // 이동시간 / 허용 이동시간 비율 -> 교통 하위 점수
            timeBands: [[0.50,100], [0.70,90], [0.85,80], [1.00,70], [1.15,50], [1.30,30], [Infinity,0]],
            monthlyWeight: 0.8, depositWeight: 0.2
        };
        const boundedScore = value => Math.max(0, Math.min(100, Math.round(value)));
        function bandScore(ratio, bands) {
            return bands.find(([limit]) => ratio <= limit)?.[1] ?? 0;
        }
        const liveDistrictIds={성북구:'seongbuk',동작구:'dongjak',관악구:'gwanak',마포구:'mapo',광진구:'gwangjin',노원구:'nowon',강서구:'gangseo',영등포구:'yeongdeungpo'};
        let liveRunId=0;
        state.liveLoading=false;
        function liveHousing(){return {destination:state.destination||state.destinationAddress,destinationCoords:Number.isFinite(state.destinationLat)&&Number.isFinite(state.destinationLng)?{lat:state.destinationLat,lng:state.destinationLng}:null,mode:({'대중교통':'transit','도보':'walk','자가용':'car'})[state.mode],maxMinutes:String(state.maxTime)};}
        function liveRoute(d){return window.neighborhoodRoutes.get(liveHousing(),liveDistrictIds[d.name]);}
        function costDetails(d){
            const monthly=d.monthlyTotal??d.rent,deposit=d.deposit;
            if([monthly,deposit].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||!Number.isFinite(Number(state.budget))||Number(state.budget)<=0||!Number.isFinite(Number(state.deposit))||Number(state.deposit)<0)return null;
            const monthlyScore=bandScore(monthly/Number(state.budget),SCORING_RULES.costBands);
            const depositScore=Number(state.deposit)===0?(deposit===0?100:0):bandScore(deposit/Number(state.deposit),SCORING_RULES.costBands);
            return {monthly,deposit,monthlyScore,depositScore,costScore:boundedScore(monthlyScore*SCORING_RULES.monthlyWeight+depositScore*SCORING_RULES.depositWeight)};
        }
        function scoreDetails(d){
            const cost=costDetails(d),route=liveRoute(d),minutes=route.median;
            if(!cost||route.count<2||!Number.isFinite(minutes)||!Number.isFinite(Number(state.maxTime))||Number(state.maxTime)<=0)return null;
            const transportScore=bandScore(minutes/Number(state.maxTime),SCORING_RULES.timeBands);
            const weight=state.first==='transport'?SCORING_RULES.weights.transportFirst:SCORING_RULES.weights.costFirst;
            const rawTotal=cost.costScore*weight.cost+transportScore*weight.transport;
            return {...cost,minutes,transportScore,weight,rawTotal,total:boundedScore(rawTotal)};
        }
        function score(d){return scoreDetails(d)?.total??null;}
        function ranked(){return districts.map(d=>{const detail=scoreDetails(d);return {...d,score:detail?.total??null,rawScore:detail?.rawTotal??null,commute:detail?.minutes??null};}).sort((a,b)=>(b.rawScore??-1)-(a.rawScore??-1));}
        const liveMinutes=value=>Number(value.toFixed(1));
        function liveTimeText(d){const r=liveRoute(d);if(r.count===1){const p=r.points.find(p=>p.status==='ok');return esc(p.name)+' 기준 '+liveMinutes(p.minutes)+'분 · 기준점 부족';}if(r.count>=2)return state.mode+' 약 '+liveMinutes(r.min)+(r.min===r.max?'':'–'+liveMinutes(r.max))+'분';if(r.status==='no_destination')return '목적지 미선택';if(r.status==='no_coordinates')return '목적지 좌표 미확정';if(r.status==='idle')return '이동시간 조회 전';if(r.status==='loading')return '조회 중…';if(r.points.some(p=>p.status==='rate_limit'))return '조회 한도 초과';if(r.points.some(p=>p.status==='configuration'))return '선택 수단의 서버 키 설정 필요';if(r.registered===0)return '확인된 기준점 없음';return '이동시간 정보 없음';}
        function liveEvidence(d){const r=liveRoute(d);return r.count?'기준점 '+r.registered+'곳 중 '+r.count+'곳 조회 · '+(r.count>=2?'중앙값 '+liveMinutes(r.median)+'분 · ':'')+state.maxTime+'분 이내 '+r.within+'곳':'아직 실제 경로를 조회하지 않았거나 유효한 결과가 부족해요.';}
        async function ensureLiveDestination(){
            if(liveHousing().destinationCoords)return;
            if(!state.destinationAddress)throw Error('장소 검색 결과를 선택하거나 주소 검색으로 목적지를 확정해 주세요.');
            const query=state.destinationAddress;const places=await window.realMaps.search(query);if(state.destinationAddress!==query)throw Error('목적지가 변경되었어요. 다시 조회해 주세요.');
            const chosen=places.find(p=>p.address===query)||places[0];if(!chosen)throw Error('선택한 주소의 좌표를 찾지 못했어요. 장소 검색 결과를 다시 선택해 주세요.');
            state.destinationLat=chosen.lat;state.destinationLng=chosen.lng;save();
        }
        function liveSignature(){const h=liveHousing();return JSON.stringify([h.destinationCoords,h.mode]);}
        async function queryLiveRoutes(name){
            if(state.liveLoading)return;
            state.liveError='';state.liveLoading=true;const run=++liveRunId;render();
            try{
                await ensureLiveDestination();const h=liveHousing(),signature=liveSignature();
                const targets=name?districts.filter(d=>d.name===name):districts;
                for(let index=0;index<targets.length;index++){
                    if(run!==liveRunId||signature!==liveSignature())break;
                    const d=targets[index];const status=document.getElementById('liveRouteStatus');if(status)status.textContent=d.name+' 이동시간 조회 중 · '+(index+1)+' / '+targets.length;
                    const previous=window.neighborhoodRoutes.get(h,liveDistrictIds[d.name]);
                    await window.neighborhoodRoutes.loadDistrict(h,{id:liveDistrictIds[d.name],name:d.name},()=>{},previous.status==='complete'&&previous.count<2);
                }
            }catch(error){state.liveError=error.message||'경로 연결을 확인해 주세요.';}
            finally{if(run===liveRunId){state.liveLoading=false;save();render();}}
        }
        function liveRouteDetails(d){const r=liveRoute(d);if(!r.points.length)return '';
            const segment=(p,key)=>p.status!=='ok'||p.transitBreakdown?.[key]==null?'정보 없음':p.transitBreakdown[key]===0&&p.transitUsed?.[key]===false?'미이용':liveMinutes(p.transitBreakdown[key])+'분';
            return '<details class="live-departures"><summary>출발지별 시간과 점수 근거 보기</summary><p>'+liveEvidence(d)+'</p>'+r.points.map(p=>'<div class="live-origin"><strong>'+esc(p.name)+'</strong><small>'+esc(p.locationName||p.message||'')+' '+esc(p.address||'')+'</small><b>'+(p.status==='ok'?liveMinutes(p.minutes)+'분 · '+(p.minutes<=state.maxTime?'기준 이내':'기준 초과'):esc(p.message||'정보 없음'))+'</b>'+(state.mode==='대중교통'?'<small>지하철 탑승 '+segment(p,'subway')+' · 버스 탑승 '+segment(p,'bus')+' · 전체 도보 '+segment(p,'walk')+'</small>':'')+'</div>').join('')+'<p class="helper">같은 대표 경로의 구간 시간이며 구간 합을 총시간에 다시 더하지 않아요. 시간 범위는 조회한 생활권 기준점의 결과예요.</p></details>';}
 function miniCity(d) { return `<svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="100" fill="#8cc5e8"/><path d="M0 56Q60 19 110 57T200 43V100H0" fill="#50859d"/><path d="M0 84h50V100H0zM53 61h46v39H53zM103 72h36v28h-36zM140 54h60v46h-60z" fill="#e7e0d2"/><g fill="#4b7799"><rect x="65" y="68" width="9" height="11"/><rect x="81" y="68" width="9" height="11"/><rect x="154" y="63" width="12" height="12"/><rect x="176" y="63" width="12" height="12"/></g><path d="M0 84h50l-5-9H5zM53 61h46l-7-10H60zM140 54h60l-10-12h-42z" fill="#a96053"/></svg>` } function selectDistrict(name) { state.selectedDistrict = name; save(); render() } function selectPolicy(id) { state.selectedPolicy = id; save(); render() } function gotoElig() { if (!state.selectedDistrict) { modal('지역 선택 필요', '관심 있는 지역을 하나 선택해 주세요.'); return } go('eligibility') } function recommend(){
 const all=ranked(),rows=all.slice(0,state.showCount),evaluated=all.filter(d=>d.score!=null).length;
 return progress('recommend')+'<section class="panel">'+heading('STEP 02 · 맞춤 지역구 추천','당신에게 맞는 서울 동네','입력한 예산과 실제 목적지 이동시간을 선택한 가중치로 비교해요.')+
 '<div class="notice"><strong>실제 경로 + 예시 주거비</strong><br>월 주거비와 보증금은 첨부 코드의 가상 참고값이에요. 실제 부동산 데이터는 아직 연결하지 않았어요. 이동시간은 직접 조회한 카카오 경로만 사용하며, 2곳 이상 성공한 기준점의 중앙값으로 평가해요.</div>'+
 '<div class="live-input-summary">월 주거비 상한 '+state.budget+'만원 · 보증금 상한 '+state.deposit+'만원 · '+esc(state.destination)+' · '+esc(state.mode)+' · 허용 '+state.maxTime+'분<br>가중치: '+(state.first==='transport'?'주거비 30% · 이동시간 70%':'주거비 70% · 이동시간 30%')+' · 실제 경로 평가 가능 '+evaluated+' / '+districts.length+'개 구</div>'+
 '<div class="actions"><button class="btn primary" onclick="queryLiveRoutes()" '+(state.liveLoading?'disabled':'')+'>'+(state.liveLoading?'조회 중…':'8개 구 실제 이동시간으로 적합도 계산')+'</button><button class="btn" onclick="go(&quot;input&quot;)">조건 수정하기</button><button class="btn" onclick="go(&quot;map&quot;)">지도에서 비교하기 →</button></div><p id="liveRouteStatus" class="helper" role="status">'+(state.liveLoading?'선택한 목적지까지 실제 경로를 조회하고 있어요.':'조회한 구의 적합도만 순위에 반영해요. 미조회 지역은 아직 전체 비교가 완료되지 않았어요.')+'</p>'+(state.liveError?'<p class="live-error" role="alert">'+esc(state.liveError)+'</p>':'')+
 '<div class="reco-grid" style="margin-top:18px">'+rows.map((d,i)=>'<article class="reco"><div class="thumb">'+miniCity(d)+'</div><div class="reco-body"><div class="reco-head"><h3>'+d.name+'</h3><span class="rank">'+(d.score==null?'미평가':'추천 '+(i+1))+'</span></div><div class="stat"><span>월 주거비 참고값 · 예시</span><b>'+(d.monthlyTotal??d.rent)+'만원</b></div><div class="stat"><span>실제 예상 이동시간</span><b>'+liveTimeText(d)+'</b></div><div class="stat"><span>개인별 적합도</span><b class="score">'+(d.score==null?'조회 후 확인':d.score+' / 100점')+'</b></div><div class="reasons">'+reason(d)+'</div><button class="btn live-query" onclick="queryLiveRoutes(&quot;'+d.name+'&quot;)" '+(state.liveLoading?'disabled':'')+'>'+ (state.liveLoading?'조회 중…':'이 구의 실제 이동시간 조회·계산')+'</button>'+liveRouteDetails(d)+'<button class="rbtn '+(state.selectedDistrict===d.name?'on':'')+'" onclick="selectDistrict(&quot;'+d.name+'&quot;)">'+(state.selectedDistrict===d.name?'✓ 선택한 관심 지역':'이 지역 선택하기')+'</button></div></article>').join('')+'</div>'+
 '<div class="actions"><button class="btn secondary" onclick="state.showCount=state.showCount>=districts.length?3:Math.min(districts.length,state.showCount+3);save();render()">'+(state.showCount>=districts.length?'처음 3개만 보기':'다른 지역 더 보기')+'</button></div><div class="subhead">관련 청년 주거지원사업</div><p class="helper">서울시 공통 사업으로, 지역 적합도가 신청 자격을 뜻하지 않아요.</p><div class="policy-stack">'+policies.map(p=>'<label class="policy"><input type="radio" name="policy" '+(state.selectedPolicy===p.id?'checked':'')+' onchange="selectPolicy(&quot;'+p.id+'&quot;)"><div><strong>'+p.name+'</strong><small>'+p.desc+'<br>서울시 공통 · 자격 확인 필요</small></div></label>').join('')+'</div><div class="actions"><button class="btn primary" onclick="gotoElig()">내 조건 확인하기 →</button></div></section>';
}
function reason(d){const detail=scoreDetails(d);if(!detail)return liveRoute(d).count===1?'기준점 1곳의 시간만 확인돼 구 단위 이동시간 점수를 산정하지 않아요.':'유효한 실제 경로가 2곳 이상 조회되면 개인별 적합도를 계산해요. 예시 이동시간은 사용하지 않아요.';
 return '주거비 점수 '+detail.costScore+'점 × '+Math.round(detail.weight.cost*100)+'% + 실제 이동시간 점수 '+detail.transportScore+'점 × '+Math.round(detail.weight.transport*100)+'%. '+liveEvidence(d)+'. 주거비는 예시 참고값이에요.';
}
        function mapArt() { return `<svg viewBox="0 0 500 340" preserveAspectRatio="none" aria-label="서울 지역 상대 위치를 나타낸 개념도"><rect width="500" height="340" fill="#e8f2e9"/><path d="M0 35Q80 10 150 65T300 50T500 20M0 156Q100 110 150 160T330 150T500 127M0 270Q80 230 190 252T500 230" stroke="#fff" stroke-width="25" fill="none"/><path d="M0 220Q80 200 120 208T235 194T355 200T500 155" stroke="#91c8e5" stroke-width="34" fill="none"/><path d="M0 220Q80 200 120 208T235 194T355 200T500 155" stroke="#b8e0ef" stroke-width="18" fill="none"/><path d="M72 0v340M174 0v340M307 0v340M420 0v340M0 90h500M0 288h500" stroke="#fff" stroke-width="7" opacity=".85"/><path d="M50 55l48 30 44-44 67 30-30 38-80 15zM330 55l61-36 59 45-25 54-70 11zM350 235l53-23 69 29-20 67-63-10z" fill="#b9d8b5" opacity=".7"/></svg>` } function mapPage(){const rows=ranked().slice(0,3),chosen=ranked().find(d=>d.name===state.selectedDistrict);return progress('map')+'<section class="panel">'+heading('STEP 02 · 지역 탐색 및 비교','지도에서 동네 비교','추천 화면에서 조회한 실제 이동시간과 같은 적합도를 표시해요.')+'<div class="map-head-row"><p>'+esc(state.destination||'목적지 미선택')+' · '+esc(state.destinationAddress)+'</p><button class="map-recenter" onclick="recenterComparisonMap()">목적지로 중심 이동</button></div><div class="map-layout"><div><div id="kakaoComparisonMap" class="real-map" role="region" aria-label="목적지와 자치구 지도"><div class="map-status" id="mapLoadStatus">실제 지도를 불러오는 중입니다…</div></div><div id="mapWarning" class="helper" aria-live="polite"></div><p class="smallnote">지도는 실제 위치예요. 주거비는 예시 참고값이고, 이동시간은 조회한 생활권 기준점의 결과예요.</p></div><div><h3>관심 지역 상세</h3>'+(chosen?'<div class="result"><h3>'+chosen.name+'</h3><div class="stat"><span>월 주거비 · 예시</span><b>'+(chosen.monthlyTotal??chosen.rent)+'만원</b></div><div class="stat"><span>실제 예상 이동시간</span><b>'+liveTimeText(chosen)+'</b></div><div class="stat"><span>개인별 적합도</span><b>'+(chosen.score==null?'조회 후 확인':chosen.score+' / 100점')+'</b></div><div class="reasons">'+reason(chosen)+'</div>'+liveRouteDetails(chosen)+'</div>':'<div class="empty">지도에서 자치구를 선택해 주세요.</div>')+'</div></div><div class="subhead">추천 지역 비교표</div><div class="tablewrap"><table><thead><tr><th>비교 항목</th>'+rows.map(d=>'<th>'+d.name+'</th>').join('')+'</tr></thead><tbody><tr><td>월 주거비 · 예시</td>'+rows.map(d=>'<td>'+(d.monthlyTotal??d.rent)+'만원</td>').join('')+'</tr><tr><td>실제 이동시간</td>'+rows.map(d=>'<td>'+liveTimeText(d)+'</td>').join('')+'</tr><tr><td>개인별 적합도</td>'+rows.map(d=>'<td>'+(d.score==null?'조회 후 확인':d.score+' / 100점')+'</td>').join('')+'</tr></tbody></table></div><div class="actions"><button class="btn" onclick="go(&quot;recommend&quot;)">← 추천 목록으로</button></div></section>';}
        let comparisonMap = null;
        let comparisonDestination = null;
        let comparisonMapMarkers = [];
        let comparisonMapRun = 0;
        function mapStatus(message) {
            const el = document.getElementById('mapLoadStatus');
            if (el) el.textContent = message;
        }
        function recenterComparisonMap() {
            if (comparisonMap && comparisonDestination) {
                comparisonMap.setCenter(comparisonDestination);
                comparisonMap.setLevel(8);
            } else if (state.page === 'map') {
                initComparisonMap();
            }
        }
        function initComparisonMap() {
            const container = document.getElementById('kakaoComparisonMap');
            if (!container || state.page !== 'map') return;
            if (!KAKAO_JS_KEY.trim()) { mapStatus('카카오맵 JavaScript 키를 등록해야 실제 지도가 표시됩니다.'); return; }
            if (!kakaoSdkReady || !window.kakao?.maps?.services) {
                mapStatus('카카오맵 SDK를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
                return;
            }
            const run = ++comparisonMapRun;
            const geocoder = new kakao.maps.services.Geocoder();
            const validDestination = Number.isFinite(Number(state.destinationLat)) && Number.isFinite(Number(state.destinationLng)) && state.destinationLat !== null && state.destinationLng !== null;
            function show(center) {
                if (run !== comparisonMapRun || !document.getElementById('kakaoComparisonMap') || state.page !== 'map') return;
                container.innerHTML = '';
                const baseCenter = center || new kakao.maps.LatLng(37.5665, 126.9780);
                const map = new kakao.maps.Map(container, { center: baseCenter, level: 8 });
                comparisonMap = map;
                comparisonDestination = center || null;
                const controls = new kakao.maps.ZoomControl();
                map.addControl(controls, kakao.maps.ControlPosition.RIGHT);
                if (center) {
                    const pin = document.createElement('button');
                    pin.className = 'kakao-pin target'; pin.type='button';
                    pin.textContent = state.destination || '선택한 장소';
                    pin.title = state.destinationAddress || state.destination;
                    const overlay = new kakao.maps.CustomOverlay({map, position:center, content:pin, yAnchor:1, clickable:true, zIndex:12});
                    comparisonMapMarkers.push(overlay);
                    pin.addEventListener('click', () => { map.setCenter(center); });
                }
                const rows = ranked().slice(0, 3);
                rows.forEach((d, index) => {
                    geocoder.addressSearch('서울특별시 ' + d.name, (items, status) => {
                        if (run !== comparisonMapRun || state.page !== 'map') return;
                        if (status !== kakao.maps.services.Status.OK || !items.length) return;
                        const position = new kakao.maps.LatLng(Number(items[0].y), Number(items[0].x));
                        const pin = document.createElement('button'); pin.type='button';
                        pin.className = 'kakao-pin' + (d.name === state.selectedDistrict ? ' selected' : '');
                        pin.textContent = `${index + 1}위 ${d.name} · ${d.score == null ? '정보 없음' : d.score + '점'}`;
                        pin.title = d.name + ' 자세히 보기';
                        pin.addEventListener('click', () => {
                            state.selectedDistrict = d.name; save();
                            // 입력 목적지는 지도 중앙에 유지하고 비교 정보만 갱신
                            go('map');
                        });
                        const overlay = new kakao.maps.CustomOverlay({map, position, content:pin, yAnchor:1, clickable:true, zIndex:8});
                        comparisonMapMarkers.push(overlay);
                    });
                });
                window.setTimeout(() => { if (run === comparisonMapRun) map.relayout(); }, 100);
            }
            if (validDestination) {
                show(new kakao.maps.LatLng(Number(state.destinationLat), Number(state.destinationLng)));
            } else if (state.destinationAddress) {
                mapStatus('선택한 주소를 실제 좌표로 변환하는 중입니다…');
                geocoder.addressSearch(state.destinationAddress, (items,status) => {
                    if (run !== comparisonMapRun || state.page !== 'map') return;
                    if (status === kakao.maps.services.Status.OK && items.length) {
                        state.destinationLat = Number(items[0].y);
                        state.destinationLng = Number(items[0].x);
                        save();
                        show(new kakao.maps.LatLng(state.destinationLat,state.destinationLng));
                    } else {
                        show(null);
                        showMapWarning('목적지 주소의 위치를 찾지 못해 서울시청을 중심으로 표시합니다. 주소를 다시 선택해 주세요.');
                    }
                });
            } else {
                show(null);
                showMapWarning('목적지 좌표가 없어 서울시청을 중심으로 표시합니다. 조건 입력에서 장소 검색 결과를 선택하면 목적지 중심으로 표시돼요.');
            }
        }
        function showMapWarning(message) {
            const el = document.getElementById('mapWarning');
            if (el) el.textContent = message;
        }
        function eligibility() { let p = policies.find(x => x.id === state.selectedPolicy); return `${progress('eligibility')}<section class="panel">${heading('STEP 03 · 사업별 자격 정보 입력', '지원 확인용 정보 입력', '선택한 사업의 기본 조건을 확인하기 위한 정보를 입력해 주세요.')}<div class="notice">선택 지역: <b>${esc(state.selectedDistrict || '미선택')}</b> / 선택 사업: <b>${p.name}</b><br>입력 정보는 이 브라우저 탭의 세션 저장소에 임시 보관됩니다. 데모에서는 서버로 전송하지 않습니다.</div><div class="formgrid"><div class="field"><label for="age">만 나이</label><input id="age" type="number" min="0" max="120" placeholder="예: 24" value="${esc(state.age)}" onchange="set('age',this.value)"></div><div class="field"><label for="income">연 소득(만원)</label><input id="income" type="number" min="0" placeholder="예: 2400" value="${esc(state.income)}" onchange="set('income',this.value)"><small class="helper">소득 정의는 정책마다 다릅니다. 여기서는 참고 입력값으로만 사용해요.</small></div><div class="field"><label for="household">가구 형태</label><select id="household" onchange="set('household',this.value)">${[['1', '1인 가구'], ['2', '2인 가구'], ['3', '3인 이상 가구']].map(([id, n]) => `<option value="${id}" ${state.household === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="field"><label for="homeless">무주택 여부</label><select id="homeless" onchange="set('homeless',this.value)">${[['unknown', '잘 모르겠어요'], ['yes', '무주택'], ['no', '주택 소유']].map(([id, n]) => `<option value="${id}" ${state.homeless === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="field"><label for="resident">서울 거주·전입 관련</label><select id="resident" onchange="set('resident',this.value)">${[['unknown', '아직 확정하지 않았어요'], ['yes', '서울 거주·전입 완료'], ['no', '서울 외 거주 / 미전입']].map(([id, n]) => `<option value="${id}" ${state.resident === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="field"><label for="contract">임대차계약 또는 이사 증빙</label><select id="contract" onchange="set('contract',this.value)">${[['unknown', '주택 미정 / 증빙 미확인'], ['yes', '계약·지출 증빙 준비 가능'], ['no', '계약·지출 증빙 없음']].map(([id, n]) => `<option value="${id}" ${state.contract === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div><div class="notice">정책별 연령·소득·자산·전입·중복지원 조건은 해마다 바뀔 수 있어, 이 데모는 정확한 자동 판정 대신 <b>확인된 정보와 미확인 정보를 구분</b>합니다.</div><div class="actions"><button class="btn" onclick="go('recommend')">지역 추천으로</button><button class="btn primary" onclick="calculateResult()">신청 조건 확인하기 →</button></div></section>` }
        function calculateResult() { let age = state.age === '' ? null : Number(state.age), income = state.income === '' ? null : Number(state.income); if (age !== null && (age < 0 || age > 120)) { modal('입력값 확인', '나이를 다시 확인해주세요.'); return } if (income !== null && income < 0) { modal('입력값 확인', '소득을 다시 확인해주세요.'); return } let evidence = [], need = [], unmet = []; if (age === null) need.push('나이 정보가 없습니다.'); else if (age < 19 || age > 39) unmet.push('시연용 청년 연령 범위(만 19~39세) 밖입니다. 사업별 실제 연령 범위를 공식 공고에서 확인하세요.'); else evidence.push('청년 연령 범위 참고 확인'); if (income === null) need.push('사업별 공식 소득·재산 기준 확인이 필요합니다.'); else need.push('소득 ' + income.toLocaleString() + '만원의 사업별 인정 소득 기준 및 가구 소득 심사가 필요합니다.'); if (state.homeless === 'no') unmet.push('주택 소유 여부가 해당 지원사업 제한 사유일 수 있습니다.'); else if (state.homeless === 'unknown') need.push('무주택 여부 확인이 필요합니다.'); else evidence.push('무주택으로 입력됨'); if (state.resident === 'no') need.push('서울 거주·전입 요건 충족 시점 확인이 필요합니다.'); else if (state.resident === 'unknown') need.push('서울 거주·전입 조건 확인이 필요합니다.'); else evidence.push('서울 거주·전입 완료로 입력됨'); if (state.contract !== 'yes') need.push('임대차계약 및 지출 증빙 등 사업별 필수 서류 확인이 필요합니다.'); else evidence.push('증빙서류 준비 가능으로 입력됨'); if (state.selectedPolicy === 'move') need.push('해당 연도 이사 시기·중개보수·지출 인정 요건 및 중복수급 조건 확인이 필요합니다.'); if (state.selectedPolicy === 'rent') need.push('보증금·월세·주거급여·소득·자산·기수급 여부 등 세부 요건 확인이 필요합니다.'); state.results = { status: unmet.length ? 'bad' : need.length ? 'pending' : 'good', evidence, need, unmet }; save(); go('result') }
        function result() { if (!state.results) return eligibility(); let r = state.results, p = policies.find(x => x.id === state.selectedPolicy), bad = r.status === 'bad'; return `${progress('result')}<section class="panel">${heading('STEP 04 · 신청 조건 확인 결과', '지원사업 매칭 결과', '입력 정보와 기본 항목을 비교했어요. 최종 판단은 반드시 공식 공고를 확인해 주세요.')}<div class="result ${bad ? 'bad' : 'pending'}"><h3>${bad ? '조건 미충족 가능' : '추가 확인 필요'}</h3><div class="muted">${p.name} · ${esc(state.selectedDistrict)}<br>${bad ? '일부 입력 조건이 청년 지원 요건과 맞지 않을 수 있어요.' : '기본 입력 정보를 확인했지만 실제 신청 가능 여부는 공식 심사와 추가 기준 확인이 필요해요.'}</div></div>${r.evidence.length ? `<div class="result good"><h3>✓ 입력 정보 중 확인된 항목</h3>${r.evidence.map(x => `<div class="result-detail">• ${esc(x)}</div>`).join('')}</div>` : ''}${r.unmet.length ? `<div class="result bad"><h3>조건 미충족 또는 주의 항목</h3>${r.unmet.map(x => `<div class="result-detail">• ${esc(x)}</div>`).join('')}</div>` : ''}<div class="result pending"><h3>추가 확인할 사항</h3>${r.need.map(x => `<div class="result-detail">• ${esc(x)}</div>`).join('')}</div><div class="notice">이 프로토타입은 지원 자격을 확정하거나 '신청 가능'을 보장하지 않습니다. 정확한 자격 판정 로직을 사용하려면 최신 공고의 기준을 구조화하고 검증해야 합니다.</div><div class="actions">${bad ? `<button class="btn primary" onclick="go('recommend')">다른 구 선택하기</button><button class="btn" onclick="go(&quot;input&quot;)">주거 조건 수정</button><button class="btn" onclick="go('home')">메인으로</button>` : `<button class="btn primary" onclick="go('assist')">신청 도움받기 →</button><button class="btn" onclick="go('eligibility')">정보 수정하기</button><button class="btn" onclick="go('recommend')">다른 사업 확인하기</button>`}</div></section>` }
        function assist() { let p = policies.find(x => x.id === state.selectedPolicy); return `${progress('assist')}<section class="panel">${heading('STEP 05 · 신청 도움', '지원사업 상세 및 신청 준비', '필요한 서류를 체크하고 공식 신청처에서 최신 공고를 확인하세요.')}<div class="result"><span class="tag">서울시 공통 지원사업</span><h2 style="margin:10px 0">${p.name}</h2><p class="lead">${p.desc}</p><div class="notice">2026년 현재 모집 상태·신청기간·세부 요건은 자동 연동하지 않았습니다. 아래 공식 페이지에서 확인해 주세요.</div></div><h3 class="subhead">신청 준비 체크리스트</h3>${p.docs.map((d, i) => `<label class="tick"><input type="checkbox" ${state.checks[p.id + '_' + i] ? 'checked' : ''} onchange="state.checks['${p.id}_${i}']=this.checked;save()">${d}</label>`).join('')}<h3 class="subhead">신청 절차</h3>${p.steps.map((s, i) => `<div class="box-row"><span><b>${i + 1}.</b> ${s}</span></div>`).join('')}<div class="actions"><a class="btn primary" href="${p.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;text-align:center">공식 안내·신청처 확인 ↗</a><button class="btn" onclick="go('result')">자격 결과로 돌아가기</button></div><p class="smallnote">※ 실제 신청과 최종 심사는 정부·지자체 공식 운영 기관에서 진행합니다.</p></section>` }
        function modal(title, body) { document.getElementById('modalRoot').innerHTML = `<div class="modal-back" role="dialog" aria-modal="true"><div class="modal"><h2>${esc(title)}</h2><p>${esc(body)}</p><div class="actions"><button class="btn primary" onclick="document.getElementById('modalRoot').innerHTML=''">확인</button></div></div></div>` } function render() { let pages = { home, input: formInput, recommend, map: mapPage, eligibility, result, assist }; document.getElementById('app').innerHTML = (pages[state.page] || home)(); if (state.page === 'map') { comparisonMap = null; comparisonDestination = null; initComparisonMap(); } else { comparisonMapRun++; comparisonMap = null; comparisonDestination = null; } document.title = '24.zip | ' + ({ home: '서울 청년 주거 탐색', input: '주거 조건 입력', recommend: '맞춤 동네 추천', map: '지역 비교', eligibility: '자격 정보 입력', result: '신청 조건 결과', assist: '신청 도움' }[state.page] || '주거 탐색') }

        // 주소 선택: 키가 없어도 동작하는 카카오 우편번호 검색 + 선택적 카카오맵 장소 검색
        // 장소명/역명 자동완성을 쓰려면 카카오디벨로퍼스의 JavaScript 키와 웹 도메인 등록이 필요합니다.
        const KAKAO_JS_KEY = window.MAP_CONFIG?.kakaoJavaScriptKey || ''; // 기존 서버 환경변수 사용
        let kakaoSdkReady = false;
        let placesService = null;
        let placeResults = [];
        let destinationComposing=false;
        document.addEventListener('compositionstart',e=>{if(e.target.id==='destination'){destinationComposing=true;clearTimeout(destinationTimer);destinationRequestId++;}});
        document.addEventListener('compositionend',e=>{if(e.target.id==='destination'){destinationComposing=false;onDestinationInput(e.target.value);}});
        let destinationTimer = null;
        let destinationRequestId = 0;
        let postcodeLoading = false;
        function destinationStatus(message) {
            const el = document.getElementById('destinationStatus');
            if (el) el.textContent = message;
        }
        function closeAddressSuggestions() {
            const el = document.getElementById('addressSuggestions');
            if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
            const input = document.getElementById('destination');
            if (input) input.setAttribute('aria-expanded', 'false');
        }
        function selectAddressResult(index) {
            const picked = placeResults[index];
            if (!picked) return;
            state.destination = picked.place_name;
            state.destinationAddress = picked.road_address_name || picked.address_name || '';
            state.destinationLat = Number(picked.y);
            state.destinationLng = Number(picked.x);
            state.destinationSource = 'kakao-places';
            save();
            const input = document.getElementById('destination');
            if (input) input.value = state.destination;
            destinationStatus('선택된 장소: ' + state.destination + ' / ' + state.destinationAddress);
            closeAddressSuggestions();
        }
        function onDestinationInput(value) {
            if (destinationComposing) {state.destination=value;state.destinationLat=null;state.destinationLng=null;return;}
            state.destination = value;
            state.destinationAddress = '';
            state.destinationLat = null;
            state.destinationLng = null;
            state.destinationSource = '';
            save();
            clearTimeout(destinationTimer);
            destinationRequestId++;
            closeAddressSuggestions();
            if (!value.trim()) { destinationStatus('목적지를 입력하거나 주소 검색 버튼을 눌러주세요.'); return; }
            if (!placesService) {
                destinationStatus(KAKAO_JS_KEY ? '지도 검색을 불러오는 중입니다. 잠시 후 다시 입력해 주세요.' : '장소 자동완성은 카카오맵 키 연결이 필요합니다. 주소 검색 버튼은 지금 사용 가능해요.');
                return;
            }
            const requestId = destinationRequestId;
            destinationTimer = setTimeout(() => {
                placesService.keywordSearch(value.trim(), (results, status) => {
                    if (requestId !== destinationRequestId || state.page !== 'input') return;
                    const list = document.getElementById('addressSuggestions');
                    if (!list) return;
                    if (status !== kakao.maps.services.Status.OK || !results.length) {
                        destinationStatus('일치하는 장소가 없어요. 다른 검색어 또는 주소 검색을 이용해 주세요.');
                        return;
                    }
                    placeResults = results.slice(0, 7);
                    list.innerHTML = placeResults.map((p, i) =>
                        `<button type="button" class="address-option" role="option" onclick="selectAddressResult(${i})"><strong>${esc(p.place_name)}</strong><small>${esc(p.road_address_name || p.address_name || '주소 정보 없음')}</small></button>`
                    ).join('');
                    list.classList.remove('hidden');
                    const input = document.getElementById('destination');
                    if (input) input.setAttribute('aria-expanded', 'true');
                    destinationStatus('검색 결과에서 목적지를 선택해 주세요.');
                });
            }, 320);
        }
        function onDestinationKeydown(e) {
            if (e.key === 'Escape') closeAddressSuggestions();
            if (e.key === 'Enter') {
                const list = document.getElementById('addressSuggestions');
                if (list && !list.classList.contains('hidden') && placeResults.length) {
                    e.preventDefault();
                    selectAddressResult(0);
                }
            }
        }
        function loadPostcodeSdk(callback) {
            if (window.kakao && window.kakao.Postcode) { callback(); return; }
            if (postcodeLoading) { destinationStatus('주소 검색창을 불러오는 중입니다.'); return; }
            postcodeLoading = true;
            const script = document.createElement('script');
            script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
            script.onload = () => { postcodeLoading = false; callback(); };
            script.onerror = () => { postcodeLoading = false; destinationStatus('주소 검색 연결에 실패했어요. 인터넷 연결을 확인해 주세요.'); };
            document.head.appendChild(script);
        }
        function openAddressSearch() {
            destinationStatus('도로명주소 검색창을 여는 중입니다…');
            loadPostcodeSdk(() => {
                new kakao.Postcode({
                    oncomplete(data) {
                        const address = data.roadAddress || data.jibunAddress || data.address;
                        state.destination = address;
                        state.destinationAddress = address;
                        state.destinationLat = null;
                        state.destinationLng = null;
                        state.destinationSource = 'postcode';
                        save();
                        const input = document.getElementById('destination');
                        if (input) input.value = address;
                        closeAddressSuggestions();
                        destinationStatus('선택된 실제 주소: ' + address + ' (좌표는 장소 API 연동 후 사용 가능)');
                    },
                    onclose() {
                        if (!state.destinationAddress) destinationStatus('주소를 선택하지 않았어요. 다시 검색할 수 있어요.');
                    }
                }).open();
            });
        }
        function initKakaoPlaces() {
            if (!KAKAO_JS_KEY.trim()) return;
            const script = document.createElement('script');
            script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(KAKAO_JS_KEY.trim()) + '&libraries=services&autoload=false';
            script.onload = () => {
                if (!window.kakao || !kakao.maps) return;
                kakao.maps.load(() => { placesService = new kakao.maps.services.Places(); kakaoSdkReady = true; if (state.page === 'map') initComparisonMap(); });
            };
            script.onerror = () => { destinationStatus('장소 검색 API를 불러오지 못했습니다. JavaScript 키 및 등록된 웹 도메인을 확인해 주세요.'); mapStatus('카카오맵 연결에 실패했습니다. 키와 웹 도메인 설정을 확인해 주세요.'); };
            document.head.appendChild(script);
        }
        initKakaoPlaces();
        render();
    
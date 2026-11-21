const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const {normalize}=require('../kakao-route-api.cjs');
function client(failure=false){
 let calls=[];let fail=failure;
 const c={window:{realMaps:{search:async query=>[{name:(query.match(/(\S+역) 지하철역/)?.[1]??'테스트 아파트')+' 2호선',address:query,lat:37.5,lng:127}]}},fetch:async(url,options)=>{const input=JSON.parse(options.body);calls.push(input);const status=fail&&calls.length===2?'error':'ok';return {status:200,json:async()=>({status,minutes:34,transitBreakdown:{subway:24,bus:0,walk:4}})}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../dist/neighborhood-routes.js'),'utf8'),c);
 return {api:c.window.neighborhoodRoutes,calls};
}
const housing={destination:'서울역',destinationCoords:{lat:37.55,lng:126.97},mode:'transit',maxMinutes:'40'};
const gwangjin={id:'gwangjin',name:'광진구'};
test('reads and navigation do not query; explicit district lookup has 3 requests, shares in-flight and cached results',async()=>{
 const c=client();for(let i=0;i<20;i++)c.api.get(housing,'gwangjin');assert.equal(c.calls.length,0);
 await Promise.all([c.api.loadDistrict(housing,gwangjin),c.api.loadDistrict(housing,gwangjin)]);assert.equal(c.calls.length,3);
 await c.api.loadDistrict({...housing,deposit:'5000',monthly:'200',maxMinutes:'20'},gwangjin);assert.equal(c.calls.length,3);assert.equal(c.api.get({...housing,maxMinutes:'20'},'gwangjin').within,0);
 assert(c.calls.every(c=>c.districtId==='gwangjin'));await c.api.loadDistrict(housing,{id:'gwanak',name:'관악구'});assert.equal(c.calls.length,6);
});
test('explicit retry keeps successful origins and only retries failed origin',async()=>{const c=client(true);await c.api.loadDistrict(housing,gwangjin);assert.equal(c.api.get(housing,'gwangjin').count,2);await c.api.loadDistrict(housing,gwangjin,()=>{},true);assert.equal(c.calls.length,4);assert.equal(c.api.get(housing,'gwangjin').count,3)});
test('destination and mode cache isolation; missing destination never queries',async()=>{const c=client();await c.api.loadDistrict({...housing,destination:''},gwangjin);assert.equal(c.calls.length,0);await c.api.loadDistrict(housing,gwangjin);assert.equal(c.api.get({...housing,mode:'walk'},'gwangjin').status,'idle');await c.api.loadDistrict({...housing,mode:'walk'},gwangjin);assert.equal(c.calls.length,6);assert.equal(c.api.get({...housing,destinationCoords:{lat:37.6,lng:127}},'gwangjin').status,'idle')});
test('aggregate boundaries, partial coverage and missing data',()=>{const c=client();const p=[25,34,45].map(minutes=>({status:'ok',minutes,lat:37.5,lng:127}));const a=c.api.aggregate(p,'40');assert.equal(a.min,25);assert.equal(a.max,45);assert.equal(a.median,34);assert.equal(a.within,2);assert.equal(c.api.aggregate(p,'34').within,2);assert.equal(c.api.aggregate(p.slice(0,1),'40').median,null);assert.equal(c.api.aggregate([],'40').min,null)});
test('same route breakdown, unused vs unknown, no inferred waiting, quota',()=>{
 const data=steps=>normalize({status:'OK',routes:[{properties:{totalTime:2400},steps}]},'transit');
 const d=data([{properties:{type:'SUBWAY',time:1200}},{properties:{type:'WALKING',time:300}}]);assert.deepEqual(d.transitBreakdown,{subway:20,bus:0,walk:5});assert.equal(d.minutes,40);
 assert.equal(data([{properties:{type:'SUBWAY'}}]).transitBreakdown.subway,null);assert.equal(data([]).transitBreakdown,null);assert.equal(data([{}]).transitBreakdown.bus,null);assert.equal(normalize({},'transit',429).status,'rate_limit');
});
test('all 10 candidates; actual route updates two-factor personal score',()=>{
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:()=>({status:'idle',median:null,count:0,registered:0,points:[]})}}};vm.createContext(c);
 let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`window.rentData={get:()=>({status:'ok',score:50})};state.housing={deposit:'2000',monthly:'100',destination:'서울역',destinationCoords:{lat:37.55,lng:126.97},mode:'transit',maxMinutes:'60',priorities:['transport'],priority:'transport'};const before=ranked().map(d=>[d.id,d.total]);window.neighborhoodRoutes.get=(h,id)=>({status:'complete',median:id==='gwangjin'?55:null,count:3,registered:3,points:[]});const after=ranked().map(d=>[d.id,d.total]);if(JSON.stringify(before)===JSON.stringify(after))throw Error('route did not update score');const d=ranked().find(d=>d.id==='gwangjin');if(Math.abs(d.weights.transport-200/3)>1e-9||d.weights.access!==0)throw Error('weights incorrect');if(after.length!==10)throw Error('candidate loss');`,c);
});
test('confirmed unused differs from zero-duration used segment',()=>{
 const d=normalize({status:'OK',routes:[{properties:{totalTime:60},steps:[{properties:{type:'BUS',time:0}}]}]},'transit');
 assert.equal(d.transitUsed.bus,true);assert.equal(d.transitUsed.subway,false);assert.equal(d.transitBreakdown.bus,0);
});
test('unregistered origins never issue route requests',async()=>{
 let calls=0;const c={window:{realMaps:{search:async()=>[]}},fetch:async()=>{calls++}};vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../dist/neighborhood-routes.js'),'utf8'),c);
 await c.window.neighborhoodRoutes.loadDistrict(housing,gwangjin);assert.equal(calls,0);assert.equal(c.window.neighborhoodRoutes.get(housing,'gwangjin').registered,0);
});
test('late old destination response stays isolated from new conditions',async()=>{
 const pending=[];const c={window:{realMaps:{search:async query=>[{name:(query.match(/(\S+역) 지하철역/)?.[1]??'아파트')+' 2호선',address:query,lat:37.5,lng:127}]}},fetch:()=>new Promise(resolve=>pending.push(()=>resolve({status:200,json:async()=>({status:'ok',minutes:34})})))};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../dist/neighborhood-routes.js'),'utf8'),c);
 const promise=c.window.neighborhoodRoutes.loadDistrict(housing,gwangjin);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(pending.length,3);const newHousing={...housing,destinationCoords:{lat:37.6,lng:127}};assert.equal(c.window.neighborhoodRoutes.get(newHousing,'gwangjin').status,'idle');pending.forEach(resolve=>resolve());await promise;assert.equal(c.window.neighborhoodRoutes.get(newHousing,'gwangjin').count,0);assert.equal(c.window.neighborhoodRoutes.get(housing,'gwangjin').count,3);
});
test('server accepts the 10 registered district IDs using mocked provider only',async()=>{
 const savedFetch=global.fetch,savedKey=process.env.KAKAO_REST_API_KEY;let calls=0;process.env.KAKAO_REST_API_KEY='test-not-real';
 global.fetch=async()=>{calls++;return {status:200,json:async()=>({status:'OK',routes:[{properties:{totalTime:120},steps:[{properties:{type:'WALKING',time:120}}]}]})}};
 try{let index=0;for(const districtId of ['gwanak','gwangjin','dongjak','dongdaemun','eunpyeong','gangnam','seocho','yeongdeungpo','songpa','jung']){const result=await require('../kakao-route-api.cjs').route({districtId,origin:{lat:37.5+index++/1000,lng:127},destination:{lat:37.55,lng:126.97},mode:'transit'});assert.equal(result.status,'ok')}assert.equal(calls,10);}finally{global.fetch=savedFetch;if(savedKey===undefined)delete process.env.KAKAO_REST_API_KEY;else process.env.KAKAO_REST_API_KEY=savedKey;}
});
test('C dashboard replaces old boxes with three canonical scores and unscored convenience',()=>{
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}})}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`state.housing={deposit:'2000',monthly:'70',destination:'서울역',mode:'transit',maxMinutes:'45',priority:'housing',priorities:criterionKeys};
 const d={id:'gwangjin',name:'광진구',total:44,scoreMode:'budget_only',weights:{budget:100,transport:0},scores:{budget:44,transport:null},rentEvidence:{status:'ok',count:44,analyzedCount:100,score:44,data:{year:'2026',analyzedRecords:1000}},neighborhood:{status:'disabled',count:0,registered:0,points:[]}};
 const html=resultCard(d);if((html.match(/data-criterion=/g)||[]).length!==3)throw Error('three cards missing');if(!html.includes('width:44%')||!html.includes('44.0'))throw Error('score bar');if(!html.includes('편의시설')||!html.includes('데이터 연결 전')||!html.includes('미평가'))throw Error('missing states');if(html.includes('data-score-section')||html.includes('data-fact='))throw Error('old score UI remains');
 const normalized=normalizeHousing({deposit:'2000',monthly:'70',destination:'서울역',mode:'walk',priority:'access',priorities:['access','culture']});if(normalized.priority!==''||normalized.priorities.join(',')!=='housing,commute,convenience'||normalized.destination!=='서울역')throw Error('legacy migration');
 if(canonicalCriterion('budget')!=='housing'||canonicalCriterion('transport')!=='commute'||canonicalCriterion('daily')!=='convenience')throw Error('aliases');
 `,c);
});
test('number-first departure rows preserve totals, missing states and exact threshold decisions',()=>{
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}})}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`
 const h={mode:'transit',maxMinutes:'45'};const point={name:'이름이 긴 생활권 주거 기준점',address:'서울특별시 광진구 긴 주소와 상세 주거 기준점 <테스트>',locationName:'검증 아파트',status:'ok',minutes:45.001,transitBreakdown:{subway:20,bus:0,walk:null},transitUsed:{subway:true,bus:false,walk:null}};
 const html=departureNumberRow(point,h);if(!html.includes('45.001분')||!html.includes('기준 초과'))throw Error('rounded boundary');if((html.match(/class="departure-segment segment-/g)||[]).length!==2)throw Error('segment blocks');if(!html.includes('미이용')||!html.includes('미제공'))throw Error('missing status');if(!html.includes('&lt;테스트&gt;'))throw Error('escaping');
 const walking=departureNumberRow(point,{mode:'walk',maxMinutes:''});if(walking.includes('departure-segment segment-')||walking.includes('기준 초과')||!walking.includes('목적지까지 도보'))throw Error('walk layout');
 const car=departureNumberRow(point,{mode:'car',maxMinutes:'60'});if(car.includes('departure-segment segment-')||!car.includes('자가용 예상 이동시간'))throw Error('car layout');
 const failed=departureNumberRow({...point,status:'error',message:'조회 실패'},h);if(!failed.includes('조회 실패')||failed.includes('45.001분')||failed.includes('기준 초과'))throw Error('failed origin');
 `,c);
});

test('personal scoring bands, exact weights, missing management and reference-only amenities',()=>{
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:()=>({status:'complete',median:55,count:3,registered:3,points:[]})}}};vm.createContext(c);
 let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`window.rentData={get:()=>({status:'ok',score:90})};state.housing={deposit:'2000',monthly:'100',destination:'서울역',maxMinutes:'60',priorities:[],priority:'budget'};
 let d=ranked().find(d=>d.id==='gwangjin');if(d.scores.budget!==90||d.scores.transport!==70||Math.abs(d.total-250/3)>1e-9)throw Error('cost first');
 state.housing.priority='transport';d=ranked().find(d=>d.id==='gwangjin');if(Math.abs(d.total-230/3)>1e-9)throw Error('time first');
 state.housing.priority='access';d=ranked().find(d=>d.id==='gwangjin');if(d.total!=null||d.weights.access!==0)throw Error('unavailable priority must be reselected');state.housing.priority='budget';
 state.housing.destination='';d=ranked().find(d=>d.id==='gwangjin');if(d.total!==90||d.scores.transport!==null||!d.provisional)throw Error('no destination');
 state.housing.destination='서울역';window.neighborhoodRoutes.get=()=>({status:'complete',median:55,count:1,registered:3,points:[]});d=ranked().find(d=>d.id==='gwangjin');if(d.total!==90||d.scores.transport!==null||!d.provisional)throw Error('one point must remain housing-only partial');
 delete window.rentData;if(ranked().some(d=>d.total!=null))throw Error('missing rent score must not receive combined rank');
 `,c);
});

test('real-only recommendation excludes demo costs and unqueried routes; missing inputs stay null',()=>{
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:(h,id)=>({status:'complete',median:id==='gwangjin'?34:null,count:id==='gwangjin'?3:0,registered:3,points:[]})}}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`state.housing={deposit:'2000',monthly:'100',destination:'서울역',maxMinutes:'40',priorities:[],priority:'budget'};const rows=ranked(),d=rows.find(d=>d.id==='gwangjin');if(d.deposit!==null||d.monthlyCost!==null||d.scores.budget!==null||d.scores.access!==null||d.scores.daily!==null||d.scores.culture!==null)throw Error('demo leak');if(d.scores.transport!==80||d.total!==80||!d.provisional||d.assessedKeys.join('|')!=='commute')throw Error('missing cost must remain commute-only partial');if(recommended(rows).length!==1)throw Error('invented ranks');state.housing.destination='';if(recommended(ranked()).length!==0)throw Error('no destination scored');`,c);
});

test('automatic comparison runs once across 10 districts and reuses conditions without manual buttons',async()=>{
 const calls=[];const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{loadDistrict:async(h,d)=>{calls.push(d.id)},get:()=>({status:'complete',points:[]})}}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`state.housing={destination:'서울역',destinationCoords:{lat:37.55,lng:126.97},mode:'transit'};state.page='housing';`,c);
 await vm.runInContext('Promise.all([ensureAutomaticRoutes(),ensureAutomaticRoutes()])',c);assert.equal(calls.length,10);assert.equal(new Set(calls).size,10);
 vm.runInContext(`state.housing.monthly='200';state.housing.priority='transport';state.housing.maxMinutes='90';`,c);await vm.runInContext('ensureAutomaticRoutes()',c);assert.equal(calls.length,10);
 vm.runInContext(`state.housing.mode='walk'`,c);await vm.runInContext('ensureAutomaticRoutes()',c);assert.equal(calls.length,20);
 vm.runInContext(`state.housing.destination='';state.housing.destinationCoords=null`,c);await vm.runInContext('ensureAutomaticRoutes()',c);assert.equal(calls.length,20);
});

test('boarding and walk are distinct, unexplained difference is not invented as waiting',()=>{
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}})}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`const p={name:'문래 생활권',status:'ok',minutes:43.9,transitBreakdown:{subway:16,bus:11.3,walk:3}};if(boardingTime(p)!==27.3)throw Error('boarding');const html=departureNumberRow(p,{mode:'transit',maxMinutes:'45'});for(const text of ['교통수단 탑승','27.3분','하차 후 목적지까지 도보','43.9분'])if(!html.includes(text))throw Error(text);p.transitBreakdown.bus=null;if(boardingTime(p)!==null||!segmentDifference(p).includes('정보가 부족'))throw Error('missing invented');`,c);
});

test('shortest returned transit route supplies both total and its own breakdown without mutating response',()=>{
 const route=(seconds,type,time)=>({properties:{totalTime:seconds},steps:[{properties:{type,time}}]});
 const routes=[route(3000,'SUBWAY',1500),route(1800,'BUS',900),route(2400,'WALKING',600)];const json={status:'OK',routes};const before=JSON.stringify(json);const d=normalize(json,'transit');assert.equal(d.minutes,30);assert.equal(d.selectedRouteIndex,1);assert.equal(d.returnedRouteCount,3);assert.equal(d.transitBreakdown.bus,15);assert.equal(d.transitBreakdown.subway,0);assert.equal(JSON.stringify(json),before);
 const invalid=[route(null,'BUS',100),route(-1,'BUS',100),route('10','BUS',100),route(1200,'SUBWAY',500),route(1200,'BUS',400)];assert.equal(normalize({status:'OK',routes:invalid},'transit').selectedRouteIndex,3);
 assert.equal(normalize({status:'OK',routes:[route(null)]},'transit').status,'no_route');assert.equal(normalize({status:'OK',routes:null},'transit').status,'no_route');
 assert.equal(normalize({status:'OK',route:route(600)},'walk').minutes,10);
});

test('incomplete transit walking coverage is unavailable, never unused or a claimed total',()=>{const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}})}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);for(const walk of [0,3,null])assert.equal(vm.runInContext('segmentTime({status:"ok",transitBreakdown:{walk:'+walk+'},transitUsed:{walk:false}},"walk")',c),'미제공');});

test('last alighting coordinate belongs to selected fastest vehicle leg, not an alternative route',()=>{
 const r=(seconds,lng)=>({properties:{totalTime:seconds},steps:[{properties:{type:'BUS',time:200},path:{points:[[127,37.5],[lng,37.51]]}},{properties:{type:'WALKING',time:60},path:{points:[[lng,37.51],[128,37.6]]}}]});
 const d=normalize({status:'OK',routes:[r(2000,127.1),r(1000,127.2)]},'transit');assert.deepEqual(d.alightingCoords,{lat:37.51,lng:127.2});
 assert.equal(normalize({status:'OK',routes:[{properties:{totalTime:300},steps:[]}]},'transit').alightingCoords,null);
});
test('transit enriches final walking leg once with cached reuse and never adds it to total',async()=>{
 const calls=[];const c={module:{exports:{}},process:{env:{KAKAO_REST_API_KEY:'test'}},URL,AbortSignal,fetch:async url=>{calls.push(String(url));const walk=String(url).includes('/walk');return {status:200,json:async()=>walk?{status:'OK',route:{properties:{totalTime:240}}}:{status:'OK',routes:[{properties:{totalTime:1200},steps:[{properties:{type:'BUS',time:900},path:{points:[[127,37.5],[127.01,37.51]]}}]}]}}}};vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../kakao-route-api.cjs'),'utf8'),c);
 const input={districtId:'gwangjin',origin:{lat:37.5,lng:127},destination:{lat:37.52,lng:127.02},mode:'transit'};const d=await c.module.exports.route(input);assert.equal(d.minutes,20);assert.equal(d.alightingWalkMinutes,4);assert.equal(calls.length,2);assert(new URL(calls[1]).searchParams.get('start_x')==='127.01');await c.module.exports.route(input);assert.equal(calls.length,2);
});

test('temporary OFF prevents automatic route calls and hides cached scoring, ON can resume',async()=>{
 let calls=0;const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{loadDistrict:async()=>{calls++},get:()=>({status:'complete',median:30,count:3,registered:3,points:[]})}}};vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
 vm.runInContext(`state.page='housing';state.housing={deposit:'2000',monthly:'100',destination:'서울역',destinationCoords:{lat:37.55,lng:126.97},mode:'transit',maxMinutes:'60',priorities:[],priority:'',routeEnabled:false};`,c);
 await vm.runInContext('ensureAutomaticRoutes()',c);assert.equal(calls,0);assert.equal(vm.runInContext('ranked().filter(d=>d.total!=null).length',c),0);
 vm.runInContext('state.housing.routeEnabled=true',c);await vm.runInContext('ensureAutomaticRoutes()',c);assert.equal(calls,10);
});

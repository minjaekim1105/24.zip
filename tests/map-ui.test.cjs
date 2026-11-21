const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('map UI shares ranked snapshot and keeps focus distinct from comparison without requests',()=>{
 let calls=0;const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:()=>{calls++;throw Error('OFF must not request routes');}},rentData:{get:()=>({status:'ok',score:80,count:8,analyzedCount:10,data:{year:2026,analyzedRecords:10}})}}};
 vm.createContext(c);let s=fs.readFileSync('dist/app.js','utf8');vm.runInContext(s.slice(0,s.lastIndexOf('restoreSession();')),c);
 vm.runInContext(`state.housing={deposit:'2000',monthly:'70',destination:'서울역',mode:'transit',maxMinutes:'60',priority:'housing',routeEnabled:false};state.comparison=['gwanak','gwangjin'];state.mapDistrict='gwangjin';`,c);
 const html=vm.runInContext('views.map()',c);assert(html.includes('선택 지역 요약'));assert(html.includes('비교 대상 2/2'));assert(html.includes('80.0 / 100'));assert(html.includes('미평가'));assert.equal((html.match(/data-map-pick=/g)||[]).length,10);assert(!html.includes('result-condition-tiles'));
 assert.equal(vm.runInContext('mapViewScores.find(d=>d.id===state.mapDistrict).total',c),80);assert.equal(calls,0);
 vm.runInContext("state.mapDistrict='dongjak'",c);const changed=vm.runInContext('views.map()',c);assert(changed.includes('동작구 상세 정보'));assert.equal(vm.runInContext('state.comparison.join(",")',c),'gwanak,gwangjin');assert(changed.includes('교체할 구'));assert.equal(calls,0);
 const old=fs.readFileSync('.openai/app-before-map-ui.js','utf8');for(const name of ['priorityWeightPolicy','ranked','recommendationCohort']){const body=t=>t.slice(t.indexOf('function '+name+'('),t.indexOf('\n}',t.indexOf('function '+name+'('))+2);assert.equal(body(s),body(old),name+' must not change');}
});

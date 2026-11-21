const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('map UI shares ranked snapshot and keeps focus distinct from comparison without requests',()=>{
 let calls=0;const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:()=>{calls++;throw Error('OFF must not request routes');}},rentData:{get:()=>({status:'ok',score:80,count:8,analyzedCount:10,data:{year:2026,analyzedRecords:10}})}}};
 vm.createContext(c);let s=fs.readFileSync('dist/app.js','utf8');vm.runInContext(s.slice(0,s.lastIndexOf('restoreSession();')),c);
 vm.runInContext(`state.housing={deposit:'2000',monthly:'70',destination:'서울역',mode:'transit',maxMinutes:'60',priority:'housing',routeEnabled:false};state.comparison=['gwanak','gwangjin'];state.mapDistrict='gwangjin';`,c);
 const html=vm.runInContext('views.map()',c);assert(html.includes('선택 지역 요약'));assert(html.includes('비교 대상 2구'));assert(html.includes('80.0 <small>/ 100</small>'));assert(html.includes('미평가'));assert.equal((html.match(/data-map-pick=/g)||[]).length,10);assert(!html.includes('result-condition-tiles'));
 assert.equal(vm.runInContext('mapViewScores.find(d=>d.id===state.mapDistrict).total',c),80);assert.equal(calls,0);
 vm.runInContext("state.mapDistrict='dongjak'",c);const changed=vm.runInContext('views.map()',c);assert(changed.includes('동작구 상세 정보'));assert.equal(vm.runInContext('state.comparison.join(",")',c),'gwanak,gwangjin');assert(changed.includes('교체할 구'));assert.equal(calls,0);
 c.window.rentData.get=(_housing,_districts,name)=>{
   const count={'광진구':9,'관악구':7}[name];
   return count ? {status:'ok',score:count*10,count,analyzedCount:10,data:{year:2026,analyzedRecords:10}} : {status:'error',score:null};
 };
 vm.runInContext('views.map()',c);
 const top=vm.runInContext('recommended(mapViewScores)',c);
 assert.deepEqual(Array.from(top,d=>d.id),['gwangjin','gwanak']);
 assert.deepEqual(Array.from(top,d=>d.total),[90,70]);
 for(const district of top){
   assert.equal(district.weights.housing,100);
   assert.equal(district.weights.commute,0);
   assert.equal(district.weights.convenience,0);
 }
 assert.equal(calls,0);
});

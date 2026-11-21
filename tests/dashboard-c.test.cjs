const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function context(){
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}})}};
 vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);return c;
}
test('input has exactly three fixed priority radios and legacy migration preserves housing values',()=>{
 const c=context();
 vm.runInContext(`state.page='housing';state.housing=normalizeHousing({...state.housing,deposit:'2000',monthly:'70',destination:'서울역',mode:'walk',priority:'transport',priorities:['budget','access','culture']});`,c);
 const html=vm.runInContext('views.housing()',c);
 assert.equal((html.match(/name="priority"/g)||[]).length,3);
 assert(!html.includes('name="priorities"'));assert(!html.includes('가까운 역·정류장 접근성'));assert(!html.includes('여가·문화시설'));
 assert.equal(vm.runInContext('state.housing.priority',c),'commute');assert.equal(vm.runInContext('state.housing.deposit',c),'2000');
});
test('recommendation compares same assessment cohort, partial higher scores cannot displace fuller cohort',()=>{
 const c=context();c.rows=[
  {id:'a',total:100,assessedKeys:['housing'],rankingSignature:'housing'},
  {id:'b',total:50,assessedKeys:['housing','commute'],rankingSignature:'housing|commute'},
  {id:'c',total:40,assessedKeys:['housing','commute'],rankingSignature:'housing|commute'},
  {id:'d',total:99,assessedKeys:['commute'],rankingSignature:'commute'},
  {id:'e',total:undefined,assessedKeys:[],rankingSignature:''}
 ];
 assert.equal(vm.runInContext('recommended(rows).map(d=>d.id).join(",")',c),'b,c');
});
test('convenience stays unrated unless a sourced evaluation is supplied, zero remains valid',()=>{
 const c=context();
 assert.equal(vm.runInContext('validConvenience().score',c),null);
 assert.equal(vm.runInContext('validConvenience({score:50,status:"evaluated"}).score',c),null);
 assert.equal(vm.runInContext('validConvenience({score:0,status:"evaluated",dataSource:"verified source",evaluatedAt:"2026-11-20",details:"verified sample"}).score',c),0);
});
test('unavailable convenience priority is disabled and legacy selection requires reselection',()=>{
 const c=context();
 vm.runInContext(`state.page='housing';state.housing=normalizeHousing({...state.housing,deposit:'2000',monthly:'70',destination:'서울역',mode:'walk',priority:'daily'});`,c);
 assert.equal(vm.runInContext('state.housing.priority',c),'');
 assert.equal(vm.runInContext('state.housing.priorityNeedsReselect',c),true);
 assert.equal(vm.runInContext('state.housing.destination',c),'서울역');
 const html=vm.runInContext('views.housing()',c);
 assert(html.includes('추천 우선순위'));assert(html.includes('생활 편의시설 (준비 중)'));
 assert(/value="convenience"[^>]*disabled/.test(html));
 assert(html.includes('다시 선택해 주세요'));assert(!html.includes('data-clear-priority'));
});
test('50/25/25 normalizes valid scores exactly, supports future convenience, and preserves genuine zero',()=>{
 const c=context();
 c.window.neighborhoodRoutes={get:()=>({status:'complete',count:3,median:55,registered:3,points:[]})};
 c.window.rentData={get:()=>({status:'ok',score:80})};
 vm.runInContext(`state.housing={deposit:'2000',monthly:'70',destination:'서울역',mode:'transit',maxMinutes:'60',priority:'housing'};`,c);
 let d=vm.runInContext('ranked()[0]',c);
 assert(Math.abs(d.weights.housing-200/3)<1e-9);assert.equal(d.weights.housing+d.weights.commute,100);
 assert(Math.abs(d.total-230/3)<1e-9);
 vm.runInContext(`districts[0].convenienceEvaluation={score:60,status:'evaluated',dataSource:'test fixture only',evaluatedAt:'2026-11-20'};`,c);
 d=vm.runInContext('ranked().find(d=>d.id===districts[0].id)',c);
 assert.equal(d.weights.housing,50);assert.equal(d.weights.commute,25);assert.equal(d.weights.convenience,25);assert.equal(d.total,72.5);
 vm.runInContext(`state.housing.priority='convenience'`,c);
 assert.equal(vm.runInContext('ranked()[0].total',c),undefined);
 vm.runInContext(`criterionAvailability.convenience=true`,c);
 d=vm.runInContext('ranked().find(d=>d.id===districts[0].id)',c);assert.equal(d.total,67.5);
 vm.runInContext(`state.housing.priority='housing';state.housing.routeEnabled=false;for(const d of districts)delete d.convenienceEvaluation;`,c);
 c.window.rentData={get:()=>({status:'ok',score:0})};d=vm.runInContext('ranked()[0]',c);assert.equal(d.total,0);assert.equal(d.weights.housing,100);
 c.window.rentData={get:()=>({status:'error',score:null})};assert.equal(vm.runInContext('ranked()[0].total',c),undefined);
});

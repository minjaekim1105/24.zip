const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function context(){
 const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}})}};
 vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);return c;
}
test('input has exactly three priority checkboxes and legacy migration preserves housing values',()=>{
 const c=context();
 vm.runInContext(`state.page='housing';state.housing=normalizeHousing({...state.housing,deposit:'2000',monthly:'70',destination:'서울역',mode:'walk',priority:'transport',priorities:['budget','access','culture']});`,c);
 const html=vm.runInContext('views.housing()',c);
 assert.equal((html.match(/type="checkbox" name="priority"/g)||[]).length,3);
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
test('legacy daily priority selects the enabled convenience option',()=>{
 const c=context();
 vm.runInContext(`state.page='housing';state.housing=normalizeHousing({...state.housing,deposit:'2000',monthly:'70',destination:'서울역',mode:'walk',priority:'daily'});`,c);
 assert.equal(vm.runInContext('state.housing.priority',c),'convenience');
 assert.equal(vm.runInContext('state.housing.priorityNeedsReselect',c),false);
 assert.equal(vm.runInContext('state.housing.destination',c),'서울역');
 const html=vm.runInContext('views.housing()',c);
 const radio=html.match(/<input[^>]*value="convenience"[^>]*>/)?.[0];
 assert.ok(radio);
 assert.match(radio,/ checked/);
 assert.doesNotMatch(radio,/ disabled/);
});
test('50/25/25 normalizes valid scores exactly, includes sourced convenience, and preserves genuine zero',()=>{
 const c=context();
 c.window.neighborhoodRoutes={get:()=>({status:'complete',count:3,median:55,registered:3,points:[]})};
 c.window.rentData={get:()=>({status:'ok',score:80})};
 vm.runInContext(`state.housing={deposit:'2000',monthly:'70',destination:'서울역',mode:'transit',maxMinutes:'60',priority:'housing'};`,c);
 let d=vm.runInContext('ranked()[0]',c);
 assert(Math.abs(d.weights.housing-200/3)<1e-9);assert.equal(d.weights.housing+d.weights.commute,100);
 assert(Math.abs(d.total-230/3)<1e-9);
 vm.runInContext(`amenityEvaluations.set('gwangjin',{score:60,status:'evaluated',dataSource:'test fixture only',evaluatedAt:'2026-11-20'});`,c);
 d=vm.runInContext('ranked().find(d=>d.id==="gwangjin")',c);
 assert.equal(d.weights.housing,50);assert.equal(d.weights.commute,25);assert.equal(d.weights.convenience,25);assert.equal(d.total,72.5);
 vm.runInContext(`state.housing.priority='convenience'`,c);
 d=vm.runInContext('ranked().find(d=>d.id==="gwangjin")',c);assert.equal(d.total,67.5);
 vm.runInContext(`state.housing.priority='housing';state.housing.routeEnabled=false;amenityEvaluations.clear();`,c);
 c.window.rentData={get:()=>({status:'ok',score:0})};d=vm.runInContext('ranked()[0]',c);assert.equal(d.total,0);assert.equal(d.weights.housing,100);
 c.window.rentData={get:()=>({status:'error',score:null})};assert.equal(vm.runInContext('ranked()[0].total',c),undefined);
});

test('swapping second and third priority reverses two fully assessed districts',()=>{
 const c=context();
 c.window.neighborhoodRoutes={get:()=>({status:'complete',count:3,median:55,registered:3,points:[]})};
 c.window.rentData={get:(_h,_names,name)=>({status:'ok',score:name==='광진구'?100:0})};
 vm.runInContext(`state.housing=normalizeHousing({destination:'서울역',maxMinutes:'60',priorityOrder:['commute','convenience','housing']});
 for(const [id,score] of [['gwanak',100],['gwangjin',0]])amenityEvaluations.set(id,{status:'evaluated',score,dataSource:'test fixture',evaluatedAt:'2026-11-20'});`,c);
 const results=()=>Array.from(vm.runInContext('recommended(ranked())',c),d=>[d.id,d.total]);
 assert.deepEqual(results(),[['gwanak',65],['gwangjin',55]]);
 vm.runInContext("state.housing.priorityOrder=['commute','housing','convenience']",c);
 assert.deepEqual(results(),[['gwangjin',65],['gwanak',55]]);
});

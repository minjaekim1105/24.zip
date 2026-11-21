const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const api=require('../rent-analysis.cjs');
test('rent counts require both inclusive budgets, monthly records and valid amounts',()=>{
  const row=(GRFE,RTFE,RENT_SE='월세')=>({CGG_NM:'관악구',CGG_CD:'11620',GRFE,RTFE,RENT_SE});
  const rows=[row('1,000','70'),row(1000,71),row(1001,60),row(1000,0,'전세'),row('',0),row(null,0),row(0,0)];
  const d=api.summarize(rows,{budget:1000,monthlyRentBudget:70})[0];
  assert.equal(d.totalCount,7);assert.equal(d.monthlyTransactionCount,6);assert.equal(d.validMonthlyTransactionCount,4);assert.equal(d.conditions.allMatchCount,2);
  assert.throws(()=>api.validateInput({budget:'',monthlyRentBudget:70}));
  assert.throws(()=>api.validateInput({budget:-1,monthlyRentBudget:70}));
  assert.throws(()=>api.validateInput(null));
  assert.deepEqual(api.samplePageIds(1),[1]);assert.equal(new Set(api.samplePageIds(100)).size,10);
});
test('sample, metadata, cache and in-flight requests use mocked Seoul responses only',async()=>{
  let calls=0;
  const c={module:{exports:{}},process:{env:{}},fetch:async()=>{calls++;return {ok:true,json:async()=>({tbLnOpendataRentV:{list_total_count:1,row:[{CGG_NM:'관악구',CGG_CD:'11620',RENT_SE:'월세',GRFE:1000,RTFE:60}]}})}},AbortSignal,setTimeout};
  vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../rent-analysis.cjs'),'utf8'),c);
  const input={year:'2026',budget:1000,monthlyRentBudget:70};
  const results=await Promise.all([c.module.exports.analyze(input,'test'),c.module.exports.analyze(input,'test')]);
  assert.equal(calls,1);assert.equal(results[0].districts[0].conditions.allMatchCount,1);
  assert.equal(results[0].managementFeeIncluded,false);assert.equal(results[0].partial,false);
  assert.equal((await c.module.exports.analyze(input,'test')).cached,true);assert.equal(calls,1);
});
test('client uses own valid monthly records; other districts cannot change score; cache shared',async()=>{
  let calls=0;
  const rows=[['관악구',200,500],['광진구',100,125],['중구',0,20],['마포구',1000,1000],['강남구',0,0]].map(([regionName,n,total])=>({regionName,validMonthlyTransactionCount:total,conditions:{allMatchCount:n}}));
  const c={window:{},fetch:async()=>{calls++;return {ok:true,json:async()=>({status:'ok',districts:rows,year:'2026',analyzedRecords:1000})}}};
  vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../dist/rent-data.js'),'utf8'),c);
  const api=c.window.rentData,h={deposit:'2000',monthly:'70'},names=['관악구','광진구','중구','송파구'];
  await Promise.all([api.load(h),api.load(h)]);assert.equal(calls,1);
  assert.equal(api.get(h,names,'관악구').score,40);assert.equal(api.get(h,names,'광진구').score,80);
  assert.equal(api.get(h,names,'중구').score,0);assert.equal(api.get(h,names,'송파구').score,null);
  assert.equal(api.get(h,[...names,'마포구'],'관악구').score,40);assert.equal(api.get(h,['강남구'],'강남구').score,null);
  await api.load({...h,destination:'다른 목적지',mode:'car'});assert.equal(calls,1);
  assert.equal(api.get({...h,monthly:'80'},names,'관악구').status,'idle');
  assert.equal(api.get({...h,monthly:''}).status,'invalid');
});
test('client housing and travel scores combine with actual priority weights',()=>{
  const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:()=>({status:'complete',median:34,count:3,registered:3,points:[]})},rentData:{get:()=>({status:'ok',count:123,maximum:246,score:50})}}};
  vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
  vm.runInContext(`state.housing={deposit:'2000',monthly:'70',destination:'서울역',maxMinutes:'40',priorities:[],priority:'budget'};const d=ranked()[0];if(d.scores.budget!==50||d.total!==60||Math.abs(d.weights.budget-200/3)>1e-9)throw Error('weighted total incorrect');`,c);
});
test('priority reverses rankings; 50/25/25 policy with required priority; OFF housing-only; missing records excluded',()=>{
  const c={document:{querySelector:()=>({addEventListener(){}}),addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({addEventListener(){}}),neighborhoodRoutes:{get:(h,id)=>({status:'complete',median:id==='gwanak'?55:id==='gwangjin'?25:null,count:3,registered:3,points:[]})},rentData:{get:(h,names,name)=>({status:'ok',score:name==='관악구'?80:name==='광진구'?40:null})}}};
  vm.createContext(c);let source=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');source=source.slice(0,source.lastIndexOf('restoreSession();'));vm.runInContext(source,c);
  vm.runInContext(`
  state.housing={deposit:'2000',monthly:'70',destination:'서울역',maxMinutes:'60',priorities:[],priority:'budget',routeEnabled:true};
  let rows=ranked(),a=rows.find(d=>d.id==='gwanak'),b=rows.find(d=>d.id==='gwangjin');
  if(Math.abs(a.total-230/3)>1e-9||b.total!==60||recommended(rows)[0].id!=='gwanak')throw Error('housing first ranking');
  state.housing.priority='transport';rows=ranked();a=rows.find(d=>d.id==='gwanak');b=rows.find(d=>d.id==='gwangjin');
  if(Math.abs(a.total-220/3)>1e-9||b.total!==80||recommended(rows)[0].id!=='gwangjin')throw Error('travel first ranking');
  state.housing.priority='';rows=ranked();if(recommended(rows).length)throw Error('priority must be chosen');state.housing.priority='budget';
  state.housing.routeEnabled=false;rows=ranked();if(rows[0].total!==80||rows[0].weights.budget!==100||rows[0].scores.transport!==null)throw Error('OFF must not use cached travel');
  state.housing.routeEnabled=true;window.neighborhoodRoutes.get=()=>({status:'error',median:null,count:0,registered:3,points:[]});
  if(recommended(ranked()).some(d=>d.assessedKeys.join('|')!=='housing'||d.weights.housing!==100))throw Error('missing travel not marked housing-only');
  `,c);
});

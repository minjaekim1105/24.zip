const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assess}=require('../dist/contract.js');
const {summarize}=require('../rent-analysis.cjs');
const home={area:'seoul',deposit:8000,rent:60,year:2000,income:'mid'};
function eligible(id,edits){return assess(id,{...home,...edits}).fail.length===0;}
test('월세지원 일반 한도와 환산 월세 예외',()=>{
  assert.ok(eligible('rent',{}));
  assert.ok(!eligible('rent',{deposit:8001}));
  assert.ok(eligible('rent',{deposit:4000,rent:75}));
  assert.ok(!eligible('rent',{deposit:4000,rent:75.01}));
  assert.ok(!eligible('rent',{rent:0}));
});
test('이사비 거래금액 2억원 이하와 개인 조건',()=>{
  assert.ok(eligible('move',{deposit:10000,rent:100}));
  assert.ok(!eligible('move',{deposit:10001,rent:100}));
  assert.ok(!eligible('move',{area:'other'}));
  assert.ok(!eligible('rent',{income:'low'}));
  assert.ok(eligible('move',{income:'low'}));
  assert.equal(assess('rent',{...home,year:1985,income:''}).pending.length,2);
});
test('법정동 이름이 같아도 구별로 집계하고 결측 계약은 제외',()=>{
 const row={CGG_NM:'가구',CGG_CD:'1',STDG_NM:'가동',RENT_SE:'월세',GRFE:10,RTFE:10};
 const data=summarize([row,{...row,RTFE:20},{...row,RTFE:''},{...row,CGG_NM:'나구',CGG_CD:'2'}],{budget:10,monthlyRentBudget:10});
 assert.deepEqual(data[0].neighborhoods,[{name:'가동',valid:2,match:1}]);
 assert.deepEqual(data[1].neighborhoods,[{name:'가동',valid:1,match:1}]);
});

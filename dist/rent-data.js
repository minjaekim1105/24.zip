window.rentData=(()=>{
  const snapshots=new Map(),ttl=30*60*1000;
  const key=h=>JSON.stringify(['2026',Number(h.deposit),Number(h.monthly)]);
  const valid=h=>h.deposit!==''&&h.monthly!==''&&Number.isFinite(Number(h.deposit))&&Number(h.deposit)>=0&&Number.isFinite(Number(h.monthly))&&Number(h.monthly)>=0;
  function get(h,names=[],name){
    if(!valid(h))return {status:'invalid'};
    const snapshot=snapshots.get(key(h));
    if(!snapshot||Date.now()-snapshot.at>=ttl)return {status:'idle'};
    if(snapshot.status!=='ok')return snapshot;
    const rows=snapshot.data.districts.filter(d=>names.includes(d.regionName));
    const row=rows.find(d=>d.regionName===name);
    const analyzedCount=Number.isFinite(row?.validMonthlyTransactionCount)?row.validMonthlyTransactionCount:null;
    const count=Number.isFinite(row?.conditions?.allMatchCount)?row.conditions.allMatchCount:null;
    return {...snapshot,row,count,analyzedCount,score:count==null||analyzedCount==null||analyzedCount<=0||count<0||count>analyzedCount?null:count/analyzedCount*100};
  }
  function load(h){
    if(!valid(h))return Promise.resolve();
    const k=key(h),old=snapshots.get(k);
    if(old&&Date.now()-old.at<ttl)return old.promise;
    const entry={status:'loading',at:Date.now()};snapshots.set(k,entry);
    entry.promise=(async()=>{
      try{
        const response=await fetch('/api/rent/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({year:'2026',budget:Number(h.deposit),monthlyRentBudget:Number(h.monthly)})});
        const data=await response.json();
        if(!response.ok||data.status!=='ok'||!Array.isArray(data.districts))throw Error('조회 실패');
        entry.status='ok';entry.data=data;
      }catch{entry.status='error';entry.message='서울시 월세 거래 자료를 불러오지 못했어요. 주거 조건에서 다시 제출해 주세요.';}
      entry.at=Date.now();
    })();return entry.promise;
  }
  function retry(h){const k=key(h);if(snapshots.get(k)?.status==='error')snapshots.delete(k);}
  return {get,load,key,retry};
})();

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {forDistrict,isHousingService}=require('../dist/local-housing-support.js');

test('전월세 계약 상담·집 보기 동행과 전입 1인가구 정착용 웰컴키트를 포함한다',()=>{
  for(const text of ['전월세 계약 상담·집 보기 동행','전입 1인가구 정착용 웰컴키트'])
    assert.equal(isHousingService(text),true);
  for(const text of ['취업 상담','일반 홍보용 기념품','입원비 지원','일반 현물 지원'])
    assert.equal(isHousingService(text,'1인가구를 위한 서비스'),false);
});

test('25개 자치구는 각각 별도의 공식 신청 페이지로 연결되고 청년 연령 제한을 적용하지 않는다',()=>{
  const html=fs.readFileSync(require.resolve('../dist/contract.html'),'utf8');
  const districts=[...html.matchAll(/<option>([^<]+구)<\/option>/g)].map(m=>m[1]);
  const links=districts.map(d=>{
    const [notice]=forDistrict(d,1950,'2026-11-21');
    assert.equal(notice.district,d);
    assert.match(notice.url,/^https:\/\/1in\.seoul\.go\.kr\/front\/bsns\/bsnsApplcntStep1Page\.do\?bsns_id=[a-f0-9]{32}/);
    return notice.url;
  });
  assert.equal(new Set(links).size,25);
});

test('정착물품은 해당 자치구와 공고 연령을 따르고 마감·기간 종료 회차는 숨긴다',()=>{
  const kits=(d,y,date='2026-11-21')=>forDistrict(d,y,date).slice(1);
  assert.equal(kits('성북구',1950).length,1);
  for(const y of [1962,2007,undefined])assert.equal(kits('은평구',y).length,1);
  for(const y of [1961,2008])assert.equal(kits('은평구',y).length,0);
  assert.equal(kits('은평구',1980,'2026-12-19').length,0);
  assert.equal(kits('영등포구',1980).length,0);
  assert.equal(kits('강남구',1980).length,0);
});

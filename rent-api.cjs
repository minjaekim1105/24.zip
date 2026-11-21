'use strict';
module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  const send=(body,code=200)=>{res.writeHead(code);res.end(JSON.stringify(body));};
  if(req.method!=='POST')return send({status:'error',message:'POST만 지원합니다.'},405);
  try{
    let body='';
    for await(const chunk of req){body+=chunk;if(body.length>4096)return send({status:'error',message:'요청이 너무 큽니다.'},413);}
    let input;try{input=JSON.parse(body);}catch{return send({status:'error',message:'올바른 JSON 요청이 필요합니다.'},400);}
    const analyzer=require('./rent-analysis.cjs');
    try{analyzer.validateInput(input);}catch(error){return send({status:'error',message:error.message},400);}
    const result=await analyzer.analyze(input);
    send({status:'ok',...result});
  }catch(error){
    // Never expose fetch URLs, credentials, causes or upstream stack traces.
    const missing=!process.env.SEOUL_API_KEY;
    send({status:missing?'configuration':'error',message:missing?'SEOUL_API_KEY 서버 설정이 필요합니다.':'서울시 전월세 자료를 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.'},missing?503:502);
  }
};

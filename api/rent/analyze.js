const handler=require('../../rent-api.cjs');
module.exports=(request,response)=>{
  if(request.body!==undefined){
    const body=typeof request.body==='string'?request.body:JSON.stringify(request.body);
    return handler({method:request.method,async *[Symbol.asyncIterator](){yield body;}},response);
  }
  return handler(request,response);
};

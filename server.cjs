const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const envPath = path.join(__dirname,'.env.local');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const root = path.join(__dirname,'dist');
const port = Number(process.env.PORT || 8080);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((request,response) => {
  const pathname = new URL(request.url,'http://localhost').pathname;
  if (pathname === '/api/district-amenities') {
    response.status = code => {
      response.statusCode = code;
      return response;
    };
    response.json = data => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(data));
    };
    require('./api/district-amenities.js')(request,response);
    return;
  }
  if (pathname === '/api/rent/analyze') {require('./rent-api.cjs')(request,response);return;}
  if (pathname === '/api/bus-stops') {require('./bus-stop-api.cjs')(request,response);return;}
  if (pathname === '/api/route') {require('./route-api.cjs')(request,response);return;}
  if (pathname === '/map-config.js') {
    response.writeHead(200,{'Content-Type':mime['.js'],'Cache-Control':'no-store'});
    response.end('window.MAP_CONFIG = ' + JSON.stringify({kakaoJavaScriptKey:process.env.KAKAO_MAPS_JAVASCRIPT_KEY || ''}) + ';');
    return;
  }
  let file;
  try { file = path.resolve(root,'.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname)); }
  catch { response.writeHead(400);response.end();return; }
  if (!file.startsWith(root + path.sep)) {response.writeHead(403);response.end();return;}
  fs.readFile(file,(error,data) => {
    response.writeHead(error ? 404 : 200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    response.end(error ? 'Not found' : data);
  });
}).listen(port,'127.0.0.1',() => console.log('24.zip http://localhost:' + port));

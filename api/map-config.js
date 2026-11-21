const amenitiesScoring = require('../amenities-scoring.json');

module.exports = (request, response) => {
  response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  const mapConfig = {
    kakaoJavaScriptKey: process.env.KAKAO_MAPS_JAVASCRIPT_KEY || '',
    amenitiesScoring
  };
  response.end('window.MAP_CONFIG = ' + JSON.stringify(mapConfig) + ';');
};

# Kakao 지도 실행

PowerShell에서 프로젝트 폴더로 이동한 뒤 실행합니다.

    $env:KAKAO_MAPS_JAVASCRIPT_KEY = '카카오 JavaScript 키'
    node server.cjs

브라우저에서 http://localhost:8080 을 엽니다.
카카오 개발자 콘솔의 JavaScript SDK 도메인에 http://localhost:8080 을 등록합니다.
127.0.0.1 주소로 접속할 경우 http://127.0.0.1:8080 도 등록합니다.
배포 시 실제 사이트의 HTTPS origin(예: https://서비스도메인)을 등록합니다.

환경변수 KAKAO_MAPS_JAVASCRIPT_KEY 를 서버 실행 환경에 설정합니다.
server.cjs는 /map-config.js 에 공개 JavaScript 키만 전달합니다.
정적 호스팅을 사용할 때는 배포 과정에서 같은 환경변수로 dist/map-config.js의
window.MAP_CONFIG.kakaoJavaScriptKey 값을 생성해야 합니다.
REST API 키 또는 관리자 키를 여기에 사용하지 않습니다.

실제 경계 데이터는 포함되어 있지 않으며 구청 인근 좌표 마커를 사용합니다.
목적지 지도는 지도의 임의 좌표를 선택하고 주소 변환 후 확정할 수 있습니다.
실제 핀 좌표에는 예시 역 경로를 적용하지 않으며 경로 API 연동 전에는 이동시간 정보 없음으로 표시합니다.

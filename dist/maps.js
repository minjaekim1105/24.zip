window.realMaps = (() => {
  let loading;
  const positions = {
    gwanak:[37.4784,126.9516],gwangjin:[37.5385,127.0823],dongjak:[37.5124,126.9393],
    dongdaemun:[37.5744,127.0396],eunpyeong:[37.6027,126.9291],gangnam:[37.5172,127.0473],
    seocho:[37.4837,127.0324],yeongdeungpo:[37.5264,126.8962],songpa:[37.5145,127.1059],jung:[37.5641,126.9979]
  };
  function sdk() {
    if (window.kakao?.maps?.Map && window.kakao.maps.services) return Promise.resolve(window.kakao.maps);
    if (loading) return loading;
    const key = window.MAP_CONFIG?.kakaoJavaScriptKey;
    if (!key) return Promise.reject(new Error('지도 키가 설정되지 않았어요. 추천 목록과 다른 목적지 입력 방법을 이용할 수 있어요.'));
    loading = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('지도 연결 시간이 초과됐어요. 키와 등록 도메인을 확인해 주세요.')),15000);
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=' + encodeURIComponent(key);
      script.onload = () => window.kakao.maps.load(() => {clearTimeout(timer);resolve(window.kakao.maps);});
      script.onerror = () => {clearTimeout(timer);reject(new Error('지도를 불러오지 못했어요. 네트워크와 등록 도메인을 확인해 주세요.'));};
      document.head.append(script);
    }).catch(error => {loading = null;throw error;});
    return loading;
  }
  async function mount(node,options) {
    const status = node.closest('.map-comparison-page')?.querySelector('.map-status') || node.nextElementSibling;
    try {
      status.textContent = '지도 불러오는 중…';
      const maps = await sdk();
      if (!node.isConnected) return;
      const map = new maps.Map(node,{center:new maps.LatLng(37.54,126.99),level:8});
      status.textContent = options.pick ? '지도에서 위치를 누른 뒤 선택 완료를 눌러 주세요.' : '현재 평가 점수 · 100점 만점 · 부분 평가는 임시 점수';
      if (options.pick) {
        let pin = new maps.Marker({map});
        let generation = 0;
        if (options.coords) {
          const point = new maps.LatLng(options.coords.lat,options.coords.lng);
          pin.setPosition(point);map.setCenter(point);
        }
        maps.event.addListener(map,'click',event => {
          const point = event.latLng;
          const version = ++generation;
          pin.setPosition(point);
          const coords = {lat:point.getLat(),lng:point.getLng()};
          options.onPick(coords,'지도에서 선택한 위치');
          new maps.services.Geocoder().coord2Address(coords.lng,coords.lat,(results,resultStatus) => {
            if (version !== generation || !node.isConnected) return;
            const name = resultStatus === maps.services.Status.OK
              ? results[0]?.road_address?.address_name || results[0]?.address?.address_name : '';
            if (name) options.onPick(coords,name,name);
          });
        });

        return {setDestination(coords) {
          generation++;
          const point=new maps.LatLng(coords.lat,coords.lng);
          pin.setPosition(point);map.setCenter(point);map.setLevel(4);map.relayout();
        },relayout(){map.relayout();}};
      } else {

        const bounds = new maps.LatLngBounds();
        const labels=[];
        const controls=document.createElement('div');controls.className='comparison-location-controls';
        const destination=options.destination;
        let destinationPoint;
        if(Number.isFinite(destination?.lat)&&Number.isFinite(destination?.lng)){
          destinationPoint=new maps.LatLng(destination.lat,destination.lng);bounds.extend(destinationPoint);
          new maps.Marker({map,position:destinationPoint,title:'입력한 목적지 · '+(destination.name||'선택한 위치'),zIndex:100});
          const label=document.createElement('span');label.className='comparison-destination-label';label.textContent='목적지 · '+(destination.name||'선택한 위치');
          new maps.CustomOverlay({map,position:destinationPoint,content:label,yAnchor:2,zIndex:101});
          const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='목적지 위치 보기';button.addEventListener('click',()=>{map.setCenter(destinationPoint);map.setLevel(5);});controls.append(button);
          // 선택한 목적지 주변 서울시 실제 버스정류소 표시 (기존 지도/평가 로직은 변경하지 않음)
          const stopsButton=document.createElement('button');stopsButton.type='button';stopsButton.className='secondary';stopsButton.textContent='주변 버스정류장 보기';
          let stopMarkers=[];let stopVisible=false;
          stopsButton.addEventListener('click',async()=>{
            if(stopVisible){stopMarkers.forEach(marker=>marker.setMap(null));stopVisible=false;stopsButton.textContent='주변 버스정류장 보기';return;}
            if(stopMarkers.length){stopMarkers.forEach(marker=>marker.setMap(map));stopVisible=true;stopsButton.textContent='버스정류장 숨기기';return;}
            stopsButton.disabled=true;stopsButton.textContent='정류장 불러오는 중…';
            try{
              const response=await fetch('/api/bus-stops?lat='+encodeURIComponent(destination.lat)+'&lng='+encodeURIComponent(destination.lng)+'&radius=800');
              const data=await response.json();if(!response.ok)throw new Error(data.error||'데이터를 불러오지 못했습니다.');
              stopMarkers=data.stops.map(stop=>new maps.Marker({map,position:new maps.LatLng(stop.lat,stop.lng),title:'버스정류장 · '+stop.name+' ('+stop.distance+'m)'}));
              stopVisible=true;stopsButton.textContent='버스정류장 숨기기 ('+stopMarkers.length+')';
              map.setCenter(destinationPoint);map.setLevel(5);
            }catch(error){stopsButton.textContent='정류장 다시 불러오기';console.warn('서울시 정류소 API:',error.message);}
            finally{stopsButton.disabled=false;}
          });controls.append(stopsButton);
        }
        const toolbar=node.closest('.map-comparison-page')?.querySelector('[data-map-toolbar]');
        if(controls.childElementCount){if(toolbar)toolbar.append(controls);else node.before(controls);}

        for (const district of options.districts) {
          const [lat,lng]=positions[district.id];
          const point=new maps.LatLng(lat,lng);
          bounds.extend(point);
          const root=document.createElement('div');
          root.className='district-map-anchor';
          const dot=document.createElement('button');
          dot.type='button';dot.className='district-coordinate-dot';

          const line=document.createElement('span');line.className='district-label-line';
          const label=document.createElement('button');label.type='button';
          label.className='district-map-label';
          for(const button of [dot,label]) button.addEventListener('click',()=>options.onSelect(district.id));
          root.append(line,dot,label);
          const overlay=new maps.CustomOverlay({map,position:point,content:root,xAnchor:0,yAnchor:0});
          labels.push({id:district.id,point,root,label,dot,line,overlay,priority:0});
        }
        node.updateLabels=()=>{
          for(const item of labels){
            const d=options.districts.find(d=>d.id===item.id);
            const focused=options.focused===d.id, compared=options.compared.includes(d.id);
            item.priority=focused?2:compared?1:0;
            item.overlay.setZIndex(10+10*item.priority);
            item.root.classList.toggle('is-focused',focused);
            item.root.classList.toggle('is-compared',compared);
            item.label.textContent=d.name+(d.total==null?' · 미평가':' '+d.total.toFixed(1));
            item.label.setAttribute('aria-pressed',String(focused));
            item.dot.setAttribute('aria-label',d.name+(compared?' · 비교 선택':''));
          }
          arrange();
        };
        node.updateLabels();
        function arrange() {
          if(!node.isConnected)return;
          const projection=map.getProjection();
          const occupied=[];
          for(const item of labels.slice().sort((a,b)=>b.priority-a.priority)){
            const p=projection.containerPointFromCoords(item.point);
            const width=item.label.offsetWidth,height=item.label.offsetHeight;
            const offsets=[[12,-height-8],[-width-12,-height-8],[12,8],[-width-12,8],
              [-width/2,-height-24],[-width/2,24],[18,-height/2],[-width-18,-height/2]];
            let chosen;
            for(const [x,y] of offsets){
              const rect={left:p.x+x-5,top:p.y+y-5,right:p.x+x+width+5,bottom:p.y+y+height+5};
              if(rect.left<8||rect.top<8||rect.right>node.clientWidth-8||rect.bottom>node.clientHeight-8)continue;
              if(occupied.some(r=>rect.left<r.right&&rect.right>r.left&&rect.top<r.bottom&&rect.bottom>r.top))continue;
              chosen={x,y,rect};break;
            }
            if(!chosen && item.priority){
              const x=Math.max(8,Math.min(p.x-width/2,node.clientWidth-width-8))-p.x;
              const y=Math.max(8,Math.min(p.y-height-18,node.clientHeight-height-8))-p.y;
              chosen={x,y,rect:{left:p.x+x,top:p.y+y,right:p.x+x+width,bottom:p.y+y+height}};
            }
            item.label.style.visibility=chosen?'visible':'hidden';
            item.line.style.display=chosen?'block':'none';
            if(!chosen)continue;
            occupied.push(chosen.rect);
            item.label.style.left=chosen.x+'px';item.label.style.top=chosen.y+'px';
            const endX=Math.max(chosen.x,Math.min(0,chosen.x+width));
            const endY=Math.max(chosen.y,Math.min(0,chosen.y+height));
            item.line.style.width=Math.hypot(endX,endY)+'px';
            item.line.style.transform='rotate('+Math.atan2(endY,endX)+'rad)';
          }
        }
        if(options.viewport){
          map.setLevel(options.viewport.level);
          map.setCenter(new maps.LatLng(options.viewport.lat,options.viewport.lng));
        }else map.setBounds(bounds,64,90,64,90);
        maps.event.addListener(map,'idle',()=>{
          arrange();
          const center=map.getCenter();
          options.onView?.({lat:center.getLat(),lng:center.getLng(),level:map.getLevel()});
        });
        maps.event.addListener(map,'bounds_changed',arrange);
        requestAnimationFrame(arrange);
        const resize=new ResizeObserver(()=>{
          if(!node.isConnected){resize.disconnect();return;}
          map.relayout();arrange();
        });
        resize.observe(node);

      }
    } catch (error) {
      if (node.isConnected) status.textContent = error.message;
    }
  }

  async function search(query) {
    const maps=await sdk();
    const services=maps.services;
    const run=(service,method)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('검색 응답이 지연되고 있어요. 다시 검색해 주세요.')),10000);
      service[method](query,(data,status)=>{
        clearTimeout(timer);
        if(status===services.Status.OK)resolve(data);
        else if(status===services.Status.ZERO_RESULT)resolve([]);
        else reject(new Error('카카오 검색에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      });
    });
    const responses=await Promise.allSettled([
      run(new services.Places(),'keywordSearch'),run(new services.Geocoder(),'addressSearch')
    ]);
    if(responses.every(r=>r.status==='rejected'))throw responses[0].reason;
    const places=[];
    for(let index=0;index<responses.length;index++){
      const response=responses[index];
      if(response.status!=='fulfilled')continue;
      for(const item of response.value){
        const lat=Number(item.y),lng=Number(item.x);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
        const address=index===0?(item.road_address_name||item.address_name||''):
          (item.road_address?.address_name||item.address?.address_name||item.address_name||'');
        const name=index===0?item.place_name:address;
        if(places.some(p=>p.name===name&&p.address===address))continue;
        places.push({name,address,lat,lng,source:'kakao'});
      }
    }
    if(!places.length&&responses.some(r=>r.status==='rejected'))throw new Error('일부 검색을 완료하지 못했어요. 다시 시도해 주세요.');
    return places.slice(0,15);
  }
  return {mount,search};
})();

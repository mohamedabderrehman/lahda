import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

type LatLng = { latitude: number; longitude: number };

const CARTO_VOYAGER_LIGHT = 'https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/';

type Props = {
  driverLocation: LatLng | null;
  merchantLocation: LatLng | null;
  customerLocation: LatLng | null;
  style?: { width?: number; height?: number };
  driverColor?: string;
  merchantColor?: string;
  customerColor?: string;
  routeColor?: string;
};

function buildHTML(
  centerLat: number,
  centerLng: number,
  zoom: number,
  merchant: LatLng | null,
  customer: LatLng | null,
  driver: LatLng | null,
  driverColor: string,
  merchantColor: string,
  customerColor: string,
  routeColor: string,
) {
  const merchantJS = merchant
    ? `{lat:${merchant.latitude},lng:${merchant.longitude},color:'${merchantColor.replace(/'/g, "\\'")}',label:'المتجر'}`
    : 'null';
  const customerJS = customer
    ? `{lat:${customer.latitude},lng:${customer.longitude},color:'${customerColor.replace(/'/g, "\\'")}',label:'موقعك'}`
    : 'null';
  const driverJS = driver
    ? `{lat:${driver.latitude},lng:${driver.longitude}}`
    : 'null';

  const tileBase = CARTO_VOYAGER_LIGHT;
  const tileSuffix = '.png';
  const bg = '#FFF8F1';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;background:${bg};touch-action:none}
    #map{position:absolute;top:0;left:0;right:0;bottom:0;touch-action:none}
    #layer{position:absolute;top:0;left:0;right:0;bottom:0;will-change:transform}
    #tiles{position:absolute;top:0;left:0;pointer-events:none;will-change:transform}
    .tile{position:absolute;width:256px;height:256px;pointer-events:none}
    .marker{position:absolute;pointer-events:none;z-index:10}
    .marker svg{width:100%;height:100%}
    .marker-label{position:absolute;top:-26px;left:50%;transform:translateX(-50%);white-space:nowrap;font:600 12px/1.2 sans-serif;color:#211A17;background:rgba(255,253,249,.96);padding:4px 10px;border-radius:10px;box-shadow:0 2px 8px rgba(91,45,17,.12)}
    #route-canvas{position:absolute;top:0;left:0;pointer-events:none;z-index:5}
    #zoom-controls{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:8px;z-index:20}
    .zoom-btn{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.06);box-shadow:0 2px 10px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:600;color:#1f2937;pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    #recenter-btn{position:absolute;right:12px;top:12px;width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.06);box-shadow:0 2px 10px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;z-index:20;font-size:20px;pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .driver-dot{position:absolute;width:24px;height:24px;border-radius:50%;background:${driverColor.replace(/'/g, "\\'")};border:3px solid #fff;box-shadow:0 0 0 4px rgba(0,0,0,.2);z-index:15;pointer-events:none;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.9;transform:scale(1.05)}}
  </style>
</head>
<body>
<div id="map">
  <div id="layer">
    <div id="tiles"></div>
    <canvas id="route-canvas"></canvas>
    <div id="markers"></div>
  </div>
  <div id="recenter-btn" title="إعادة التمركز">⌖</div>
  <div id="zoom-controls">
    <div id="zoom-in" class="zoom-btn">+</div>
    <div id="zoom-out" class="zoom-btn">−</div>
  </div>
</div>
<script>
(function(){
  var TILE_BASE='${tileBase.replace(/'/g, "\\'")}';
  var TILE_SUFFIX='${tileSuffix.replace(/'/g, "\\'")}';
  var ZOOM=${zoom},MIN_ZOOM=2,MAX_ZOOM=18,TILE_SIZE=256;
  var centerLat=${centerLat},centerLng=${centerLng};
  var merchant=${merchantJS};
  var customer=${customerJS};
  var driver=${driverJS};
  var routeCoords=[];
  var container=document.getElementById('map');
  var layer=document.getElementById('layer');
  var tilesDiv=document.getElementById('tiles');
  var markersDiv=document.getElementById('markers');
  var canvas=document.getElementById('route-canvas');
  var ctx=canvas.getContext('2d');
  var w,h;

  function lon2tile(l,z){return(l+180)/360*Math.pow(2,z)}
  function lat2tile(l,z){var r=l*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z)}
  function tile2lon(x,z){return x/Math.pow(2,z)*360-180}
  function tile2lat(y,z){var n=Math.PI-2*Math.PI*y/Math.pow(2,z);return 180/Math.PI*Math.atan(.5*(Math.exp(n)-Math.exp(-n)))}
  function latlngToPixel(lat,lng){
    var cx=lon2tile(centerLng,ZOOM),cy=lat2tile(centerLat,ZOOM);
    return{x:w/2+(lon2tile(lng,ZOOM)-cx)*TILE_SIZE,y:h/2+(lat2tile(lat,ZOOM)-cy)*TILE_SIZE};
  }

  var tileCache={};
  function getTileUrl(tx,ty){ return TILE_BASE+ZOOM+'/'+tx+'/'+ty+TILE_SUFFIX; }

  function drawRoute(){
    canvas.width=w;canvas.height=h;
    if(routeCoords.length<2)return;
    ctx.clearRect(0,0,w,h);
    ctx.beginPath();
    ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
    ctx.strokeStyle='${routeColor.replace(/'/g, "\\'")}';
    ctx.lineWidth=7;
    ctx.lineJoin='round';ctx.lineCap='round';
    for(var i=0;i<routeCoords.length;i++){var p=latlngToPixel(routeCoords[i][0],routeCoords[i][1]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
    ctx.stroke();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  }

  function makePinSVG(color){return '<svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="'+color+'"/><circle cx="12" cy="12" r="4" fill="white"/></svg>';}

  function updateMarkers(){
    markersDiv.innerHTML='';
    [merchant,customer].forEach(function(m){
      if(!m)return;
      var p=latlngToPixel(m.lat,m.lng);
      var div=document.createElement('div');div.className='marker';
      div.style.width='32px';div.style.height='40px';
      div.style.left=(p.x-16)+'px';div.style.top=(p.y-40)+'px';
      div.innerHTML=makePinSVG(m.color||'#FF6B1A');
      if(m.label){var lb=document.createElement('div');lb.className='marker-label';lb.textContent=m.label;div.appendChild(lb);}
      markersDiv.appendChild(div);
    });
    if(driver&&driver.lat!=null&&driver.lng!=null){
      var dp=latlngToPixel(driver.lat,driver.lng);
      var dd=document.createElement('div');dd.className='driver-dot';
      dd.style.left=(dp.x-12)+'px';dd.style.top=(dp.y-12)+'px';
      markersDiv.appendChild(dd);
    }
  }

  function render(){
    w=container.offsetWidth||window.innerWidth;h=container.offsetHeight||window.innerHeight;
    var cx=lon2tile(centerLng,ZOOM),cy=lat2tile(centerLat,ZOOM);
    var cols=Math.ceil(w/TILE_SIZE)+2,rows=Math.ceil(h/TILE_SIZE)+2;
    var needed={};
    for(var dy=-1;dy<=rows;dy++){for(var dx=-1;dx<=cols;dx++){
      var tx=Math.floor(cx)+dx,ty=Math.floor(cy)+dy,key=tx+'_'+ty;
      needed[key]=true;
      var left=w/2+(tx-cx)*TILE_SIZE,top=h/2+(ty-cy)*TILE_SIZE;
      if(tileCache[key]){tileCache[key].style.left=left+'px';tileCache[key].style.top=top+'px';}
      else{var img=document.createElement('img');img.className='tile';img.src=getTileUrl(tx,ty);img.style.left=left+'px';img.style.top=top+'px';tilesDiv.appendChild(img);tileCache[key]=img;}
    }}
    for(var k in tileCache){if(!needed[k]){var el=tileCache[k];if(el.parentNode)el.parentNode.removeChild(el);delete tileCache[k];}}
    if(layer)layer.style.transform='';
    tilesDiv.style.transform='';
    updateMarkers();drawRoute();
  }

  function setZoom(d){var n=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,ZOOM+d));if(n===ZOOM)return;ZOOM=n;tileCache={};tilesDiv.innerHTML='';render();}

  function pixelDeltaToLatLng(dx,dy){
    var cx=lon2tile(centerLng,ZOOM),cy=lat2tile(centerLat,ZOOM);
    return{lat:Math.max(-85,Math.min(85,tile2lat(cy-dy/TILE_SIZE,ZOOM))),lng:tile2lon(cx-dx/TILE_SIZE,ZOOM)};
  }

  function doRecenter(){
    var all=[];
    if(merchant)all.push({lat:merchant.lat,lng:merchant.lng});
    if(customer)all.push({lat:customer.lat,lng:customer.lng});
    if(driver&&driver.lat!=null)all.push({lat:driver.lat,lng:driver.lng});
    if(all.length===0)return;
    centerLat=all.reduce(function(s,p){return s+p.lat;},0)/all.length;
    centerLng=all.reduce(function(s,p){return s+p.lng;},0)/all.length;
    render();
  }

  var isPanning=false,lastX=0,lastY=0,totalDX=0,totalDY=0,lastPinch=0;
  function touchDist(a,b){var dx=a.clientX-b.clientX,dy=a.clientY-b.clientY;return Math.sqrt(dx*dx+dy*dy);}
  function isControl(t){return t&&(t.id==='zoom-in'||t.id==='zoom-out'||t.id==='recenter-btn'||t.classList.contains('zoom-btn'));}
  function start(e){
    if(isControl(e.target))return;
    if(e.touches&&e.touches.length===2){lastPinch=touchDist(e.touches[0],e.touches[1]);isPanning=false;return;}
    var x=e.touches?e.touches[0].clientX:e.clientX,y=e.touches?e.touches[0].clientY:e.clientY;
    isPanning=true;lastX=x;lastY=y;totalDX=0;totalDY=0;
  }
  function move(e){
    if(e.touches&&e.touches.length===2){e.preventDefault();var d=touchDist(e.touches[0],e.touches[1]);if(lastPinch>0){var r=d/lastPinch;if(r>1.3){setZoom(1);lastPinch=d;}else if(r<.7){setZoom(-1);lastPinch=d;}}lastPinch=d;isPanning=false;return;}
    if(!isPanning)return;e.preventDefault();
    var x=e.touches?e.touches[0].clientX:e.clientX,y=e.touches?e.touches[0].clientY:e.clientY;
    var dx=x-lastX,dy=y-lastY;totalDX+=dx;totalDY+=dy;lastX=x;lastY=y;
    if(layer)layer.style.transform='translate('+totalDX+'px,'+totalDY+'px)';
  }
  function end(){
    if(isPanning){
      isPanning=false;
      if(Math.abs(totalDX)>2||Math.abs(totalDY)>2){
        var n=pixelDeltaToLatLng(totalDX,totalDY);
        centerLat=n.lat;centerLng=n.lng;
      }
      totalDX=0;totalDY=0;
      if(layer)layer.style.transform='';
      render();
    }
    lastPinch=0;
  }
  container.addEventListener('touchstart',start,{passive:true});
  container.addEventListener('touchmove',move,{passive:false});
  container.addEventListener('touchend',end);container.addEventListener('touchcancel',end);
  container.addEventListener('mousedown',start);
  window.addEventListener('mousemove',function(e){if(isPanning)move(e);});
  window.addEventListener('mouseup',end);
  document.getElementById('zoom-in').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setZoom(1);});
  document.getElementById('zoom-out').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setZoom(-1);});
  document.getElementById('recenter-btn').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();doRecenter();});

  window.updateDriver=function(lat,lng){
    driver=lat!=null&&lng!=null?{lat:lat,lng:lng}:null;
    updateMarkers();
  };

  window.fetchRoute=function(){
    var pts=[];
    if(driver&&driver.lat!=null)pts.push([driver.lng,driver.lat]);
    if(merchant)pts.push([merchant.lng,merchant.lat]);
    if(customer)pts.push([customer.lng,customer.lat]);
    if(pts.length<2)return;
    var c=pts.map(function(p){return p[0]+','+p[1];}).join(';');
    fetch('https://router.project-osrm.org/route/v1/driving/'+c+'?overview=full&geometries=geojson')
      .then(function(r){return r.json();})
      .then(function(d){if(d.routes&&d.routes[0]&&d.routes[0].geometry){routeCoords=d.routes[0].geometry.coordinates.map(function(c){return[c[1],c[0]];});drawRoute();}})
      .catch(function(){});
  };

  if(container.offsetWidth)render();else setTimeout(render,100);
  setTimeout(function(){window.fetchRoute();},500);
})();
</script>
</body>
</html>`;
}

const DEFAULT_DRIVER = '#FF6B1A';
const DEFAULT_MERCHANT = '#dc2626';
const DEFAULT_CUSTOMER = '#059669';
const DEFAULT_ROUTE = '#FF6B1A';

export function OrderTrackingMapOSM({
  driverLocation,
  merchantLocation,
  customerLocation,
  style,
  driverColor = DEFAULT_DRIVER,
  merchantColor = DEFAULT_MERCHANT,
  customerColor = DEFAULT_CUSTOMER,
  routeColor = DEFAULT_ROUTE,
}: Props) {
  const webRef = useRef<WebView>(null);
  const prevDriverRef = useRef<string>('');

  const allPts: { lat: number; lng: number }[] = [];
  if (merchantLocation) allPts.push({ lat: merchantLocation.latitude, lng: merchantLocation.longitude });
  if (customerLocation) allPts.push({ lat: customerLocation.latitude, lng: customerLocation.longitude });
  if (driverLocation) allPts.push({ lat: driverLocation.latitude, lng: driverLocation.longitude });

  const centerLat = allPts.length ? allPts.reduce((s, p) => s + p.lat, 0) / allPts.length : 32.4921;
  const centerLng = allPts.length ? allPts.reduce((s, p) => s + p.lng, 0) / allPts.length : 44.4258;

  const html = useMemo(
    () =>
      buildHTML(
        centerLat,
        centerLng,
        14,
        merchantLocation,
        customerLocation,
        driverLocation,
        driverColor,
        merchantColor,
        customerColor,
        routeColor,
      ),
    [
      centerLat,
      centerLng,
      merchantLocation,
      customerLocation,
      driverLocation,
      driverColor,
      merchantColor,
      customerColor,
      routeColor,
    ],
  );

  const updateDriverViaJS = useCallback(() => {
    if (!webRef.current || !driverLocation) return;
    const key = `${driverLocation.latitude},${driverLocation.longitude}`;
    if (key === prevDriverRef.current) return;
    prevDriverRef.current = key;
    webRef.current.injectJavaScript(
      `window.updateDriver(${driverLocation.latitude},${driverLocation.longitude});window.fetchRoute();true;`
    );
  }, [driverLocation]);

  useEffect(() => {
    updateDriverViaJS();
  }, [updateDriverViaJS]);

  const width = style?.width ?? Dimensions.get('window').width;
  const height = style?.height ?? Dimensions.get('window').height * 0.55;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={[styles.webview, { width, height }]}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        {...(Platform.OS === 'android' && { androidLayerType: 'hardware' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 16 },
  webview: { backgroundColor: '#FFF8F1' },
});

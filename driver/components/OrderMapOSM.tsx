import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export type MapMarker = { lat: number; lng: number; color?: string; label?: string };

const CARTO_VOYAGER_LIGHT = 'https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/';
const CARTO_VOYAGER_DARK = 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/';

function getOrderMapHTML(
  centerLat: number,
  centerLng: number,
  zoom: number,
  markers: MapMarker[],
  driverLat?: number | null,
  driverLng?: number | null,
  darkMode?: boolean,
) {
  const tileBase = darkMode ? CARTO_VOYAGER_DARK : CARTO_VOYAGER_LIGHT;
  const tileSuffix = '.png';
  const bg = darkMode ? '#1a1a1e' : '#f5f5f4';

  const markersJson = JSON.stringify(
    markers.map((m) => ({ lat: m.lat, lng: m.lng, color: m.color || '#2563EB', label: m.label || '' }))
  );
  const hasDriver = Number.isFinite(driverLat) && Number.isFinite(driverLng);
  const driverLatStr = hasDriver ? String(driverLat) : 'null';
  const driverLngStr = hasDriver ? String(driverLng) : 'null';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: ${bg}; touch-action: none; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; touch-action: none; }
    #layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; will-change: transform; }
    #tiles { position: absolute; top: 0; left: 0; pointer-events: none; will-change: transform; }
    .tile { position: absolute; width: 256px; height: 256px; pointer-events: none; }
    .marker { position: absolute; width: 28px; height: 36px; margin-left: -14px; margin-top: -36px; pointer-events: none; z-index: 10; }
    .marker svg { width: 100%; height: 100%; }
    #route-canvas { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 5; }
    #zoom-controls { position: absolute; right: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 8px; z-index: 20; }
    .zoom-btn { width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.95); border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 4px 10px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 600; color: #1f2937; pointer-events: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
    .driver-marker { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid #fff; box-shadow: 0 0 10px rgba(37,99,235,0.6); z-index: 15; pointer-events: none; margin-left: -9px; margin-top: -9px; }
    .recenter-btn { position: absolute; right: 12px; top: 12px; width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.95); border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 4px 10px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; z-index: 20; font-size: 20px; }
  </style>
</head>
<body>
  <div id="map">
    <div id="layer">
      <div id="tiles"></div>
      <canvas id="route-canvas"></canvas>
      <div id="markers"></div>
      <div id="driver-marker" class="driver-marker" style="display:none;"></div>
    </div>
    <div id="zoom-controls">
      <div id="zoom-in" class="zoom-btn">+</div>
      <div id="zoom-out" class="zoom-btn">−</div>
    </div>
    <div id="recenter" class="recenter-btn">⌖</div>
  </div>
  <script>
    (function() {
      var TILE_BASE = '${tileBase.replace(/'/g, "\\'")}';
      var TILE_SUFFIX = '${tileSuffix.replace(/'/g, "\\'")}';
      function getTileUrl(tx, ty) { return TILE_BASE + ZOOM + '/' + tx + '/' + ty + TILE_SUFFIX; }
      var ZOOM = ${zoom};
      var MIN_ZOOM = 2;
      var MAX_ZOOM = 18;
      var TILE_SIZE = 256;
      var centerLat = ${centerLat};
      var centerLng = ${centerLng};
      var markersData = ${markersJson};
      var driverLat = ${driverLatStr};
      var driverLng = ${driverLngStr};
      var routeCoords = [];
      var container = document.getElementById('map');
      var layer = document.getElementById('layer');
      var tilesDiv = document.getElementById('tiles');
      var markersDiv = document.getElementById('markers');
      var driverMarkerDiv = document.getElementById('driver-marker');
      var canvas = document.getElementById('route-canvas');
      var ctx = canvas.getContext('2d');
      var w, h;

      function lon2tile(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
      function lat2tile(lat, z) {
        var rad = lat * Math.PI / 180;
        return (1 - Math.log(Math.tan(rad) + 1/Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z);
      }
      function tile2lon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
      function tile2lat(y, z) {
        var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      }

      function latlngToPixel(lat, lng) {
        var centerTx = lon2tile(centerLng, ZOOM);
        var centerTy = lat2tile(centerLat, ZOOM);
        var tx = lon2tile(lng, ZOOM);
        var ty = lat2tile(lat, ZOOM);
        return { x: w/2 + (tx - centerTx) * TILE_SIZE, y: h/2 + (ty - centerTy) * TILE_SIZE };
      }

      var tileCache = {};
      var panOffsetX = 0, panOffsetY = 0;

      // Global function to update driver location from React Native
      window.updateDriverLocation = function(lat, lng) {
        driverLat = lat;
        driverLng = lng;
        updateDriverMarker();
      };

      function updateDriverMarker() {
        if (driverLat != null && driverLng != null) {
          var dp = latlngToPixel(driverLat, driverLng);
          driverMarkerDiv.style.display = 'block';
          driverMarkerDiv.style.left = dp.x + 'px';
          driverMarkerDiv.style.top = dp.y + 'px';
        } else {
          driverMarkerDiv.style.display = 'none';
        }
      }

      function drawRoute() {
        canvas.width = w;
        canvas.height = h;
        if (routeCoords.length < 2) return;
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash([]);
        for (var i = 0; i < routeCoords.length; i++) {
          var p = latlngToPixel(routeCoords[i][0], routeCoords[i][1]);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      function updateMarkers() {
        markersDiv.innerHTML = '';
        markersData.forEach(function(m) {
          var p = latlngToPixel(m.lat, m.lng);
          var div = document.createElement('div');
          div.className = 'marker';
          div.style.left = p.x + 'px';
          div.style.top = p.y + 'px';
          div.innerHTML = '<svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="' + (m.color || '#2563EB') + '"/><circle cx="12" cy="12" r="4" fill="white"/></svg>';
          markersDiv.appendChild(div);
        });
        updateDriverMarker();
      }

      function render() {
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;
        var centerTx = lon2tile(centerLng, ZOOM);
        var centerTy = lat2tile(centerLat, ZOOM);
        var cols = Math.ceil(w / TILE_SIZE) + 2;
        var rows = Math.ceil(h / TILE_SIZE) + 2;
        var needed = {};
        for (var dy = -1; dy <= rows; dy++) {
          for (var dx = -1; dx <= cols; dx++) {
            var tx = Math.floor(centerTx) + dx;
            var ty = Math.floor(centerTy) + dy;
            var key = tx + '_' + ty;
            needed[key] = true;
            var left = w/2 + (tx - centerTx) * TILE_SIZE;
            var top = h/2 + (ty - centerTy) * TILE_SIZE;
            if (tileCache[key]) {
              tileCache[key].style.left = left + 'px';
              tileCache[key].style.top = top + 'px';
            } else {
              var img = document.createElement('img');
              img.className = 'tile';
              img.src = getTileUrl(tx, ty);
              img.style.left = left + 'px';
              img.style.top = top + 'px';
              tilesDiv.appendChild(img);
              tileCache[key] = img;
            }
          }
        }
        for (var k in tileCache) {
          if (!needed[k]) {
            var el = tileCache[k];
            if (el.parentNode) el.parentNode.removeChild(el);
            delete tileCache[k];
          }
        }
        panOffsetX = 0;
        panOffsetY = 0;
        if (layer) layer.style.transform = '';
        tilesDiv.style.transform = '';
        updateMarkers();
        drawRoute();
      }

      function setPanOffset(dx, dy) {
        panOffsetX = dx;
        panOffsetY = dy;
        tilesDiv.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        updateMarkers();
        drawRoute();
      }

      function setZoom(delta) {
        var next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, ZOOM + delta));
        if (next === ZOOM) return;
        ZOOM = next;
        tileCache = {};
        tilesDiv.innerHTML = '';
        render();
      }

      function pixelDeltaToLatLng(dxPx, dyPx) {
        var centerTx = lon2tile(centerLng, ZOOM);
        var centerTy = lat2tile(centerLat, ZOOM);
        var newLng = tile2lon(centerTx - dxPx / TILE_SIZE, ZOOM);
        var newLat = tile2lat(centerTy - dyPx / TILE_SIZE, ZOOM);
        return { lat: Math.max(-85, Math.min(85, newLat)), lng: newLng };
      }

      // Smooth touch handling - only use panOffset during drag, update center at end
      var isPanning = false, startX = 0, startY = 0, lastX = 0, lastY = 0, totalDragX = 0, totalDragY = 0;
      var lastPinchDist = 0;

      function dist(t1, t2) {
        var dx = t1.clientX - t2.clientX;
        var dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx*dx + dy*dy);
      }

      function isControlElement(target) {
        if (!target) return false;
        return target.id === 'zoom-in' || target.id === 'zoom-out' || target.id === 'recenter' ||
          target.classList.contains('zoom-btn') || target.classList.contains('recenter-btn');
      }

      function start(e) {
        var t = e.target || e.srcElement;
        if (isControlElement(t)) return;
        if (e.touches && e.touches.length === 2) {
          lastPinchDist = dist(e.touches[0], e.touches[1]);
          isPanning = false;
          return;
        }
        var x = e.touches ? e.touches[0].clientX : e.clientX;
        var y = e.touches ? e.touches[0].clientY : e.clientY;
        isPanning = true;
        startX = x; startY = y;
        lastX = x; lastY = y;
        totalDragX = 0; totalDragY = 0;
      }

      function move(e) {
        if (e.touches && e.touches.length === 2) {
          e.preventDefault();
          var d = dist(e.touches[0], e.touches[1]);
          if (lastPinchDist > 0) {
            var ratio = d / lastPinchDist;
            if (ratio > 1.3) { setZoom(1); lastPinchDist = d; }
            else if (ratio < 0.7) { setZoom(-1); lastPinchDist = d; }
          }
          lastPinchDist = d;
          isPanning = false;
          return;
        }
        if (!isPanning) return;
        e.preventDefault();
        var x = e.touches ? e.touches[0].clientX : e.clientX;
        var y = e.touches ? e.touches[0].clientY : e.clientY;
        var dx = x - lastX, dy = y - lastY;
        totalDragX += dx; totalDragY += dy;
        lastX = x; lastY = y;
        // Move whole map layer during drag for smooth performance
        if (layer) layer.style.transform = 'translate(' + totalDragX + 'px,' + totalDragY + 'px)';
      }

      function end() {
        if (!isPanning) return;
        isPanning = false;
        lastPinchDist = 0;
        // Now update the actual center based on total drag
        if (Math.abs(totalDragX) > 2 || Math.abs(totalDragY) > 2) {
          var next = pixelDeltaToLatLng(totalDragX, totalDragY);
          centerLat = next.lat;
          centerLng = next.lng;
        }
        totalDragX = 0; totalDragY = 0;
        if (layer) layer.style.transform = '';
        tilesDiv.style.transform = '';
        render();
      }

      container.addEventListener('touchstart', start, { passive: true });
      container.addEventListener('touchmove', move, { passive: false });
      container.addEventListener('touchend', end);
      container.addEventListener('touchcancel', end);
      container.addEventListener('mousedown', start);
      window.addEventListener('mousemove', function(e) { if (isPanning && !e.touches) move(e); });
      window.addEventListener('mouseup', end);

      document.getElementById('zoom-in').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); setZoom(1); });
      document.getElementById('zoom-out').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); setZoom(-1); });

      // Recenter button - fit all markers
      document.getElementById('recenter').addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        if (markersData.length === 0 && driverLat == null) return;
        var allLats = markersData.map(function(m) { return m.lat; });
        var allLngs = markersData.map(function(m) { return m.lng; });
        if (driverLat != null) { allLats.push(driverLat); allLngs.push(driverLng); }
        centerLat = allLats.reduce(function(a,b){return a+b;},0) / allLats.length;
        centerLng = allLngs.reduce(function(a,b){return a+b;},0) / allLngs.length;
        render();
      });

      // OSRM routing
      function fetchRoute() {
        var points = [];
        if (driverLat != null && driverLng != null) points.push([driverLng, driverLat]);
        markersData.forEach(function(m) { points.push([m.lng, m.lat]); });
        if (points.length < 2) return;
        var coords = points.map(function(p) { return p[0] + ',' + p[1]; }).join(';');
        var url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson';
        fetch(url)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.routes && data.routes[0] && data.routes[0].geometry) {
              routeCoords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              drawRoute();
            }
          })
          .catch(function() {});
      }

      if (container.offsetWidth) render();
      else setTimeout(render, 100);
      window.addEventListener('resize', render);

      setTimeout(fetchRoute, 500);
    })();
  </script>
</body>
</html>`;
}

type OrderMapOSMProps = {
  markers: MapMarker[];
  driverLocation?: { latitude: number; longitude: number } | null;
  style?: { width?: number; height?: number };
  darkMode?: boolean;
};

export function OrderMapOSM({ markers, driverLocation, style, darkMode = false }: OrderMapOSMProps) {
  const hasValid = markers.some((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  const allPoints = [
    ...markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    ...(driverLocation && Number.isFinite(driverLocation.latitude) && Number.isFinite(driverLocation.longitude)
      ? [{ lat: driverLocation.latitude, lng: driverLocation.longitude }]
      : []),
  ];
  const centerLat = allPoints.length
    ? allPoints.reduce((s, m) => s + m.lat, 0) / allPoints.length
    : 33.3152;
  const centerLng = allPoints.length
    ? allPoints.reduce((s, m) => s + m.lng, 0) / allPoints.length
    : 44.3661;

  const webRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  // Generate HTML only once on mount - do NOT include driverLocation in deps
  const html = useMemo(
    () =>
      getOrderMapHTML(
        centerLat,
        centerLng,
        14,
        markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
        null, // driver location will be updated via injectJavaScript
        null,
        darkMode,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerLat, centerLng, JSON.stringify(markers), darkMode]
  );

  // Update driver location via injectJavaScript instead of regenerating HTML
  useEffect(() => {
    if (!isReady || !webRef.current) return;
    if (driverLocation?.latitude != null && driverLocation?.longitude != null) {
      webRef.current.injectJavaScript(
        `updateDriverLocation(${driverLocation.latitude}, ${driverLocation.longitude}); true;`
      );
    }
  }, [driverLocation, isReady]);

  const width = style?.width ?? Dimensions.get('window').width;
  const height = style?.height ?? 320; // Increased from 220 for better visibility

  if (!hasValid && !driverLocation) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <View style={styles.placeholderInner} />
      </View>
    );
  }

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
        onLoad={() => setIsReady(true)}
        {...(Platform.OS === 'android' && { 
          androidLayerType: 'hardware',
          nestedScrollEnabled: false,
        })}
        {...(Platform.OS === 'ios' && {
          decelerationRate: 'fast',
          directionalLockEnabled: true,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 12 },
  webview: { backgroundColor: '#f5f5f4' },
  placeholder: { borderRadius: 12, overflow: 'hidden' },
  placeholderInner: { flex: 1, backgroundColor: '#f5f5f4' },
});

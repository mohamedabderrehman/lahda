import React, { useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const CARTO_VOYAGER_LIGHT = 'https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/';

function getMapHTML(lat: number, lng: number, interactive: boolean) {
  const tileBase = CARTO_VOYAGER_LIGHT;
  const tileSuffix = '.png';
  const bg = '#FFF8F1';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: ${bg}; touch-action: none; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; touch-action: none; }
    #tiles { position: absolute; top: 0; left: 0; pointer-events: none; will-change: transform; }
    .tile { position: absolute; width: 256px; height: 256px; pointer-events: none; image-rendering: auto; }
    #marker {
      position: absolute; left: 50%; top: 50%;
      width: 36px; height: 36px; margin-left: -18px; margin-top: -36px;
      pointer-events: none; z-index: 10;
    }
    #marker svg { width: 100%; height: 100%; }
    #zoom-controls {
      position: absolute; right: 12px; bottom: 12px;
      display: flex; flex-direction: column; gap: 8px; z-index: 20;
    }
    .zoom-btn {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(255,255,255,0.96); border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 4px 10px rgba(0,0,0,0.12);
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 22px; font-weight: 600; color: #1f2937;
      user-select: none; pointer-events: auto; cursor: pointer;
      -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    }
  </style>
</head>
<body>
  <div id="map">
    <div id="tiles"></div>
    <div id="marker">
      <svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#FF6B1A"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    </div>
    ${interactive ? '<div id="zoom-controls"><div id="zoom-in" class="zoom-btn">+</div><div id="zoom-out" class="zoom-btn">−</div></div>' : ''}
  </div>
  <script>
    (function() {
      var TILE_BASE = '${tileBase.replace(/'/g, "\\'")}';
      var TILE_SUFFIX = '${tileSuffix.replace(/'/g, "\\'")}';
      var ZOOM = 15;
      var MIN_ZOOM = 2;
      var MAX_ZOOM = 19;
      var TILE_SIZE = 256;
      var centerLat = ${lat};
      var centerLng = ${lng};
      var container = document.getElementById('map');
      var tilesDiv = document.getElementById('tiles');
      var w = container.offsetWidth || window.innerWidth;
      var h = container.offsetHeight || window.innerHeight;

      function lon2tile(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
      function lat2tile(lat, z) {
        var r = lat * Math.PI / 180;
        return (1 - Math.log(Math.tan(r) + 1/Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
      }
      function tile2lon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
      function tile2lat(y, z) {
        var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      }

      var tileCache = {};
      var renderPending = false;

      function render() {
        renderPending = false;
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;
        var maxTile = Math.pow(2, ZOOM);
        var cx = lon2tile(centerLng, ZOOM);
        var cy = lat2tile(centerLat, ZOOM);
        var cols = Math.ceil(w / TILE_SIZE) + 2;
        var rows = Math.ceil(h / TILE_SIZE) + 2;
        var needed = {};
        for (var dy = -1; dy <= rows; dy++) {
          for (var dx = -1; dx <= cols; dx++) {
            var tx = Math.floor(cx) + dx;
            var ty = Math.floor(cy) + dy;
            if (ty < 0 || ty >= maxTile) continue;
            var wtx = ((tx % maxTile) + maxTile) % maxTile;
            var key = ZOOM + '/' + wtx + '/' + ty;
            needed[key] = true;
            var left = w/2 + (tx - cx) * TILE_SIZE;
            var top = h/2 + (ty - cy) * TILE_SIZE;
            if (tileCache[key]) {
              tileCache[key].style.left = left + 'px';
              tileCache[key].style.top = top + 'px';
            } else {
              var img = document.createElement('img');
              img.className = 'tile';
              img.src = TILE_BASE + key + TILE_SUFFIX;
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
        tilesDiv.style.transform = '';
      }

      function scheduleRender() {
        if (!renderPending) {
          renderPending = true;
          requestAnimationFrame(render);
        }
      }

      function setPanOffset(dx, dy) {
        tilesDiv.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      }

      function applyZoom(newZoom, pivotX, pivotY) {
        newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        if (newZoom === ZOOM) return;
        if (pivotX !== undefined && pivotY !== undefined) {
          var cx = lon2tile(centerLng, ZOOM);
          var cy = lat2tile(centerLat, ZOOM);
          var offX = (pivotX - w/2) / TILE_SIZE;
          var offY = (pivotY - h/2) / TILE_SIZE;
          var pivotLng = tile2lon(cx + offX, ZOOM);
          var pivotLat = tile2lat(cy + offY, ZOOM);
          ZOOM = newZoom;
          var ncx = lon2tile(pivotLng, ZOOM) - offX;
          var ncy = lat2tile(pivotLat, ZOOM) - offY;
          centerLng = tile2lon(ncx, ZOOM);
          centerLat = tile2lat(ncy, ZOOM);
        } else {
          ZOOM = newZoom;
        }
        tileCache = {};
        tilesDiv.innerHTML = '';
        render();
      }

      function sendPos() {
        if (window.ReactNativeWebView)
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: centerLat, lng: centerLng, zoom: ZOOM }));
      }

      function pixelDeltaToLatLng(dxPx, dyPx) {
        var cx = lon2tile(centerLng, ZOOM);
        var cy = lat2tile(centerLat, ZOOM);
        return {
          lat: Math.max(-85, Math.min(85, tile2lat(cy - dyPx / TILE_SIZE, ZOOM))),
          lng: tile2lon(cx - dxPx / TILE_SIZE, ZOOM)
        };
      }

      function pixelToLatLng(relX, relY) {
        var cx = lon2tile(centerLng, ZOOM);
        var cy = lat2tile(centerLat, ZOOM);
        return {
          lat: Math.max(-85, Math.min(85, tile2lat(cy + relY / TILE_SIZE, ZOOM))),
          lng: tile2lon(cx + relX / TILE_SIZE, ZOOM)
        };
      }

      window.setCenter = function(lat, lng) {
        centerLat = lat;
        centerLng = lng;
        render();
      };

      window.setZoomLevel = function(z) { applyZoom(z); };

      if (${interactive ? 'true' : 'false'}) {
        var isPanning = false, isPinching = false;
        var startX = 0, startY = 0, lastX = 0, lastY = 0;
        var moved = false;
        var TAP_THRESHOLD = 12;
        var totalDragX = 0, totalDragY = 0;
        var lastPinchDist = 0;
        var pinchMidX = 0, pinchMidY = 0;
        var lastTapTime = 0;

        function dist(t) {
          var dx = t[0].clientX - t[1].clientX;
          var dy = t[0].clientY - t[1].clientY;
          return Math.sqrt(dx*dx + dy*dy);
        }

        function isZoomBtn(target) {
          if (!target) return false;
          return target.id === 'zoom-in' || target.id === 'zoom-out' ||
            target.classList.contains('zoom-btn') ||
            (target.parentNode && (target.parentNode.id === 'zoom-in' || target.parentNode.id === 'zoom-out' || target.parentNode.id === 'zoom-controls'));
        }

        container.addEventListener('touchstart', function(e) {
          if (isZoomBtn(e.target)) return;
          if (e.touches.length === 2) {
            isPanning = false;
            isPinching = true;
            lastPinchDist = dist(e.touches);
            pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            return;
          }
          if (e.touches.length !== 1) return;
          isPanning = true;
          isPinching = false;
          var x = e.touches[0].clientX, y = e.touches[0].clientY;
          startX = x; startY = y; lastX = x; lastY = y;
          moved = false; totalDragX = 0; totalDragY = 0;
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
          e.preventDefault();
          if (isPinching && e.touches.length >= 2) {
            var d = dist(e.touches);
            var ratio = d / lastPinchDist;
            if (ratio > 1.25) {
              applyZoom(ZOOM + 1, pinchMidX, pinchMidY);
              lastPinchDist = d;
            } else if (ratio < 0.8) {
              applyZoom(ZOOM - 1, pinchMidX, pinchMidY);
              lastPinchDist = d;
            }
            return;
          }
          if (!isPanning || !e.touches.length) return;
          var x = e.touches[0].clientX, y = e.touches[0].clientY;
          var dx = x - lastX, dy = y - lastY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
          totalDragX += dx; totalDragY += dy;
          lastX = x; lastY = y;
          var n = pixelDeltaToLatLng(dx, dy);
          centerLat = n.lat; centerLng = n.lng;
          setPanOffset(totalDragX, totalDragY);
        }, { passive: false });

        container.addEventListener('touchend', function(e) {
          if (isPinching) {
            isPinching = false;
            render();
            sendPos();
            return;
          }
          if (!isPanning) return;
          isPanning = false;
          var x = e.changedTouches ? e.changedTouches[0].clientX : 0;
          var y = e.changedTouches ? e.changedTouches[0].clientY : 0;
          if (!moved && Math.abs(x - startX) < TAP_THRESHOLD && Math.abs(y - startY) < TAP_THRESHOLD) {
            var now = Date.now();
            if (now - lastTapTime < 350) {
              applyZoom(ZOOM + 1, x, y);
              lastTapTime = 0;
            } else {
              lastTapTime = now;
              var rect = container.getBoundingClientRect();
              var relX = x - rect.left - rect.width / 2;
              var relY = y - rect.top - rect.height / 2;
              var next = pixelToLatLng(relX, relY);
              centerLat = next.lat; centerLng = next.lng;
              render();
            }
            sendPos();
          } else {
            totalDragX = 0; totalDragY = 0;
            render();
            sendPos();
          }
        });
        container.addEventListener('touchcancel', function() { isPanning = false; isPinching = false; render(); });

        container.addEventListener('mousedown', function(e) {
          if (isZoomBtn(e.target)) return;
          isPanning = true; moved = false;
          startX = e.clientX; startY = e.clientY;
          lastX = e.clientX; lastY = e.clientY;
          totalDragX = 0; totalDragY = 0;
        });
        window.addEventListener('mousemove', function(e) {
          if (!isPanning) return;
          var dx = e.clientX - lastX, dy = e.clientY - lastY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
          totalDragX += dx; totalDragY += dy;
          lastX = e.clientX; lastY = e.clientY;
          var n = pixelDeltaToLatLng(dx, dy);
          centerLat = n.lat; centerLng = n.lng;
          setPanOffset(totalDragX, totalDragY);
        });
        window.addEventListener('mouseup', function(e) {
          if (!isPanning) return;
          isPanning = false;
          if (!moved) {
            var rect = container.getBoundingClientRect();
            var relX = e.clientX - rect.left - rect.width / 2;
            var relY = e.clientY - rect.top - rect.height / 2;
            var next = pixelToLatLng(relX, relY);
            centerLat = next.lat; centerLng = next.lng;
          }
          totalDragX = 0; totalDragY = 0;
          render(); sendPos();
        });

        container.addEventListener('wheel', function(e) {
          e.preventDefault();
          var rect = container.getBoundingClientRect();
          applyZoom(ZOOM + (e.deltaY < 0 ? 1 : -1), e.clientX - rect.left, e.clientY - rect.top);
          sendPos();
        }, { passive: false });
      }

      var zi = document.getElementById('zoom-in');
      var zo = document.getElementById('zoom-out');
      if (zi && zo) {
        function zh(d) { return function(e) { e.preventDefault(); e.stopPropagation(); applyZoom(ZOOM + d); sendPos(); }; }
        zi.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: false });
        zi.addEventListener('touchend', zh(1));
        zi.addEventListener('click', zh(1));
        zo.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: false });
        zo.addEventListener('touchend', zh(-1));
        zo.addEventListener('click', zh(-1));
      }

      if (container.offsetWidth) render();
      else setTimeout(render, 50);
      window.addEventListener('resize', function() { scheduleRender(); });
    })();
  </script>
</body>
</html>`;
}

export type MapOSMRef = { goToLocation: (lat: number, lng: number) => void };

type MapOSMProps = {
  latitude: number;
  longitude: number;
  style?: { width: number; height: number } | object;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
};

export const MapOSM = forwardRef<MapOSMRef, MapOSMProps>(function MapOSM(
  { latitude, longitude, style, interactive = true, onLocationSelect },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const initialLat = useRef(latitude);
  const initialLng = useRef(longitude);

  const html = useMemo(
    () => getMapHTML(initialLat.current, initialLng.current, interactive),
    [interactive],
  );

  useEffect(() => {
    webRef.current?.injectJavaScript(`setCenter(${latitude}, ${longitude}); true;`);
  }, [latitude, longitude]);

  useImperativeHandle(
    ref,
    () => ({
      goToLocation(lat: number, lng: number) {
        webRef.current?.injectJavaScript(`setCenter(${lat}, ${lng}); true;`);
      },
    }),
    [],
  );

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      if (typeof lat === 'number' && typeof lng === 'number' && onLocationSelect) onLocationSelect(lat, lng);
    } catch {}
  };

  const dims =
    typeof style === 'object' && style && 'width' in style && 'height' in style
      ? { width: (style as { width: number; height: number }).width, height: (style as { width: number; height: number }).height }
      : { width: Dimensions.get('window').width, height: 280 };

  return (
    <View style={[styles.wrap, dims]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={[styles.webview, dims]}
        scrollEnabled={false}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        allowFileAccess
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        {...(Platform.OS === 'android' && { androidLayerType: 'hardware' })}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 12 },
  webview: { backgroundColor: '#FFF8F1' },
});

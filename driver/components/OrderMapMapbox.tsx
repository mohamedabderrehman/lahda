import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Mapbox, { MapView, Camera, PointAnnotation, ShapeSource, LineLayer } from '@rnmapbox/maps';
import { setMapboxAccessToken, MAPBOX_STYLE_URI, getMapboxAccessToken } from '../lib/mapbox';
import { IconCarOutline, IconLocationOutline, IconStoreOutline } from './Icons';

export type MapMarker = { lat: number; lng: number; color?: string; label?: string };

type OrderMapMapboxProps = {
  markers: MapMarker[];
  driverLocation?: { latitude: number; longitude: number } | null;
  style?: { width?: number; height?: number };
  darkMode?: boolean;
};

const MERCHANT_COLOR = '#059669';
const DELIVERY_COLOR = '#2563EB';
const DRIVER_COLOR = '#2563EB';

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function OrderMapMapbox({
  markers,
  driverLocation,
  style,
  darkMode = false,
}: OrderMapMapboxProps) {
  setMapboxAccessToken();

  const [routeGeoJSON, setRouteGeoJSON] = useState<{ type: 'LineString'; coordinates: number[][] } | null>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const width = style?.width ?? Dimensions.get('window').width;
  const height = style?.height ?? 320;

  const validMarkers = useMemo(
    () => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    [markers]
  );
  const merchant = validMarkers[0] ?? null;
  const delivery = validMarkers[1] ?? null;

  const points = useMemo(() => {
    const pts: Array<[number, number]> = [];
    if (driverLocation) pts.push([driverLocation.longitude, driverLocation.latitude]);
    validMarkers.forEach((m) => pts.push([m.lng, m.lat]));
    return pts;
  }, [driverLocation, validMarkers]);

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    const padding = 0.008;
    return {
      ne: [Math.max(...lngs) + padding, Math.max(...lats) + padding] as [number, number],
      sw: [Math.min(...lngs) - padding, Math.min(...lats) - padding] as [number, number],
    };
  }, [points]);

  const driverCloseToCustomer =
    driverLocation &&
    delivery &&
    haversineKm(driverLocation, { latitude: delivery.lat, longitude: delivery.lng }) < 0.5;

  const defaultCamera = useMemo(() => {
    if (points.length === 0) {
      return { centerCoordinate: [44.3661, 33.3152] as [number, number], zoomLevel: 12 };
    }
    const midLng = points.reduce((s, p) => s + p[0], 0) / points.length;
    const midLat = points.reduce((s, p) => s + p[1], 0) / points.length;
    if (driverCloseToCustomer && delivery) {
      return {
        centerCoordinate: [delivery.lng, delivery.lat] as [number, number],
        zoomLevel: 16,
      };
    }
    if (bounds && points.length >= 2) {
      return {
        bounds,
        padding: { paddingTop: 80, paddingBottom: 80, paddingLeft: 80, paddingRight: 80 },
      };
    }
    return { centerCoordinate: [midLng, midLat] as [number, number], zoomLevel: 14 };
  }, [points, bounds, driverCloseToCustomer, delivery]);

  useEffect(() => {
    const waypoints: Array<[number, number]> = [];
    if (driverLocation) waypoints.push([driverLocation.longitude, driverLocation.latitude]);
    validMarkers.forEach((m) => waypoints.push([m.lng, m.lat]));
    if (waypoints.length < 2) {
      setRouteGeoJSON(null);
      return;
    }
    const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const token = getMapboxAccessToken();
    const controller = new AbortController();
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${token}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.code && data.code !== 'Ok') {
          setRouteGeoJSON(null);
          return;
        }
        if (data.routes?.[0]?.geometry?.coordinates?.length) {
          setRouteGeoJSON({ type: 'LineString', coordinates: data.routes[0].geometry.coordinates });
        } else {
          setRouteGeoJSON(null);
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setRouteGeoJSON(null);
      });
    return () => controller.abort();
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    merchant?.lat,
    merchant?.lng,
    delivery?.lat,
    delivery?.lng,
  ]);

  const routeShape = useMemo(() => {
    if (!routeGeoJSON) return undefined;
    return { type: 'Feature' as const, properties: {}, geometry: routeGeoJSON };
  }, [routeGeoJSON]);

  const styleURL = darkMode ? 'mapbox://styles/mapbox/dark-v11' : MAPBOX_STYLE_URI;

  if (validMarkers.length === 0 && !driverLocation) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <View style={styles.placeholderInner} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width, height }]}>
      <MapView style={[styles.map, { width, height }]} styleURL={styleURL} scaleBarEnabled={false}>
        <Camera
          key={driverCloseToCustomer ? 'zoom-close' : 'zoom-fit'}
          ref={cameraRef}
          defaultSettings={{
            ...defaultCamera,
            animationDuration: 800,
          }}
        />
        {routeShape && (
          <ShapeSource id="routeSource" shape={routeShape}>
            <LineLayer
              id="routeLine"
              style={{
                lineColor: DRIVER_COLOR,
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        )}
        {driverLocation && (
          <PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.markerWrap, { backgroundColor: DRIVER_COLOR }]}>
              <IconCarOutline size={22} color="#fff" />
            </View>
          </PointAnnotation>
        )}
        {merchant && (
          <PointAnnotation id="merchant" coordinate={[merchant.lng, merchant.lat]} anchor={{ x: 0.5, y: 1 }}>
            <View style={[styles.markerWrap, styles.markerPin, { backgroundColor: merchant.color ?? MERCHANT_COLOR }]}>
              <IconStoreOutline size={18} color="#fff" />
            </View>
          </PointAnnotation>
        )}
        {delivery && (
          <PointAnnotation id="delivery" coordinate={[delivery.lng, delivery.lat]} anchor={{ x: 0.5, y: 1 }}>
            <View style={[styles.markerWrap, styles.markerPin, { backgroundColor: delivery.color ?? DELIVERY_COLOR }]}>
              <IconLocationOutline size={20} color="#fff" />
            </View>
          </PointAnnotation>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 12 },
  map: { flex: 1 },
  placeholder: { borderRadius: 12, overflow: 'hidden' },
  placeholderInner: { flex: 1, backgroundColor: '#f5f5f4' },
  markerWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...(Platform.OS === 'android'
      ? { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }
      : {}),
  },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

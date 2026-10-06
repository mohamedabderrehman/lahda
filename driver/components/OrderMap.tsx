import React from 'react';
import { useNativeMapbox } from '../lib/useNativeMapbox';
import { OrderMapOSM } from './OrderMapOSM';
import type { MapMarker } from './OrderMapOSM';

type OrderMapProps = {
  markers: MapMarker[];
  driverLocation?: { latitude: number; longitude: number } | null;
  style?: { width?: number; height?: number };
  darkMode?: boolean;
};

/** Order map: native Mapbox when available, OSM fallback in Expo Go. */
export function OrderMap({ markers, driverLocation, style, darkMode }: OrderMapProps) {
  const native = useNativeMapbox();
  if (native) {
    const { OrderMapMapbox } = require('./OrderMapMapbox');
    return <OrderMapMapbox markers={markers} driverLocation={driverLocation} style={style} darkMode={darkMode} />;
  }
  return <OrderMapOSM markers={markers} driverLocation={driverLocation} style={style} darkMode={darkMode} />;
}

import React from 'react';
import { useNativeMapbox } from '../lib/useNativeMapbox';
import { OrderTrackingMapOSM } from './OrderTrackingMapOSM';

type LatLng = { latitude: number; longitude: number };

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

/** Order tracking map: native Mapbox when available, OSM fallback in Expo Go. Mapbox is required only when native so Expo Go never loads it. */
export function OrderTrackingMap(props: Props) {
  const native = useNativeMapbox();
  if (native) {
    const { OrderTrackingMapMapbox } = require('./OrderTrackingMapMapbox');
    return <OrderTrackingMapMapbox {...props} />;
  }
  return <OrderTrackingMapOSM {...props} />;
}

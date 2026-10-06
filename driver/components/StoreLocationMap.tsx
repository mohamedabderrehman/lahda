import React, { forwardRef, type ForwardedRef } from 'react';
import { useNativeMapbox } from '../lib/useNativeMapbox';
import { MapOSM, MapOSMRef } from './MapOSM';

export type StoreLocationMapRef = { goToLocation: (lat: number, lng: number) => void };

type Props = {
  latitude: number;
  longitude: number;
  style?: { width: number; height: number } | object;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  darkMode?: boolean;
};

/** Store location picker map: native Mapbox when available, OSM fallback in Expo Go. */
export const StoreLocationMap = forwardRef<StoreLocationMapRef, Props>(function StoreLocationMap(props, ref) {
  const native = useNativeMapbox();
  if (native) {
    const { MapMapbox } = require('./MapMapbox');
    return <MapMapbox ref={ref} {...props} />;
  }
  return <MapOSM ref={ref as ForwardedRef<MapOSMRef>} {...props} />;
});

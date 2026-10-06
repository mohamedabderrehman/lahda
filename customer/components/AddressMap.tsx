import React, { forwardRef } from 'react';
import { useNativeMapbox } from '../lib/useNativeMapbox';
import { MapOSM, MapOSMRef } from './MapOSM';

export type AddressMapRef = { goToLocation: (lat: number, lng: number) => void };

type Props = {
  latitude: number;
  longitude: number;
  style?: { width: number; height: number } | object;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
};

/** Address picker/preview map: native Mapbox when available, OSM fallback in Expo Go. Mapbox is required only when native so Expo Go never loads it. */
export const AddressMap = forwardRef<AddressMapRef, Props>(function AddressMap(props, ref) {
  const native = useNativeMapbox();
  if (native) {
    const { MapMapbox } = require('./MapMapbox');
    return <MapMapbox ref={ref} {...props} />;
  }
  return <MapOSM ref={ref as React.ForwardedRef<MapOSMRef>} {...props} />;
});

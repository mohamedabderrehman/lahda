import React, { useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Mapbox, { MapView, Camera, PointAnnotation } from '@rnmapbox/maps';
import { setMapboxAccessToken, MAPBOX_STYLE_URI } from '../lib/mapbox';
import { IconLocationOutline } from './Icons';

export type MapMapboxRef = { goToLocation: (lat: number, lng: number) => void };

type MapMapboxProps = {
  latitude: number;
  longitude: number;
  style?: { width: number; height: number } | object;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  darkMode?: boolean;
};

type RegionFeature = Parameters<NonNullable<React.ComponentProps<typeof MapView>['onRegionDidChange']>>[0];

export const MapMapbox = forwardRef<MapMapboxRef, MapMapboxProps>(function MapMapbox(
  { latitude, longitude, style, interactive = true, onLocationSelect, darkMode = false },
  ref,
) {
  setMapboxAccessToken();

  const [cameraCenter, setCameraCenter] = useState({ lng: longitude, lat: latitude });

  useEffect(() => {
    setCameraCenter({ lng: longitude, lat: latitude });
  }, [latitude, longitude]);

  const dims =
    typeof style === 'object' && style && 'width' in style && 'height' in style
      ? { width: (style as { width: number; height: number }).width, height: (style as { width: number; height: number }).height }
      : { width: Dimensions.get('window').width, height: 280 };

  useImperativeHandle(
    ref,
    () => ({
      goToLocation(lat: number, lng: number) {
        setCameraCenter({ lng, lat });
      },
    }),
    [],
  );

  const onRegionDidChange = (feature: RegionFeature) => {
    try {
      if (!interactive || !onLocationSelect || !feature?.geometry?.coordinates) return;
      if (feature.properties?.isUserInteraction !== true) return;
      const coordinates = feature.geometry.coordinates;
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        onLocationSelect(lat, lng);
      }
    } catch {
      // Ignore malformed or platform-specific event shape
    }
  };

  const styleURL = darkMode ? 'mapbox://styles/mapbox/dark-v11' : MAPBOX_STYLE_URI;

  const fixedCenterPin = interactive;

  return (
    <View style={[styles.wrap, dims]}>
      <MapView
        style={[styles.map, dims]}
        styleURL={styleURL}
        scaleBarEnabled={false}
        onRegionDidChange={onRegionDidChange}
      >
        <Camera
          centerCoordinate={[cameraCenter.lng, cameraCenter.lat]}
          zoomLevel={15}
          defaultSettings={{
            centerCoordinate: [cameraCenter.lng, cameraCenter.lat],
            zoomLevel: 15,
            animationDuration: 400,
          }}
        />
        {!fixedCenterPin && (
          <PointAnnotation
            id="address-pin"
            coordinate={[longitude, latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={[styles.pinWrap, Platform.OS === 'android' && styles.pinShadow]}>
              <IconLocationOutline size={24} color="#fff" />
            </View>
          </PointAnnotation>
        )}
      </MapView>
      {fixedCenterPin && (
        <View style={[styles.centerPinOverlay, dims]} pointerEvents="none">
          <View style={[styles.pinWrap, Platform.OS === 'android' && styles.pinShadow]}>
            <IconLocationOutline size={24} color="#fff" />
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 12 },
  map: { flex: 1 },
  centerPinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  pinWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: '#fff',
  },
  pinShadow: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

import Constants from 'expo-constants';

/** True when running in a dev/build binary with native Mapbox; false in Expo Go. */
export function useNativeMapbox(): boolean {
  return Constants.appOwnership !== 'expo';
}

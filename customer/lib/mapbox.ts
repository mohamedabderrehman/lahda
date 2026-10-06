const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  'REPLACE_WITH_YOUR_MAPBOX_TOKEN';

let tokenSet = false;

/** Lazy require so Expo/Metro config phase doesn't load the web build (which needs mapbox-gl). */
function getMapbox(): { setAccessToken: (token: string) => void } {
  return require('@rnmapbox/maps').default;
}

export function setMapboxAccessToken(): void {
  if (tokenSet) return;
  getMapbox().setAccessToken(MAPBOX_ACCESS_TOKEN);
  tokenSet = true;
}

export function getMapboxAccessToken(): string {
  return MAPBOX_ACCESS_TOKEN;
}

/** Mapbox style: clear and calm for customer app */
export const MAPBOX_STYLE_URI = 'mapbox://styles/mapbox/light-v11';

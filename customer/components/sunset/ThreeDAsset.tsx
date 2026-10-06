import React from 'react';
import { Image, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';

export const sunsetAssets = {
  hero: require('../../assets/sunset-3d/delivery-hero.png'),
  success: require('../../assets/sunset-3d/order-success.png'),
  empty: require('../../assets/sunset-3d/empty-state.png'),
} as const;

type Props = Omit<ImageProps, 'source'> & { asset: keyof typeof sunsetAssets; style?: StyleProp<ImageStyle> };

export function ThreeDAsset({ asset, style, ...rest }: Props) {
  return <Image source={sunsetAssets[asset]} resizeMode="contain" style={style} {...rest} />;
}

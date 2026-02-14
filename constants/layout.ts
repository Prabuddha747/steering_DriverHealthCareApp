/**
 * Responsive layout helpers: wp (width %), hp (height %), fs (font size), radius.
 */
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Base design width for scaling (typical mobile) */
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/** Scale factor based on screen width */
export const wp = (percentage: number) => (percentage / 100) * SCREEN_WIDTH;
export const hp = (percentage: number) => (percentage / 100) * SCREEN_HEIGHT;

/** Responsive font size - never scales above base to avoid oversized UI */
export const fs = (size: number) => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, 1);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/** Spacing as percentage of screen width */
export const spacing = {
  xs: wp(2),
  sm: wp(4),
  md: wp(5),
  lg: wp(6),
  xl: wp(8),
};

/** Border radius (scaled) - more square */
export const radius = {
  sm: wp(1),
  md: wp(1.5),
  lg: wp(2),
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };

import { Image } from 'expo-image';

/** PettyCashPlus's mark: the app icon (document and plus on white) as a rounded tile. */
export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      accessibilityIgnoresInvertColors
    />
  );
}

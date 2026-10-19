import { IconTargetArrow } from '@tabler/icons-react-native';
import { View } from 'react-native';

import { usePalette } from '@/theme/tokens';

/** CashFlow's mark: the target-and-arrow icon on a blue tile, as in the web app's header. */
export function BrandMark({ size = 48 }: { size?: number }) {
  const palette = usePalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: palette.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: palette.primary,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }}>
      <IconTargetArrow size={size * 0.58} color="#FFFFFF" strokeWidth={2} />
    </View>
  );
}

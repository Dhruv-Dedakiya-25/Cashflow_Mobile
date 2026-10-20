import { IconFileText } from '@tabler/icons-react-native';
import { Image } from 'expo-image';
import { ActivityIndicator, View } from 'react-native';

import { useReceiptImage } from '@/api/live';
import type { AttachmentInfo } from '@/api/types';
import { radius, usePalette } from '@/theme/tokens';

export const isPhoto = (receipt?: AttachmentInfo) => receipt?.contentType === 'image/jpeg' || receipt?.contentType === 'image/png';

/** A stored receipt photo, fetched with the session. Only photos show inline; the caller names other files. */
export function ReceiptPhoto({ receipt }: { receipt: AttachmentInfo }) {
  const palette = usePalette();
  const image = useReceiptImage(isPhoto(receipt) ? receipt.documentId : undefined);
  if (!isPhoto(receipt)) return null;
  const frame = { width: '100%' as const, aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: palette.surfaceStrong };
  return image.data ? (
    <Image source={{ uri: image.data }} style={frame} contentFit="contain" accessibilityIgnoresInvertColors />
  ) : (
    <View style={[frame, { alignItems: 'center', justifyContent: 'center' }]}>
      {image.error ? <IconFileText size={32} color={palette.textMuted} /> : <ActivityIndicator color={palette.primary} />}
    </View>
  );
}

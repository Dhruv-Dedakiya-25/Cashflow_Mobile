import { Text, type TextProps, type TextStyle } from 'react-native';

import { useLanguage } from '@/i18n';
import { fonts, type, usePalette, type Palette } from '@/theme/tokens';

type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'onPrimary' | 'success' | 'warning' | 'danger';

const toneColor = (p: Palette, tone: Tone) =>
  ({
    default: p.text,
    secondary: p.textSecondary,
    muted: p.textMuted,
    primary: p.primary,
    onPrimary: p.onPrimary,
    success: p.success,
    warning: p.warning,
    danger: p.danger,
  })[tone];

export type AppTextProps = TextProps & {
  variant?: keyof typeof type;
  weight?: keyof typeof fonts;
  tone?: Tone;
  align?: TextStyle['textAlign'];
};

/** Every piece of text in the app: the type scale, Inter, the theme's colours and the language's direction. */
export function AppText({ variant = 'body', weight = 'regular', tone = 'default', align, style, ...rest }: AppTextProps) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  return (
    <Text
      style={[
        type[variant],
        {
          fontFamily: fonts[weight],
          color: toneColor(palette, tone),
          textAlign: align ?? (isRTL ? 'right' : 'left'),
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...rest}
    />
  );
}

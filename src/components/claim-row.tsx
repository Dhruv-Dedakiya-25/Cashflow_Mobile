import {
  IconBed, IconCar, IconCoffee, IconDots, IconGasStation, IconParking, IconPencil, IconPhone, IconPrinter, IconTool,
  IconTruckDelivery, IconUsers, type Icon,
} from '@tabler/icons-react-native';
import { Pressable, View } from 'react-native';

import type { RequestStatus } from '@/api/types';
import { AppText } from '@/components/app-text';
import { StatusPill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { amount, category, shortDate } from '@/lib/format';
import { radius, space, usePalette } from '@/theme/tokens';

const categoryIcons: Record<string, Icon> = {
  'cat-001': IconCar,
  'cat-002': IconGasStation,
  'cat-003': IconCoffee,
  'cat-004': IconPencil,
  'cat-005': IconTruckDelivery,
  'cat-006': IconParking,
  'cat-007': IconBed,
  'cat-008': IconUsers,
  'cat-009': IconTool,
  'cat-010': IconPrinter,
  'cat-011': IconPhone,
};

// A live category has a GUID, so its icon is picked from its English name.
const iconsByName: [RegExp, Icon][] = [
  [/travel|taxi|transport/i, IconCar],
  [/fuel|petrol/i, IconGasStation],
  [/meal|refresh|food/i, IconCoffee],
  [/office|supplies|stationery/i, IconPencil],
  [/courier|delivery|postage/i, IconTruckDelivery],
  [/parking|toll/i, IconParking],
  [/accommodation|hotel|lodging/i, IconBed],
  [/meeting|client|entertain/i, IconUsers],
  [/repair|maintenance/i, IconTool],
  [/print|photocop/i, IconPrinter],
  [/phone|mobile|telecom/i, IconPhone],
];

export function CategoryIcon({ categoryId, size = 42 }: { categoryId?: string; size?: number }) {
  const palette = usePalette();
  const name = categoryId ? category(categoryId)?.nameEn : undefined;
  const IconComponent = (categoryId && categoryIcons[categoryId]) || (name && iconsByName.find(([re]) => re.test(name))?.[1]) || IconDots;
  return (
    <View style={{ width: size, height: size, borderRadius: radius.lg, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <IconComponent size={size * 0.5} color={palette.primary} strokeWidth={1.8} />
    </View>
  );
}

type Props = {
  title: string;
  reference: string;
  date: string;
  value: number;
  status: RequestStatus;
  categoryId?: string;
  /** A second line under the reference, such as who it is waiting for. */
  note?: string;
  /** Left out for a row that has nothing to open, such as a past claim in a report. */
  onPress?: () => void;
  first?: boolean;
};

/** One request in a list: what it was for, its reference and date, its amount and status. */
export function ClaimRow({ title, reference, date, value, status, categoryId, note, onPress, first }: Props) {
  const palette = usePalette();
  const { language } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.border,
        backgroundColor: pressed ? palette.surface : 'transparent',
      })}>
      <CategoryIcon categoryId={categoryId} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {reference} · {shortDate(date, language.code)}
        </AppText>
        {note ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {note}
          </AppText>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {amount(value, language.code)}
        </AppText>
        <StatusPill status={status} />
      </View>
    </Pressable>
  );
}

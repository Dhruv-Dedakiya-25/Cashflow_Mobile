import { Platform, Text, View } from 'react-native';

import { amount } from '@/lib/format';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });
// A printed receipt stays black on white in both themes, like paper.
const ink = '#1F2933';
const paper = '#FFFEFA';

function Line({ left, right, bold }: { left: string; right?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, direction: 'ltr' }}>
      <Text style={{ fontFamily: mono, fontSize: 11.5, color: ink, fontWeight: bold ? '700' : '400', flexShrink: 1 }} numberOfLines={1}>
        {left}
      </Text>
      {right ? <Text style={{ fontFamily: mono, fontSize: 11.5, color: ink, fontWeight: bold ? '700' : '400' }}>{right}</Text> : null}
    </View>
  );
}

const Rule = () => <Text style={{ fontFamily: mono, fontSize: 11, color: '#8A94A6', textAlign: 'center' }} numberOfLines={1}>{'- - - - - - - - - - - - - - - - - - - -'}</Text>;

/** A sample receipt drawn on screen, as the web demo draws its sample receipts. */
export function ReceiptPaper({ merchant, receiptNo, date, item, net, vat, gross, compact }: {
  merchant: string; receiptNo?: string; date: string; item: string; net: number; vat: number; gross: number; compact?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: paper,
        borderRadius: 6,
        paddingVertical: compact ? 12 : 18,
        paddingHorizontal: compact ? 14 : 18,
        gap: 5,
        width: '100%',
        maxWidth: 300,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
        transform: [{ rotate: '-1deg' }],
      }}>
      <Text style={{ fontFamily: mono, fontSize: 14, fontWeight: '700', color: ink, textAlign: 'center' }}>{merchant.toUpperCase()}</Text>
      <Text style={{ fontFamily: mono, fontSize: 10.5, color: ink, textAlign: 'center' }}>Muscat, Sultanate of Oman</Text>
      <Text style={{ fontFamily: mono, fontSize: 11, fontWeight: '700', color: ink, textAlign: 'center', marginTop: 2 }}>TAX INVOICE</Text>
      <Rule />
      {receiptNo ? <Line left="Receipt No." right={receiptNo} /> : null}
      <Line left="Date" right={date.split('-').reverse().join('/')} />
      <Rule />
      <Line left={item} right={amount(net, 'en')} />
      {!compact ? <Rule /> : null}
      <Line left="Subtotal" right={amount(net, 'en')} />
      <Line left="VAT 5%" right={amount(vat, 'en')} />
      <Line left="TOTAL OMR" right={amount(gross, 'en')} bold />
    </View>
  );
}

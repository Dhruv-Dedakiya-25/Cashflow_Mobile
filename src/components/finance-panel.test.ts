import { describe, expect, it } from '@jest/globals';

import { computeVat } from '@/mock/data';

import { financeInputOf, type FinanceDraft } from './finance-panel';

const draft = (amount: string): FinanceDraft => ({ amount, vatTreatment: 'exclusive', costLevel: 'department', costId: 'dep-it', settlement: 'salary' });

describe("Finance's choices at its step", () => {
  it('sends the amount as a number with what Finance chose', () => {
    expect(financeInputOf(draft(' 18.750 '))).toEqual({ enteredAmount: 18.75, vatTreatment: 'exclusive', costLevel: 'department', costId: 'dep-it', settlement: 'salary' });
  });

  it('holds back an amount the server would refuse', () => {
    for (const amount of ['0', '', '-2', '1.2345', '12,5', 'abc']) expect(financeInputOf(draft(amount))).toBeUndefined();
  });

  it("works the VAT out at the claim's rate", () => {
    expect(computeVat(18.75, 'exclusive', 5)).toEqual({ net: 18.75, vat: 0.938, gross: 19.688 });
    expect(computeVat(18.75, 'inclusive', 5)).toEqual({ net: 17.857, vat: 0.893, gross: 18.75 });
  });
});

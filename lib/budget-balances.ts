/** Category limits cover both sources; only cash can fund savings goals. */
export function calculateBalances({
  incomeCents,
  foodAllowanceCents,
  cashSpentCents,
  foodSpentCents,
  savedThisMonthCents,
  totalBudgetCents,
}: {
  incomeCents: number;
  foodAllowanceCents: number;
  cashSpentCents: number;
  foodSpentCents: number;
  savedThisMonthCents: number;
  totalBudgetCents: number;
}) {
  return {
    balanceCents: incomeCents - cashSpentCents - savedThisMonthCents,
    foodBalanceCents: foodAllowanceCents - foodSpentCents,
    totalSpentCents: cashSpentCents + foodSpentCents,
    unallocatedCents: incomeCents + foodAllowanceCents - totalBudgetCents - savedThisMonthCents,
  };
}

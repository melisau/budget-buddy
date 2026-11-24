// Pure helpers for the overall monthly budget (no database), easy to test.

export function monthBounds(month: string): { start: string; end: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, number] = month.split("-").map(Number);
  return { start: `${month}-01`, end: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) };
}

/** Spending and income totals for one month; transfers are not income or spending. */
export function monthTotals(rows: { type: string; amount: number | string; transfer_group_id: string | null }[]) {
  return rows.reduce((totals, row) => {
    if (row.transfer_group_id) return totals;
    if (row.type === "expense") totals.spent += Number(row.amount);
    else if (row.type === "income") totals.income += Number(row.amount);
    return totals;
  }, { spent: 0, income: 0 });
}

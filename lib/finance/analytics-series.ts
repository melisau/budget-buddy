// Chart buckets for the analytics page. A single month as one point says
// nothing, so short periods are split into weeks:
//   1 month  → 5 calendar chunks (1–7, 8–14, 15–21, 22–28, 29–end)
//   3 months → Monday-based weeks (about 13)
//   6, 12 months → months

export type SeriesPoint = { start: string; end: string; income: number; expense: number };
export type Series = { granularity: "week" | "month"; points: SeriesPoint[] };
type Item = { type: "income" | "expense"; amount: number | string; transaction_date: string };

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (value: string) => new Date(`${value}T00:00:00Z`);

function addDays(value: string, days: number) {
  const date = utc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return iso(date);
}

function monthStart(endMonth: string, offset: number) {
  const [year, month] = endMonth.split("-").map(Number);
  return iso(new Date(Date.UTC(year, month - 1 + offset, 1)));
}

function monthEnd(endMonth: string, offset: number) {
  const [year, month] = endMonth.split("-").map(Number);
  return iso(new Date(Date.UTC(year, month + offset, 0)));
}

function ranges(endMonth: string, period: number): { granularity: Series["granularity"]; spans: [string, string][] } {
  const last = monthEnd(endMonth, 0);
  if (period === 1) {
    const first = monthStart(endMonth, 0);
    const spans: [string, string][] = [];
    for (let start = first; start <= last; start = addDays(start, 7)) {
      const end = addDays(start, 6);
      spans.push([start, end > last ? last : end]);
    }
    // A 1–2 day tail (29–30/31) is folded into the previous chunk.
    if (spans.length > 4 && spans.at(-1)![0] > addDays(last, -2)) spans.splice(-2, 2, [spans.at(-2)![0], last]);
    return { granularity: "week", spans };
  }
  if (period === 3) {
    const first = monthStart(endMonth, -2);
    const spans: [string, string][] = [];
    const weekday = (utc(first).getUTCDay() + 6) % 7; // Monday = 0
    for (let start = addDays(first, -weekday); start <= last; start = addDays(start, 7)) {
      const end = addDays(start, 6);
      spans.push([start < first ? first : start, end > last ? last : end]);
    }
    return { granularity: "week", spans };
  }
  return {
    granularity: "month",
    spans: Array.from({ length: period }, (_, index) => [monthStart(endMonth, index - period + 1), monthEnd(endMonth, index - period + 1)] as [string, string]),
  };
}

export function analyticsSeries(items: Item[], endMonth: string, period: number): Series {
  const { granularity, spans } = ranges(endMonth, period);
  const points = spans.map(([start, end]) => {
    const inside = items.filter((item) => item.transaction_date >= start && item.transaction_date <= end);
    const total = (type: Item["type"]) => inside.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.amount), 0);
    return { start, end, income: total("income"), expense: total("expense") };
  });
  return { granularity, points };
}

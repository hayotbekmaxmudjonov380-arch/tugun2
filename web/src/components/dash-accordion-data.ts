export type DashDeptBarSegment = {
  key: string;
  count: number;
  tip: string;
  tipValue: string;
};

export type DashDeptBarRow = {
  deptId: string;
  deptName: string;
  branchName: string;
  total: number;
  ariaLabel: string;
  tip: string;
  tipRows: string;
  segments: DashDeptBarSegment[];
};

export type DashLineSeriesMeta = {
  name: string;
  slot: number;
};

export type DashUpcomingItem = {
  id: string;
  title: string;
  dayNum: number;
  monthShort: string;
  ownerName: string | null;
  ownerInitials: string | null;
  depts: Array<{ name: string; branchName: string }>;
  stateKey: string;
  stateLabel: string;
  dueText: string;
  dueCls: string;
};

export type DashRankedDept = {
  rank: number;
  deptId: string;
  deptName: string;
  branchName: string;
  staff: number;
  active: number;
  done: number;
  avg: number | null;
  overdue: number;
  rate: number | null;
  late: number;
  hours: number;
  score: number | null;
};

export type DashWorkloadItem = {
  personId: string;
  personName: string;
  shortName: string;
  deptName: string;
  own: number;
  exec: number;
  total: number;
};

export type DashActivityItem = {
  byName: string;
  byInitials: string;
  isStaff: boolean;
  txt: string;
  taskId: string | null;
  timeAgo: string;
};

export type DashAttendanceTable = {
  monthLoaded: boolean;
  conn: string;
  seriesNames: string[];
  rows: Array<{ dateLabel: string; values: Array<number | null> }>;
};

export type DashAccordionPayload = {
  monthName: string;
  deptBars: DashDeptBarRow[];
  lineSeries: DashLineSeriesMeta[];
  stateLegend: Array<{ key: string; label: string }>;
  upcoming: DashUpcomingItem[];
  ranked: DashRankedDept[];
  load: DashWorkloadItem[];
  idleCount: number;
  acts: DashActivityItem[];
  attTable: DashAttendanceTable;
};

export const DASH_ACCORDION_COUNT = 6;

export function formatPercent(v: number | null | undefined): string {
  return v == null ? "—" : `${v}%`;
}

export function getMeterSeverityClass(
  v: number | null | undefined,
  severity: boolean
): string {
  if (v == null || !severity) return "";
  if (v < 60) return "crit";
  if (v < 80) return "warn";
  return "";
}

export function calcBarWidthPct(total: number, maxTotal: number): string {
  const denom = Math.max(1, maxTotal);
  return `${((total / denom) * 88).toFixed(2)}%`;
}

export function buildAccordionMeta(
  payload: DashAccordionPayload
): Array<{ id: string; question: string }> {
  const barCount = payload.deptBars.length;
  const upCount = payload.upcoming.length;
  const deptCount = payload.ranked.length;
  const loadCount = payload.load.length;
  const actCount = payload.acts.length;
  const dayCount = payload.attTable.rows.length;

  return [
    {
      id: "charts",
      question: barCount
        ? `Bo'limlar bo'yicha tasklar va kunlik davomat · ${barCount} bo'lim`
        : `Bo'limlar bo'yicha tasklar va kunlik davomat · ${payload.monthName}`,
    },
    {
      id: "upcoming",
      question: upCount
        ? `Yaqin muddatlar · ${upCount} ta task`
        : "Yaqin muddatlar · muddati yaqin task yo'q",
    },
    {
      id: "activity-table",
      question: `Bo'limlar faolligi · ${deptCount} bo'lim`,
    },
    {
      id: "workload",
      question: loadCount
        ? `Xodimlar yuklamasi · top ${loadCount} xodim`
        : "Xodimlar yuklamasi · faol task yo'q",
    },
    {
      id: "feed",
      question: actCount
        ? `So'nggi faoliyat · ${actCount} ta yozuv`
        : "So'nggi faoliyat · yozuv yo'q",
    },
    {
      id: "att-table",
      question: dayCount
        ? `Kunlik davomat jadvali · ${payload.monthName} (${dayCount} kun)`
        : `Kunlik davomat jadvali · ${payload.monthName}`,
    },
  ];
}

export function resolveOpenAccordionIndex(
  saved: number | null | undefined,
  totalItems: number = DASH_ACCORDION_COUNT
): number | null {
  if (saved === null) return null;
  if (typeof saved === "number" && Number.isInteger(saved) && saved >= 0 && saved < totalItems) {
    return saved;
  }
  return 0;
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAccordionMeta,
  calcBarWidthPct,
  formatPercent,
  getMeterSeverityClass,
  resolveOpenAccordionIndex,
  type DashAccordionPayload,
} from "../src/components/dash-accordion-data.ts";

const samplePayload: DashAccordionPayload = {
  monthName: "Noyabr 2026",
  deptBars: [
    {
      deptId: "d1",
      deptName: "Savdo",
      branchName: "B2B",
      total: 4,
      ariaLabel: "Savdo: 4 ta task",
      tip: "Savdo (B2B)",
      tipRows: "[]",
      segments: [{ key: "progress", count: 4, tip: "Savdo · Jarayonda", tipValue: "4 ta task" }],
    },
  ],
  lineSeries: [{ name: "B2B", slot: 0 }],
  stateLegend: [{ key: "progress", label: "Jarayonda" }],
  upcoming: [
    {
      id: "t1",
      title: "Katalog dizayni",
      dayNum: 28,
      monthShort: "Noy",
      ownerName: "Azizbek R.",
      ownerInitials: "AR",
      depts: [{ name: "Dizayn", branchName: "B2B" }],
      stateKey: "progress",
      stateLabel: "Jarayonda",
      dueText: "4 kun qoldi",
      dueCls: "",
    },
  ],
  ranked: [
    {
      rank: 1,
      deptId: "d1",
      deptName: "Savdo",
      branchName: "B2B",
      staff: 5,
      active: 4,
      done: 8,
      avg: 82,
      overdue: 0,
      rate: 94,
      late: 1,
      hours: 180,
      score: 88,
    },
  ],
  load: [
    {
      personId: "p1",
      personName: "Azizbek Rahimov",
      shortName: "Azizbek R.",
      deptName: "Dizayn",
      own: 3,
      exec: 2,
      total: 5,
    },
  ],
  idleCount: 2,
  acts: [
    {
      byName: "Azizbek R.",
      byInitials: "AR",
      isStaff: true,
      txt: "izoh yozdi",
      taskId: "t1",
      timeAgo: "10 daqiqa oldin",
    },
  ],
  attTable: {
    monthLoaded: true,
    conn: "demo",
    seriesNames: ["B2B", "B2C"],
    rows: [{ dateLabel: "24-noyabr", values: [92, 88] }],
  },
};

describe("dash-accordion-data helpers", () => {
  it("formats percentages and null values safely", () => {
    assert.equal(formatPercent(85), "85%");
    assert.equal(formatPercent(0), "0%");
    assert.equal(formatPercent(null), "—");
  });

  it("computes severity classes only when severity mode is active", () => {
    assert.equal(getMeterSeverityClass(45, true), "crit");
    assert.equal(getMeterSeverityClass(72, true), "warn");
    assert.equal(getMeterSeverityClass(80, true), "");
    assert.equal(getMeterSeverityClass(45, false), "");
    assert.equal(getMeterSeverityClass(null, true), "");
  });

  it("calculates stacked bar widths capped proportionally at 88%", () => {
    assert.equal(calcBarWidthPct(5, 5), "88.00%");
    assert.equal(calcBarWidthPct(5, 10), "44.00%");
    assert.equal(calcBarWidthPct(0, 0), "0.00%");
  });

  it("builds Uzbek accordion headers with live counts for all 6 panels", () => {
    const meta = buildAccordionMeta(samplePayload);
    assert.equal(meta.length, 6);
    assert.equal(meta[0].question, "Bo'limlar bo'yicha tasklar va kunlik davomat · 1 bo'lim");
    assert.equal(meta[1].question, "Yaqin muddatlar · 1 ta task");
    assert.equal(meta[2].question, "Bo'limlar faolligi · 1 bo'lim");
    assert.equal(meta[3].question, "Xodimlar yuklamasi · top 1 xodim");
    assert.equal(meta[4].question, "So'nggi faoliyat · 1 ta yozuv");
    assert.equal(meta[5].question, "Kunlik davomat jadvali · Noyabr 2026 (1 kun)");
  });

  it("preserves valid open accordion indices including null", () => {
    assert.equal(resolveOpenAccordionIndex(undefined), 0);
    assert.equal(resolveOpenAccordionIndex(5), 5);
    assert.equal(resolveOpenAccordionIndex(null), null);
    assert.equal(resolveOpenAccordionIndex(99), 0);
  });
});

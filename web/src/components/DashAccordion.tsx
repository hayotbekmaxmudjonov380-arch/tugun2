import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LiquidAccordion,
  type LiquidAccordionItem,
} from "@/components/ui/liquid-glass-accordion";
import { resolveNavTone } from "@/components/ui/nav-utils";
import {
  buildAccordionMeta,
  calcBarWidthPct,
  formatPercent,
  getMeterSeverityClass,
  resolveOpenAccordionIndex,
  type DashAccordionPayload,
} from "@/components/dash-accordion-data";

type DashAccordionProps = {
  payload: DashAccordionPayload;
  savedOpen: number | null | undefined;
  onOpenChange: (idx: number | null) => void;
};

function readCurrentTone(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return resolveNavTone(
    root.getAttribute("data-mode"),
    root.getAttribute("data-theme"),
    prefersDark
  );
}

function MeterCell({
  value,
  severity,
}: {
  value: number | null;
  severity: boolean;
}) {
  if (value == null) return <span className="muted">—</span>;
  const cls = getMeterSeverityClass(value, severity);
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="meter-cell">
      <span className={`meter${cls ? ` ${cls}` : ""}`}>
        <i style={{ width: `${clamped}%` }} />
      </span>
      <span>{value}%</span>
    </div>
  );
}

export default function DashAccordion({
  payload,
  savedOpen,
  onOpenChange,
}: DashAccordionProps) {
  const [tone, setTone] = useState<"light" | "dark">(readCurrentTone);
  const [openIdx, setOpenIdx] = useState<number | null>(() =>
    resolveOpenAccordionIndex(savedOpen)
  );
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenIdx(resolveOpenAccordionIndex(savedOpen));
  }, [savedOpen]);

  useEffect(() => {
    const syncTone = () => setTone(readCurrentTone());
    const observer = new MutationObserver(syncTone);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "data-theme"],
    });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", syncTone);
    return () => {
      observer.disconnect();
      mq?.removeEventListener?.("change", syncTone);
    };
  }, []);

  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const draw = () => {
      const fn = (window as unknown as { __tugunDrawDashLine?: (el: HTMLElement) => void })
        .__tugunDrawDashLine;
      if (fn) fn(el);
    };
    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [payload, openIdx]);

  const items: LiquidAccordionItem[] = useMemo(() => {
    const meta = buildAccordionMeta(payload);
    const maxDeptTotal = Math.max(1, ...payload.deptBars.map((x) => x.total));
    const maxLoad = Math.max(1, ...payload.load.map((x) => x.total));

    const chartsNode = (
      <div className="dash-acc-charts">
        <div className="dash-acc-col">
          <div className="dash-acc-subhead">
            <h4>Bo'limlar bo'yicha tasklar</h4>
            <p className="dash-acc-desc">
              Har bir bo'lim qatnashayotgan tasklar holati bilan.
            </p>
          </div>
          <div className="viz-legend">
            {payload.stateLegend.map((st) => (
              <span key={st.key}>
                <i className={`key k-${st.key}`} />
                {st.label}
              </span>
            ))}
          </div>
          <div className="sbars">
            {payload.deptBars.length ? (
              payload.deptBars.map((row) => (
                <div
                  key={row.deptId}
                  className="sbar-row"
                  tabIndex={0}
                  data-tip={row.tip}
                  data-tip-rows={row.tipRows}
                  aria-label={row.ariaLabel}
                >
                  <span className="sbar-name">
                    {row.deptName}
                    <small>{row.branchName}</small>
                  </span>
                  <span className="sbar-track">
                    {row.total ? (
                      <>
                        <span
                          className="sbar-bar"
                          style={{ width: calcBarWidthPct(row.total, maxDeptTotal) }}
                        >
                          {row.segments.map((seg) => (
                            <span
                              key={seg.key}
                              className={`seg k-${seg.key}`}
                              style={{ flex: `${seg.count} 1 0` }}
                              data-tip={seg.tip}
                              data-tip-value={seg.tipValue}
                              data-tip-key={`k-${seg.key}`}
                            />
                          ))}
                        </span>
                        <span className="sbar-val">{row.total}</span>
                      </>
                    ) : (
                      <span className="sbar-empty">Task yo'q</span>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">Bo'lim yo'q.</p>
            )}
          </div>
        </div>

        <div className="dash-acc-col">
          <div className="dash-acc-subhead">
            <h4>Kunlik davomat</h4>
            <p className="dash-acc-desc">
              Ish kunlarida kelgan xodimlar ulushi, {payload.monthName}.
            </p>
          </div>
          {payload.lineSeries.length > 1 && (
            <div className="viz-legend">
              {payload.lineSeries.map((s) => (
                <span key={s.name}>
                  <i className={`key line k-s${s.slot}`} />
                  {s.name}
                </span>
              ))}
            </div>
          )}
          {payload.attTable.monthLoaded || payload.attTable.conn !== "live" ? (
            <div
              className="linechart"
              id="dash-line"
              ref={lineRef}
              tabIndex={0}
              role="img"
              aria-label={`Kunlik davomat grafigi, ${payload.monthName}. Batafsil jadval pastdagi bo'limda.`}
            />
          ) : (
            <p className="loading">Ma'lumotlar yuklanmoqda…</p>
          )}
        </div>
      </div>
    );

    const upcomingNode = (
      <div className="dash-acc-body">
        <p className="dash-acc-desc">
          Muddati o'tgan va keyingi 14 kunda tugaydigan tasklar.
        </p>
        {payload.upcoming.length ? (
          <ul className="upcoming">
            {payload.upcoming.map((t) => (
              <li key={t.id}>
                <span className="cal">
                  <b>{t.dayNum}</b>
                  <small>{t.monthShort}</small>
                </span>
                <span className="up-main">
                  <button
                    type="button"
                    className="link"
                    data-action="open-task"
                    data-id={t.id}
                  >
                    {t.title}
                  </button>
                  {t.ownerName ? (
                    <span className="owner" title={`Mas'ul: ${t.ownerName}`}>
                      <span className="av xs">{t.ownerInitials || "?"}</span>
                      <span>{t.ownerName}</span>
                    </span>
                  ) : (
                    <span className="owner none" title="Mas'ul tayinlanmagan">
                      Mas'ul yo'q
                    </span>
                  )}
                  <span className="chips">
                    {t.depts.map((d, idx) => (
                      <span className="chip" key={`${t.id}-d-${idx}`}>
                        {d.name}
                        <small>{d.branchName}</small>
                      </span>
                    ))}
                  </span>
                </span>
                <span className="up-side">
                  <span className={`pill s-${t.stateKey}`}>{t.stateLabel}</span>
                  <span className={`due ${t.dueCls}`}>{t.dueText}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Yaqin ikki haftada tugaydigan task yo'q.</p>
        )}
      </div>
    );

    const rankedNode = (
      <div className="dash-acc-body">
        <p className="dash-acc-desc">
          Faollik balli: bu oy davomati va faol tasklar o'rtacha
          bajarilishining o'rtachasi. Faol taski yo'q bo'limda faqat davomat
          olinadi.
        </p>
        <div className="table-scroll">
          <table className="activity">
            <thead>
              <tr>
                <th>#</th>
                <th>Bo'lim</th>
                <th className="num">Xodim</th>
                <th className="num">Faol task</th>
                <th className="num">Bajarilgan</th>
                <th>O'rtacha bajarilish</th>
                <th className="num">Muddati o'tgan</th>
                <th>Oylik davomat</th>
                <th className="num">Kechikishlar</th>
                <th className="num">Ishlangan</th>
                <th className="num">Faollik balli</th>
              </tr>
            </thead>
            <tbody>
              {payload.ranked.map((x) => (
                <tr key={x.deptId}>
                  <td>
                    <span className="rank">{x.rank}</span>
                  </td>
                  <td>
                    <a className="chip" href={`#bolim-${x.deptId}`}>
                      {x.deptName}
                      <small>{x.branchName}</small>
                    </a>
                  </td>
                  <td className="num">{x.staff}</td>
                  <td className="num">{x.active}</td>
                  <td className="num">{x.done}</td>
                  <td>
                    <MeterCell value={x.avg} severity={false} />
                  </td>
                  <td className="num">
                    {x.overdue ? (
                      <span className="flag-dot">{x.overdue}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <MeterCell value={x.rate} severity={true} />
                  </td>
                  <td className="num">{x.late || "—"}</td>
                  <td className="num">{x.hours} s</td>
                  <td className="num">
                    <span className="score">{x.score ?? "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    const workloadNode = (
      <div className="dash-acc-body">
        <p className="dash-acc-desc">
          Eng ko'p faol taskka ega 10 xodim.{" "}
          {payload.idleCount
            ? `${payload.idleCount} xodimda hozir faol task yo'q.`
            : "Hammaning faol taski bor."}
        </p>
        <div className="viz-legend">
          <span>
            <i className="key k-own" />
            Mas'ul
          </span>
          <span>
            <i className="key k-exec" />
            Ijrochi
          </span>
        </div>
        <div className="sbars">
          {payload.load.length ? (
            payload.load.map((x) => {
              const tipRows = JSON.stringify([
                ["k-own", `${x.own} ta`, "mas'ul"],
                ["k-exec", `${x.exec} ta`, "ijrochi"],
              ]);
              return (
                <div
                  key={x.personId}
                  className="sbar-row"
                  tabIndex={0}
                  data-tip={x.personName}
                  data-tip-rows={tipRows}
                  aria-label={`${x.personName}: ${x.own} ta taskda mas'ul, ${x.exec} ta taskda ijrochi`}
                >
                  <span className="sbar-name">
                    <button
                      type="button"
                      className="link"
                      data-action="open-person"
                      data-id={x.personId}
                    >
                      {x.shortName}
                    </button>
                    <small>{x.deptName}</small>
                  </span>
                  <span className="sbar-track">
                    <span
                      className="sbar-bar"
                      style={{ width: calcBarWidthPct(x.total, maxLoad) }}
                    >
                      {x.own > 0 && (
                        <span
                          className="seg k-own"
                          style={{ flex: `${x.own} 1 0` }}
                        />
                      )}
                      {x.exec > 0 && (
                        <span
                          className="seg k-exec"
                          style={{ flex: `${x.exec} 1 0` }}
                        />
                      )}
                    </span>
                    <span className="sbar-val">{x.total}</span>
                  </span>
                </div>
              );
            })
          ) : (
            <p className="muted">Faol task yo'q.</p>
          )}
        </div>
      </div>
    );

    const feedNode = (
      <div className="dash-acc-body">
        <p className="dash-acc-desc">
          Oxirgi 7 kundagi o'zgarishlar: yangi tasklar, izohlar, holatlar va
          davomat tuzatishlari.
        </p>
        {payload.acts.length ? (
          <ul className="feed dash-acc-feed">
            {payload.acts.map((e, idx) => (
              <li className="feed-item" key={`act-${idx}`}>
                {e.isStaff ? (
                  <span className="av sm" title={e.byName}>
                    {e.byInitials}
                  </span>
                ) : (
                  <span className="av sm sys">{e.byInitials}</span>
                )}
                <span className="fi-body">
                  <span className="fi-txt">
                    <b>{e.byName}</b>{" "}
                    {e.taskId ? (
                      <button
                        type="button"
                        className="link-plain"
                        data-action="open-task"
                        data-id={e.taskId}
                      >
                        {e.txt}
                      </button>
                    ) : (
                      e.txt
                    )}
                  </span>
                  <span className="fi-time">{e.timeAgo}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Hali faoliyat yo'q.</p>
        )}
      </div>
    );

    const attTableNode = (
      <div className="dash-acc-body">
        <p className="dash-acc-desc">
          Ish kunlari bo'yicha tarmoqlar kesimidagi davomat foizi,{" "}
          {payload.monthName}.
        </p>
        {!payload.attTable.monthLoaded && payload.attTable.conn === "live" ? (
          <p className="loading">Ma'lumotlar yuklanmoqda…</p>
        ) : payload.attTable.rows.length ? (
          <div className="table-scroll">
            <table className="activity dash-att-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  {payload.attTable.seriesNames.map((name, idx) => (
                    <th className="num" key={`ser-${idx}`}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payload.attTable.rows.map((r, idx) => (
                  <tr key={`row-${idx}`}>
                    <td>{r.dateLabel}</td>
                    {r.values.map((v, j) => (
                      <td className="num" key={`cell-${idx}-${j}`}>
                        {formatPercent(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Bu oyda hali ish kuni yo'q.</p>
        )}
      </div>
    );

    const answers = [
      chartsNode,
      upcomingNode,
      rankedNode,
      workloadNode,
      feedNode,
      attTableNode,
    ];
    return meta.map((m, idx) => ({
      id: m.id,
      question: m.question,
      answer: answers[idx],
    }));
  }, [payload]);

  return (
    <LiquidAccordion
      items={items}
      open={openIdx}
      onOpenChange={(next) => {
        setOpenIdx(next);
        onOpenChange(next);
      }}
      collapsible={true}
      tone={tone}
      sound={false}
      headingLevel={3}
      className="tugun-dash-accordion"
      style={{ maxWidth: "100%" }}
    />
  );
}

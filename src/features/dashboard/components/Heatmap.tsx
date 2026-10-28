"use client";

import { useState } from "react";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({
  matrix,
  max,
  accent = "var(--bq-info)",
}: {
  matrix: number[][];
  max: number;
  accent?: string;
}) {
  const [fullDay, setFullDay] = useState(false);
  const hours = fullDay ? HOURS : HOURS.slice(8, 20);
  if (max === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-[var(--bq-t3)]">
        Sem dados no período
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div>
        <button
          type="button"
          className="mb-2 text-[10px] text-[var(--bq-t3)] hover:text-[var(--bq-t1)]"
          aria-pressed={fullDay}
          onClick={() => setFullDay(!fullDay)}
        >
          {fullDay ? "Ver 08h–20h" : "Ver as 24 horas"}
        </button>
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `30px repeat(${hours.length}, minmax(0,1fr))`,
          }}
        >
          <div />
          {hours.map((h) => (
            <div
              key={h}
              className="text-center text-[9px] tabular-nums text-[var(--bq-t3)]"
            >
              {h % 2 === 0 ? `${h}h` : ""}
            </div>
          ))}

          {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
            <Row
              key={dow}
              label={DOW[dow]}
              dow={dow}
              hours={hours}
              matrix={matrix}
              max={max}
              accent={accent}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-[var(--bq-t3)]">
          <span>menos</span>
          {[0.1, 0.3, 0.5, 0.75, 1].map((o, i) => (
            <div
              key={i}
              className="h-2.5 w-3 rounded-sm"
              style={{ backgroundColor: accent, opacity: o }}
            />
          ))}
          <span>mais</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  dow,
  matrix,
  max,
  accent,
  hours,
}: {
  label: string;
  dow: number;
  hours: number[];
  matrix: number[][];
  max: number;
  accent: string;
}) {
  return (
    <>
      <div className="pr-1 text-right text-[10px] font-medium text-[var(--bq-t3)]">
        {label}
      </div>
      {hours.map((h) => {
        const v = matrix[dow][h];
        const opacity = v === 0 ? 0.04 : 0.15 + (v / max) * 0.85;
        return (
          <div
            key={h}
            className="group relative h-[18px] rounded-[3px] transition-opacity hover:opacity-100"
            style={{ backgroundColor: accent, opacity }}
            title={`${label} ${h}h: ${v} conversa${v === 1 ? "" : "s"}`}
          />
        );
      })}
    </>
  );
}

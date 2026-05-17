'use client';

/**
 * Sprint S18 Wave 3 Fase 3 — Dev-only test page pro OklchColorPicker.
 *
 * Sem Storybook no projeto, esta pagina serve como "playground" pra QA
 * visual do picker. Acessar em `/settings/appearance/_picker-test`.
 *
 * Em producao, a Fase 4 vai consumir o picker via /builder. Esta page
 * fica como showcase de 4 estados (primary, accent, success, danger)
 * incluindo um swatch desabilitado.
 */

import { useState } from 'react';
import { OklchColorPicker } from '@/features/theme/components/oklch-color-picker';

export default function OklchPickerTestPage() {
  const [primary, setPrimary] = useState('oklch(0.22 0.04 250)');
  const [accent, setAccent] = useState('oklch(0.62 0.16 35)');
  const [success, setSuccess] = useState('oklch(0.6 0.13 150)');
  const [danger, setDanger] = useState('oklch(0.577 0.245 27.325)');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          OklchColorPicker — Dev Playground
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sprint S18 Wave 3 Fase 3. Picker standalone com sliders L/C/H +
          input dual OKLCH/hex + swatch preview + WCAG AA badge.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <OklchColorPicker
          label="Cor primaria (light)"
          value={primary}
          onChange={setPrimary}
          mode="light"
        />
        <OklchColorPicker
          label="Cor accent (light)"
          value={accent}
          onChange={setAccent}
          mode="light"
        />
        <OklchColorPicker
          label="Cor success (contra surface light)"
          value={success}
          onChange={setSuccess}
          mode="light"
        />
        <OklchColorPicker
          label="Cor danger (light) — DESABILITADO"
          value={danger}
          onChange={setDanger}
          mode="light"
          disabled
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Estado atual</h2>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 font-mono text-[11px] text-zinc-100">
          {JSON.stringify({ primary, accent, success, danger }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

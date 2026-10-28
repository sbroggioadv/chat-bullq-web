'use client';

import { SegmentedControl } from '@/components/ui/foundation';
import type { Period } from '@/features/ai-agents/services/ai-agents.service';

export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (next: Period) => void;
}) {
  return (
    <SegmentedControl
      label="Período das execuções"
      value={value}
      onChange={onChange}
      options={[
        { value: '24h', label: '24h' },
        { value: '7d', label: '7 dias' },
        { value: '30d', label: '30 dias' },
      ]}
    />
  );
}

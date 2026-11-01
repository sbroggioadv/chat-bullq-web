import type { SVGProps } from 'react';

export function SynqSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20 3H9a6 6 0 0 0-6 6v3h13V8H9a1 1 0 0 1 1-1h10z" />
      <path d="M4 21h11a6 6 0 0 0 6-6v-3H8v4h7a1 1 0 0 1-1 1H4z" />
    </svg>
  );
}

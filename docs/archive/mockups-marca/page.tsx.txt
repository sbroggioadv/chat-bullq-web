import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mockups · Direções de Marca · Bull',
  description: 'Comparativo de 3 direções visuais para Chat Bull / Sbroggio.',
};

type BrandPreview = {
  slug: string;
  label: string;
  vibe: string;
  description: string;
  swatches: string[];
  type: string;
};

const BRANDS: BrandPreview[] = [
  {
    slug: 'brand-a',
    label: 'A · Sbroggio Graphite',
    vibe: 'Sério-corporate · advocacia premium',
    description:
      'Navy graphite + terracota. Serif premium (Crimson Pro / fallback Tiempos) + Geist Sans. Mattos Filho / TozziniFreire.',
    swatches: ['#1c2740', '#c75230', '#f3ede4', '#0e1521'],
    type: 'Serif + Sans · Warm neutrals',
  },
  {
    slug: 'brand-b',
    label: 'B · Plain Tech',
    vibe: 'Moderno-tech · IA-first produtivo',
    description:
      'Electric green + cyan. Inter Display tracking apertado + Geist Mono. Plain.com / Linear / Pylon.',
    swatches: ['#16a34a', '#0ea5e9', '#0b0d10', '#f5f7fa'],
    type: 'Sans tight · Mono metadata',
  },
  {
    slug: 'brand-c',
    label: 'C · Stripe Paper',
    vibe: 'Minimal-premium · precisão software',
    description:
      'Paper white + charcoal + rose vivid. Geist Sans + Geist Mono. Stripe Dashboard / Vercel.',
    swatches: ['#0a0a0a', '#e5484d', '#fafafa', '#e5e7eb'],
    type: 'Geist puro · Chroma zero',
  },
];

export default function MockupsIndexPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:py-24">
        <header className="mb-14 border-b border-zinc-800 pb-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Bravy · Frontend Engineer · 2026-05-13
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            3 direções de marca · escolha uma
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
            Cada direção mostra a mesma estrutura (login + inbox) com identidade visual
            diferente. Tokens locais, sem alterar globals.css. Abra cada uma, navegue, decida.
          </p>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BRANDS.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/mockups/${brand.slug}`}
                className="group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:border-zinc-600 hover:bg-zinc-900"
              >
                <div className="grid grid-cols-4">
                  {brand.swatches.map((color, i) => (
                    <div
                      key={`${brand.slug}-sw-${i}`}
                      className="h-24"
                      style={{ background: color }}
                      aria-hidden
                    />
                  ))}
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {brand.vibe}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                    {brand.label}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {brand.description}
                  </p>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {brand.type}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-zinc-200 transition group-hover:text-white">
                    Abrir mockup
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-16 border-t border-zinc-800 pt-8 text-xs leading-relaxed text-zinc-500">
          <p>
            Cliente final: <span className="text-zinc-300">Sbroggio Advocacia Empresarial &amp; Franchising</span> · São José do Rio Preto / SP.
          </p>
          <p className="mt-1">
            Conteúdo mockado · Maria Alice / Lucas / João / Cliente X / Cliente Y · zero PII real.
          </p>
        </footer>
      </div>
    </main>
  );
}

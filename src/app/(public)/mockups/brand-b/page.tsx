import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Inter, Geist_Mono } from 'next/font/google';

const display = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--brand-b-sans',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--brand-b-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'B · Plain Tech · Mockup',
};

// ---------- Tokens locais ----------
const tokens = {
  '--bg': 'oklch(0.99 0.003 240)',
  '--bg-elev': 'oklch(1 0 0)',
  '--surface': 'oklch(1 0 0)',
  '--surface-2': 'oklch(0.975 0.003 240)',
  '--fg': 'oklch(0.18 0.01 240)',
  '--fg-muted': 'oklch(0.44 0.008 240)',
  '--fg-subtle': 'oklch(0.6 0.005 240)',
  '--border': 'oklch(0.92 0.005 240)',
  '--border-strong': 'oklch(0.84 0.008 240)',
  // Marca
  '--primary': 'oklch(0.55 0.22 145)', // electric green
  '--primary-hover': 'oklch(0.5 0.22 145)',
  '--primary-fg': 'oklch(0.99 0 0)',
  '--primary-soft': 'oklch(0.95 0.06 145)',
  '--accent': 'oklch(0.58 0.2 220)', // cyan electric
  '--accent-soft': 'oklch(0.95 0.04 220)',
  // Estado
  '--success': 'oklch(0.6 0.18 150)',
  '--warning': 'oklch(0.78 0.16 80)',
  // Radius
  '--r-sm': '6px',
  '--r-md': '8px',
  '--r-lg': '12px',
} as CSSProperties;

const conversations = [
  {
    id: '1',
    name: 'Maria Alice',
    handle: 'wa · cliente',
    preview: 'Doc, contrato da franquia chegou assinado. Pode revisar?',
    time: '2m',
    unread: 2,
    selected: true,
    status: 'active',
  },
  {
    id: '2',
    name: 'Lucas Pereira',
    handle: 'wa · prospect',
    preview: 'Bom dia. Tenho dúvida sobre RJ empresarial.',
    time: '14m',
    unread: 0,
    selected: false,
    status: 'idle',
  },
  {
    id: '3',
    name: 'João Henrique',
    handle: 'wa · cliente · retoposto',
    preview: 'Reunião confirmada 16h. Levo o material.',
    time: '1h',
    unread: 1,
    selected: false,
    status: 'active',
  },
  {
    id: '4',
    name: 'Cliente X',
    handle: 'wa · empresarial',
    preview: 'Notificação do CADE. Precisamos conversar.',
    time: '1d',
    unread: 0,
    selected: false,
    status: 'snoozed',
  },
  {
    id: '5',
    name: 'Cliente Y',
    handle: 'wa · franchising',
    preview: 'Obrigada. COF ficou impecável.',
    time: '1d',
    unread: 0,
    selected: false,
    status: 'closed',
  },
];

const messages = [
  {
    id: 'm1',
    from: 'them',
    body: 'Doc, boa tarde. O contrato da franquia chegou assinado pelo franqueado.',
    time: '14:28',
  },
  {
    id: 'm2',
    from: 'them',
    body: 'Anexei aqui. Quando puder dar uma última lida, te agradeço.',
    time: '14:29',
  },
  {
    id: 'm3',
    from: 'me',
    body: 'Recebido. Olho até o fim do dia. Arquiva como Franchising · 2026 · Cliente Y.',
    time: '14:32',
    via: 'AI · suggested',
  },
];

export default function BrandBPage() {
  return (
    <div
      className={`${display.variable} ${mono.variable} min-h-screen antialiased`}
      style={{
        ...tokens,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--brand-b-sans), system-ui, sans-serif',
        letterSpacing: '-0.005em',
      }}
    >
      <BrandHeader />
      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 lg:grid-cols-2">
        <LoginSide />
        <InboxSide />
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <header
      className="flex h-14 items-center justify-between border-b px-6 lg:px-10"
      style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)]"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-fg)',
          }}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M3 3h4v4H3V3zm6 0h4v4H9V3zM3 9h4v4H3V9zm6 2.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z" />
          </svg>
        </div>
        <span
          className="text-[15px] font-semibold tracking-[-0.015em]"
          style={{ color: 'var(--fg)' }}
        >
          Bull
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]"
          style={{
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            fontFamily: 'var(--brand-b-mono), monospace',
          }}
        >
          beta
        </span>
      </div>

      <nav className="flex items-center gap-5 text-sm">
        <a
          href="/mockups"
          className="text-xs font-medium transition hover:opacity-70"
          style={{
            color: 'var(--fg-muted)',
            fontFamily: 'var(--brand-b-mono), monospace',
          }}
        >
          ← /mockups
        </a>
        <span
          className="hidden text-xs sm:inline"
          style={{
            color: 'var(--fg-subtle)',
            fontFamily: 'var(--brand-b-mono), monospace',
          }}
        >
          brand/b
        </span>
      </nav>
    </header>
  );
}

function LoginSide() {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden px-6 py-16 lg:px-16"
      style={{ background: 'var(--bg)' }}
    >
      {/* Grid pattern de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage:
            'radial-gradient(circle at 50% 50%, black 30%, transparent 70%)',
        }}
      />
      {/* Glow primary */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--primary)' }}
      />

      <div className="relative w-full max-w-md">
        <div
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'var(--bg-elev)',
            fontFamily: 'var(--brand-b-mono), monospace',
            color: 'var(--fg-muted)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--primary)' }}
          />
          status: online · 12ms
        </div>

        <h1
          className="text-[44px] font-bold leading-[1.02] tracking-[-0.03em] lg:text-5xl"
          style={{ color: 'var(--fg)' }}
        >
          Atendimento IA-first.
          <br />
          <span style={{ color: 'var(--primary)' }}>Sem perder o humano.</span>
        </h1>

        <p
          className="mt-5 max-w-sm text-base leading-relaxed"
          style={{ color: 'var(--fg-muted)' }}
        >
          Painel multi-canal pra advogados que tratam atendimento como infraestrutura.
          Triagem, sugestões e arquivamento via IA — você decide o que vai pro cliente.
        </p>

        <form className="mt-10 space-y-4">
          <label className="block">
            <span
              className="mb-1.5 block text-[11px] font-medium"
              style={{
                color: 'var(--fg-muted)',
                fontFamily: 'var(--brand-b-mono), monospace',
              }}
            >
              email
            </span>
            <input
              type="email"
              defaultValue="doc@sbroggio.adv.br"
              className="w-full rounded-[var(--r-sm)] border bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none transition"
              style={{
                borderColor: 'var(--border-strong)',
                color: 'var(--fg)',
              }}
            />
          </label>

          <label className="block">
            <span
              className="mb-1.5 block text-[11px] font-medium"
              style={{
                color: 'var(--fg-muted)',
                fontFamily: 'var(--brand-b-mono), monospace',
              }}
            >
              password
            </span>
            <input
              type="password"
              defaultValue="••••••••••••"
              className="w-full rounded-[var(--r-sm)] border bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--border-strong)',
                color: 'var(--fg)',
              }}
            />
          </label>

          <div className="flex items-center justify-between text-sm">
            <label
              className="flex items-center gap-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              <input type="checkbox" className="rounded" />
              <span className="text-xs">Lembrar deste device</span>
            </label>
            <a
              href="#"
              className="text-xs font-medium"
              style={{
                color: 'var(--primary)',
                fontFamily: 'var(--brand-b-mono), monospace',
              }}
            >
              reset →
            </a>
          </div>

          <button
            type="button"
            className="mt-2 w-full rounded-[var(--r-sm)] px-4 py-3 text-sm font-semibold transition"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
          >
            Entrar →
          </button>

          <div
            className="flex items-center gap-3 text-xs"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--brand-b-mono), monospace' }}>or</span>
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          </div>

          <button
            type="button"
            className="w-full rounded-[var(--r-sm)] border bg-transparent px-4 py-2.5 text-sm font-medium transition"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--fg)',
            }}
          >
            SSO institucional
          </button>
        </form>

        <p
          className="mt-10 text-[11px]"
          style={{
            color: 'var(--fg-subtle)',
            fontFamily: 'var(--brand-b-mono), monospace',
          }}
        >
          sbroggio.adv.br · oab/sp 323.065 · confidencial
        </p>
      </div>
    </section>
  );
}

function InboxSide() {
  return (
    <section
      className="grid grid-cols-[300px_1fr] border-l"
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <ConversationList />
      <ThreadPanel />
    </section>
  );
}

function ConversationList() {
  return (
    <div
      className="flex flex-col border-r"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div
        className="space-y-3 border-b px-4 py-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-[13px] font-semibold tracking-[-0.01em]"
            style={{ color: 'var(--fg)' }}
          >
            Inbox
          </h2>
          <span
            className="text-[10px]"
            style={{
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--brand-b-mono), monospace',
            }}
          >
            5 total · 3 new
          </span>
        </div>

        <div className="flex gap-1">
          {['All', 'Mine', 'Unread', 'AI'].map((tab, i) => (
            <button
              key={tab}
              type="button"
              className="rounded-[var(--r-sm)] px-2.5 py-1 text-[11px] font-medium transition"
              style={{
                background: i === 0 ? 'var(--surface-2)' : 'transparent',
                color: i === 0 ? 'var(--fg)' : 'var(--fg-muted)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <li key={conv.id}>
            <button
              type="button"
              className="block w-full px-4 py-3 text-left transition"
              style={{
                background: conv.selected ? 'var(--primary-soft)' : 'transparent',
                borderLeft: conv.selected
                  ? '2px solid var(--primary)'
                  : '2px solid transparent',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusDot status={conv.status} />
                  <span
                    className="truncate text-[13px]"
                    style={{
                      color: 'var(--fg)',
                      fontWeight: conv.unread > 0 ? 600 : 500,
                    }}
                  >
                    {conv.name}
                  </span>
                </div>
                <span
                  className="shrink-0 text-[10px]"
                  style={{
                    color: 'var(--fg-subtle)',
                    fontFamily: 'var(--brand-b-mono), monospace',
                  }}
                >
                  {conv.time}
                </span>
              </div>
              <p
                className="mt-0.5 truncate text-xs leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                {conv.preview}
              </p>
              <p
                className="mt-1 text-[10px]"
                style={{
                  color: 'var(--fg-subtle)',
                  fontFamily: 'var(--brand-b-mono), monospace',
                }}
              >
                {conv.handle}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'active'
      ? 'var(--primary)'
      : status === 'idle'
      ? 'var(--warning)'
      : status === 'snoozed'
      ? 'var(--accent)'
      : 'var(--fg-subtle)';
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: color }}
      aria-hidden
    />
  );
}

function ThreadPanel() {
  return (
    <div className="flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center justify-between border-b px-6 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
          >
            MA
          </div>
          <div>
            <p
              className="text-[13px] font-semibold tracking-[-0.01em]"
              style={{ color: 'var(--fg)' }}
            >
              Maria Alice
            </p>
            <p
              className="text-[10px]"
              style={{
                color: 'var(--fg-subtle)',
                fontFamily: 'var(--brand-b-mono), monospace',
              }}
            >
              +55 17 99788-7713 · whatsapp:cloud · sla 1h
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              fontFamily: 'var(--brand-b-mono), monospace',
            }}
          >
            ● active
          </span>
          <button
            type="button"
            className="rounded-[var(--r-sm)] border px-2.5 py-1 text-[11px] font-medium transition"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
          >
            Snooze
          </button>
          <button
            type="button"
            className="rounded-[var(--r-sm)] border px-2.5 py-1 text-[11px] font-medium transition"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
          >
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="text-center">
          <span
            className="rounded-full border px-3 py-1 text-[10px]"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--brand-b-mono), monospace',
            }}
          >
            today · 14:28
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[78%]">
              {msg.via && (
                <div
                  className="mb-1 flex items-center justify-end gap-1 text-[10px]"
                  style={{
                    color: 'var(--accent)',
                    fontFamily: 'var(--brand-b-mono), monospace',
                  }}
                >
                  ✦ {msg.via}
                </div>
              )}
              <div
                className="px-3.5 py-2.5"
                style={{
                  background:
                    msg.from === 'me' ? 'var(--primary)' : 'var(--surface)',
                  color: msg.from === 'me' ? 'var(--primary-fg)' : 'var(--fg)',
                  border:
                    msg.from === 'me'
                      ? 'none'
                      : `1px solid var(--border)`,
                  borderRadius: 'var(--r-md)',
                }}
              >
                <p className="text-[13px] leading-relaxed">{msg.body}</p>
                <p
                  className="mt-1 text-right text-[10px]"
                  style={{
                    color:
                      msg.from === 'me'
                        ? 'oklch(0.92 0.05 145)'
                        : 'var(--fg-subtle)',
                    fontFamily: 'var(--brand-b-mono), monospace',
                  }}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* AI suggestion card */}
        <div
          className="rounded-[var(--r-md)] border-2 border-dashed p-3"
          style={{
            borderColor: 'var(--accent)',
            background: 'var(--accent-soft)',
          }}
        >
          <p
            className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color: 'var(--accent)',
              fontFamily: 'var(--brand-b-mono), monospace',
            }}
          >
            ✦ AI sugere · próxima ação
          </p>
          <p className="text-[13px]" style={{ color: 'var(--fg)' }}>
            Arquivar como{' '}
            <code
              className="rounded px-1.5 py-0.5"
              style={{
                background: 'var(--surface)',
                fontFamily: 'var(--brand-b-mono), monospace',
                fontSize: '11px',
              }}
            >
              Franchising/2026/Cliente Y
            </code>{' '}
            e marcar como resolvido?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-[var(--r-sm)] px-3 py-1.5 text-[11px] font-semibold"
              style={{
                background: 'var(--accent)',
                color: 'var(--primary-fg)',
              }}
            >
              Aplicar
            </button>
            <button
              type="button"
              className="rounded-[var(--r-sm)] px-3 py-1.5 text-[11px] font-semibold"
              style={{
                background: 'transparent',
                color: 'var(--fg-muted)',
              }}
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>

      <div
        className="border-t px-6 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="flex items-end gap-2 rounded-[var(--r-md)] border px-3 py-2"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <textarea
            rows={1}
            placeholder="Type a reply… / use ✦ for AI"
            className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:opacity-50"
            style={{ color: 'var(--fg)' }}
            defaultValue=""
          />
          <button
            type="button"
            className="rounded-[var(--r-sm)] px-3 py-1.5 text-[11px] font-semibold transition"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
          >
            Send ⏎
          </button>
        </div>
      </div>
    </div>
  );
}

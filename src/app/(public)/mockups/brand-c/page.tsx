import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

const sans = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--brand-c-sans',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--brand-c-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'C · Stripe Paper · Mockup',
};

// ---------- Tokens locais — chroma quase zero, 1 accent vivo ----------
const tokens = {
  '--bg': 'oklch(0.99 0 0)',
  '--bg-elev': 'oklch(1 0 0)',
  '--surface': 'oklch(1 0 0)',
  '--surface-2': 'oklch(0.975 0 0)',
  '--fg': 'oklch(0.18 0 0)',
  '--fg-muted': 'oklch(0.42 0 0)',
  '--fg-subtle': 'oklch(0.6 0 0)',
  '--border': 'oklch(0.92 0 0)',
  '--border-strong': 'oklch(0.84 0 0)',
  // Marca
  '--primary': 'oklch(0.22 0 0)', // charcoal puro
  '--primary-hover': 'oklch(0.32 0 0)',
  '--primary-fg': 'oklch(0.99 0 0)',
  // 1 accent vivo
  '--accent': 'oklch(0.64 0.22 22)', // rose-vivid
  '--accent-soft': 'oklch(0.96 0.04 22)',
  // Estado
  '--success': 'oklch(0.62 0.16 150)',
  // Radius — sutil
  '--r-sm': '6px',
  '--r-md': '8px',
  '--r-lg': '10px',
} as CSSProperties;

const conversations = [
  {
    id: '1',
    name: 'Maria Alice',
    preview: 'Doc, contrato da franquia chegou assinado. Pode revisar?',
    time: '2 min',
    unread: 2,
    selected: true,
    channel: 'WhatsApp',
  },
  {
    id: '2',
    name: 'Lucas Pereira',
    preview: 'Bom dia. Dúvida sobre RJ empresarial.',
    time: '14 min',
    unread: 0,
    selected: false,
    channel: 'WhatsApp',
  },
  {
    id: '3',
    name: 'João Henrique',
    preview: 'Reunião confirmada 16h.',
    time: '1 h',
    unread: 1,
    selected: false,
    channel: 'WhatsApp',
  },
  {
    id: '4',
    name: 'Cliente X',
    preview: 'Notificação do CADE. Precisamos conversar.',
    time: '1 d',
    unread: 0,
    selected: false,
    channel: 'WhatsApp',
  },
  {
    id: '5',
    name: 'Cliente Y',
    preview: 'COF ficou impecável, obrigada.',
    time: '1 d',
    unread: 0,
    selected: false,
    channel: 'Email',
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
  },
];

export default function BrandCPage() {
  return (
    <div
      className={`${sans.variable} ${mono.variable} min-h-screen antialiased`}
      style={{
        ...tokens,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--brand-c-sans), system-ui, sans-serif',
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
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)]"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-fg)',
          }}
        >
          <span className="text-[13px] font-semibold tracking-tight">B</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: 'var(--fg)' }}
          >
            Bull
          </span>
          <span
            className="text-[11px]"
            style={{
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--brand-c-mono), monospace',
            }}
          >
            workspace · sbroggio
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-5 text-sm">
        <a
          href="/mockups"
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: 'var(--fg-muted)' }}
        >
          ← Voltar
        </a>
        <span
          className="hidden text-[11px] sm:inline"
          style={{
            color: 'var(--fg-subtle)',
            fontFamily: 'var(--brand-c-mono), monospace',
          }}
        >
          Direção C · Paper
        </span>
      </nav>
    </header>
  );
}

function LoginSide() {
  return (
    <section
      className="relative flex items-center justify-center px-6 py-16 lg:px-16"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="relative w-full max-w-md">
        <div
          className="mb-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px]"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--fg-muted)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--success)' }}
          />
          Bull · todos os sistemas operacionais
        </div>

        <h1
          className="text-[42px] font-semibold leading-[1.05] tracking-[-0.025em] lg:text-5xl"
          style={{ color: 'var(--fg)' }}
        >
          Entre na sua banca.
        </h1>

        <p
          className="mt-4 max-w-sm text-[15px] leading-relaxed"
          style={{ color: 'var(--fg-muted)' }}
        >
          O painel de atendimento da Sbroggio Advocacia. Confidencial por padrão.
        </p>

        <form className="mt-10">
          <div
            className="overflow-hidden rounded-[var(--r-md)] border bg-[var(--surface)]"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            <label className="block border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <span
                className="mb-0.5 block text-[11px] font-medium"
                style={{ color: 'var(--fg-subtle)' }}
              >
                E-mail
              </span>
              <input
                type="email"
                defaultValue="doc@sbroggio.adv.br"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: 'var(--fg)' }}
              />
            </label>

            <label className="block px-4 py-3">
              <span
                className="mb-0.5 block text-[11px] font-medium"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Senha
              </span>
              <input
                type="password"
                defaultValue="••••••••••••"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: 'var(--fg)' }}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <label
              className="flex items-center gap-2 text-xs"
              style={{ color: 'var(--fg-muted)' }}
            >
              <input type="checkbox" />
              Manter conectado
            </label>
            <a
              href="#"
              className="text-xs font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Esqueci a senha
            </a>
          </div>

          <button
            type="button"
            className="mt-5 w-full rounded-[var(--r-md)] px-4 py-2.5 text-sm font-semibold transition"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
              boxShadow:
                '0 1px 0 0 oklch(0 0 0 / 0.1), inset 0 1px 0 0 oklch(1 0 0 / 0.1)',
            }}
          >
            Continuar →
          </button>

          <button
            type="button"
            className="mt-2 w-full rounded-[var(--r-md)] border bg-transparent px-4 py-2.5 text-sm font-medium transition"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--fg)',
            }}
          >
            Single sign-on
          </button>
        </form>

        <p
          className="mt-10 text-[11px] leading-relaxed"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Sbroggio Advocacia · OAB/SP 323.065 · São José do Rio Preto.
          <br />
          Ao continuar você concorda com os termos de uso interno da banca.
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
        background: 'var(--surface)',
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
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
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
            Caixa de Entrada
          </h2>
          <button
            type="button"
            className="rounded-[var(--r-sm)] border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'var(--surface)',
              color: 'var(--fg-muted)',
            }}
          >
            Filtros
          </button>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-[var(--r-sm)] border px-2.5 py-1.5 text-xs"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'var(--surface)',
            color: 'var(--fg-subtle)',
          }}
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 3 3" />
          </svg>
          <span style={{ fontFamily: 'var(--brand-c-mono), monospace' }}>
            Buscar conversas…
          </span>
          <kbd
            className="ml-auto rounded px-1 py-0.5 text-[9px]"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--brand-c-mono), monospace',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <li key={conv.id}>
            <button
              type="button"
              className="block w-full border-b px-4 py-3 text-left transition"
              style={{
                background: conv.selected ? 'var(--surface)' : 'transparent',
                borderColor: 'var(--border)',
                borderLeft: conv.selected
                  ? `2px solid var(--accent)`
                  : '2px solid transparent',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate text-[13px]"
                  style={{
                    color: 'var(--fg)',
                    fontWeight: conv.unread > 0 ? 600 : 500,
                  }}
                >
                  {conv.name}
                </span>
                <span
                  className="shrink-0 text-[10px]"
                  style={{
                    color: 'var(--fg-subtle)',
                    fontFamily: 'var(--brand-c-mono), monospace',
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
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--fg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {conv.channel}
                </span>
                {conv.unread > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    {conv.unread} novo
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
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
              className="text-[11px]"
              style={{
                color: 'var(--fg-subtle)',
                fontFamily: 'var(--brand-c-mono), monospace',
              }}
            >
              +55 17 99788-7713 · cliente · franchising
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-[var(--r-sm)] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--fg-muted)',
            }}
          >
            Aberto
          </span>
          <button
            type="button"
            className="rounded-[var(--r-sm)] border px-2.5 py-1 text-[11px] font-medium transition"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
          >
            Atribuir
          </button>
          <button
            type="button"
            className="rounded-[var(--r-sm)] px-2.5 py-1 text-[11px] font-semibold transition"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
          >
            Resolver
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <div className="text-center">
          <span
            className="text-[10px]"
            style={{
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--brand-c-mono), monospace',
            }}
          >
            13 de maio, 2026 · 14:28
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[78%] px-3.5 py-2.5"
              style={{
                background: msg.from === 'me' ? 'var(--primary)' : 'var(--surface)',
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
                      ? 'oklch(0.7 0 0)'
                      : 'var(--fg-subtle)',
                  fontFamily: 'var(--brand-c-mono), monospace',
                }}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        <div
          className="rounded-[var(--r-md)] border p-3"
          style={{
            background: 'var(--accent-soft)',
            borderColor: 'oklch(0.85 0.06 22)',
          }}
        >
          <p
            className="mb-1 text-[11px] font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            ⚡ Atalho disponível
          </p>
          <p className="text-[12px]" style={{ color: 'var(--fg)' }}>
            Arquivar essa conversa como{' '}
            <code
              className="rounded px-1.5 py-0.5 text-[11px]"
              style={{
                background: 'var(--surface)',
                fontFamily: 'var(--brand-c-mono), monospace',
                color: 'var(--fg)',
              }}
            >
              Franchising/2026/Cliente Y
            </code>
            ?
          </p>
        </div>
      </div>

      <div
        className="border-t px-6 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="rounded-[var(--r-md)] border bg-[var(--bg)]"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <textarea
            rows={2}
            placeholder="Escreva uma resposta…"
            className="w-full resize-none rounded-t-[var(--r-md)] bg-transparent px-3.5 py-2.5 text-[13px] leading-relaxed outline-none placeholder:opacity-50"
            style={{ color: 'var(--fg)' }}
            defaultValue=""
          />
          <div
            className="flex items-center justify-between border-t px-3 py-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="flex items-center gap-2 text-[11px]"
              style={{
                color: 'var(--fg-subtle)',
                fontFamily: 'var(--brand-c-mono), monospace',
              }}
            >
              <span>Markdown · ⌘+enter pra enviar</span>
            </div>
            <button
              type="button"
              className="rounded-[var(--r-sm)] px-3 py-1.5 text-[11px] font-semibold transition"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-fg)',
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

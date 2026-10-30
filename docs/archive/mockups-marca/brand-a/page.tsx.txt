import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Crimson_Pro, Geist } from 'next/font/google';

const displaySerif = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--brand-a-serif',
  display: 'swap',
});

const bodySans = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--brand-a-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'A · Sbroggio Graphite · Mockup',
};

// ---------- Tokens locais (escopo só dessa página) ----------
const tokens = {
  // Paleta
  '--bg': 'oklch(0.97 0.003 30)',
  '--bg-elev': 'oklch(0.995 0.003 30)',
  '--surface': 'oklch(1 0 0)',
  '--fg': 'oklch(0.18 0.02 250)',
  '--fg-muted': 'oklch(0.45 0.02 250)',
  '--fg-subtle': 'oklch(0.6 0.015 250)',
  '--border': 'oklch(0.9 0.008 30)',
  '--border-strong': 'oklch(0.82 0.012 30)',
  // Marca
  '--primary': 'oklch(0.22 0.04 250)', // navy graphite
  '--primary-hover': 'oklch(0.28 0.045 250)',
  '--primary-fg': 'oklch(0.985 0 0)',
  '--accent': 'oklch(0.62 0.16 35)', // terracota
  '--accent-hover': 'oklch(0.56 0.17 35)',
  '--accent-soft': 'oklch(0.94 0.04 35)',
  // Estado
  '--success': 'oklch(0.6 0.13 150)',
  // Radius
  '--r-sm': '4px',
  '--r-md': '6px',
  '--r-lg': '10px',
} as CSSProperties;

// ---------- Mock data ----------
const conversations = [
  {
    id: '1',
    name: 'Maria Alice Sbroggio',
    preview: 'Doc, o contrato da franquia chegou. Quando puder revisar.',
    time: '14:32',
    unread: 2,
    selected: true,
  },
  {
    id: '2',
    name: 'Lucas Pereira',
    preview: 'Bom dia, dr. Sbroggio. Sobre o caso de RJ empresarial...',
    time: '13:48',
    unread: 0,
    selected: false,
  },
  {
    id: '3',
    name: 'João Henrique · Retoposto',
    preview: 'Reunião confirmada pras 16h. Vou levar o material.',
    time: '11:20',
    unread: 1,
    selected: false,
  },
  {
    id: '4',
    name: 'Cliente Empresarial X',
    preview: 'Recebemos a notificação do CADE. Precisamos conversar.',
    time: 'Ontem',
    unread: 0,
    selected: false,
  },
  {
    id: '5',
    name: 'Cliente Y · Franchising',
    preview: 'Obrigada pela COF revisada, ficou impecável.',
    time: 'Ontem',
    unread: 0,
    selected: false,
  },
];

const messages = [
  {
    id: 'm1',
    from: 'them',
    body: 'Doc, boa tarde. O contrato da franquia que você revisou chegou assinado pelo franqueado.',
    time: '14:28',
  },
  {
    id: 'm2',
    from: 'them',
    body: 'Estou anexando aqui. Quando puder dar uma última lida pra eu arquivar com o cliente, te agradeço.',
    time: '14:29',
  },
  {
    id: 'm3',
    from: 'me',
    body: 'Recebido, Maria Alice. Vou olhar até o fim do dia. Pode arquivar como Franchising · 2026 · Cliente Y.',
    time: '14:32',
  },
];

export default function BrandAPage() {
  return (
    <div
      className={`${displaySerif.variable} ${bodySans.variable} min-h-screen antialiased`}
      style={{
        ...tokens,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--brand-a-sans), system-ui, sans-serif',
      }}
    >
      <BrandHeader />

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-1 lg:grid-cols-2">
        <LoginSide />
        <InboxSide />
      </div>
    </div>
  );
}

// ---------- Header (badge de navegação dos mockups) ----------
function BrandHeader() {
  return (
    <header
      className="flex h-16 items-center justify-between border-b px-6 lg:px-10"
      style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-sm"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          <span
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--brand-a-serif), serif' }}
          >
            S
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-lg tracking-tight"
            style={{
              fontFamily: 'var(--brand-a-serif), serif',
              color: 'var(--fg)',
              fontWeight: 600,
            }}
          >
            Sbroggio
          </span>
          <span
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            · Bull
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-6 text-sm">
        <a
          href="/mockups"
          className="text-xs uppercase tracking-[0.16em] transition hover:opacity-70"
          style={{ color: 'var(--fg-muted)' }}
        >
          ← Voltar aos 3 mockups
        </a>
        <span
          className="hidden text-xs uppercase tracking-[0.16em] sm:inline"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Direção A · Graphite
        </span>
      </nav>
    </header>
  );
}

// ---------- Login (lado esquerdo) ----------
function LoginSide() {
  return (
    <section
      className="relative flex items-center justify-center px-6 py-16 lg:px-16"
      style={{ background: 'var(--bg)' }}
    >
      {/* Marca d'agua de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]"
      >
        <div
          className="absolute -bottom-20 -right-10 text-[280px] leading-none"
          style={{
            fontFamily: 'var(--brand-a-serif), serif',
            color: 'var(--primary)',
            fontWeight: 600,
          }}
        >
          S
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <p
          className="mb-3 text-[11px] uppercase tracking-[0.24em]"
          style={{ color: 'var(--accent)' }}
        >
          Atendimento jurídico · São José do Rio Preto
        </p>

        <h1
          className="text-[42px] leading-[1.05] tracking-tight lg:text-5xl"
          style={{
            fontFamily: 'var(--brand-a-serif), serif',
            color: 'var(--fg)',
            fontWeight: 500,
          }}
        >
          Atendimento que advogado de verdade usa.
        </h1>

        <p
          className="mt-5 max-w-sm text-base leading-relaxed"
          style={{ color: 'var(--fg-muted)' }}
        >
          Painel privado da banca. Mensagens de clientes, prazos e arquivamentos em um
          único lugar.
        </p>

        <form className="mt-10 space-y-5">
          <label className="block">
            <span
              className="mb-1.5 block text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--fg-muted)' }}
            >
              E-mail OAB
            </span>
            <input
              type="email"
              defaultValue="doc@sbroggio.adv.br"
              className="w-full rounded-[var(--r-sm)] border bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
            />
          </label>

          <label className="block">
            <span
              className="mb-1.5 block text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--fg-muted)' }}
            >
              Senha
            </span>
            <input
              type="password"
              defaultValue="••••••••••••"
              className="w-full rounded-[var(--r-sm)] border bg-[var(--surface)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
            />
          </label>

          <div className="flex items-center justify-between text-sm">
            <label
              className="flex items-center gap-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              <input type="checkbox" className="rounded-[2px]" />
              Manter conectado
            </label>
            <a
              href="#"
              className="font-medium underline-offset-4 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Esqueci a senha
            </a>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-[var(--r-sm)] px-4 py-3.5 text-sm font-medium tracking-wide transition"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
            }}
          >
            Entrar na banca
          </button>

          <button
            type="button"
            className="w-full rounded-[var(--r-sm)] border bg-transparent px-4 py-3 text-sm font-medium transition"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
          >
            Entrar com SSO institucional
          </button>
        </form>

        <p
          className="mt-10 text-xs leading-relaxed"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Sbroggio Advocacia Empresarial &amp; Franchising · OAB/SP 323.065 ·
          Confidencial.
        </p>
      </div>
    </section>
  );
}

// ---------- Inbox (lado direito) ----------
function InboxSide() {
  return (
    <section
      className="grid grid-cols-[280px_1fr] border-l"
      style={{
        background: 'var(--bg-elev)',
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
        className="border-b px-5 py-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2
          className="text-base tracking-tight"
          style={{
            fontFamily: 'var(--brand-a-serif), serif',
            fontWeight: 600,
            color: 'var(--fg)',
          }}
        >
          Caixa de Entrada
        </h2>
        <p
          className="mt-0.5 text-xs"
          style={{ color: 'var(--fg-subtle)' }}
        >
          5 conversas · 3 não lidas
        </p>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <li key={conv.id}>
            <button
              type="button"
              className="block w-full border-b px-5 py-3.5 text-left transition"
              style={{
                background: conv.selected ? 'var(--accent-soft)' : 'transparent',
                borderColor: 'var(--border)',
                borderLeft: conv.selected
                  ? '3px solid var(--accent)'
                  : '3px solid transparent',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate text-sm"
                  style={{
                    color: 'var(--fg)',
                    fontWeight: conv.unread > 0 ? 600 : 500,
                  }}
                >
                  {conv.name}
                </span>
                <span
                  className="shrink-0 text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {conv.time}
                </span>
              </div>
              <p
                className="mt-1 truncate text-xs leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                {conv.preview}
              </p>
              {conv.unread > 0 && (
                <span
                  className="mt-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--primary-fg)',
                  }}
                >
                  {conv.unread}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThreadPanel() {
  return (
    <div className="flex flex-col">
      {/* Header da conversa */}
      <header
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
              fontFamily: 'var(--brand-a-serif), serif',
            }}
          >
            MA
          </div>
          <div>
            <p
              className="text-sm tracking-tight"
              style={{ color: 'var(--fg)', fontWeight: 600 }}
            >
              Maria Alice Sbroggio
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--fg-subtle)' }}
            >
              +55 17 99788-7713 · Cliente · Franchising
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            fontWeight: 600,
          }}
        >
          Em andamento
        </span>
      </header>

      {/* Thread */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-8">
        <div className="text-center">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Hoje · 14:28
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[78%] px-4 py-3"
              style={{
                background: msg.from === 'me' ? 'var(--primary)' : 'var(--surface)',
                color: msg.from === 'me' ? 'var(--primary-fg)' : 'var(--fg)',
                border:
                  msg.from === 'me'
                    ? 'none'
                    : `1px solid var(--border)`,
                borderRadius:
                  msg.from === 'me'
                    ? 'var(--r-lg) var(--r-lg) var(--r-sm) var(--r-lg)'
                    : 'var(--r-lg) var(--r-lg) var(--r-lg) var(--r-sm)',
              }}
            >
              <p className="text-sm leading-relaxed">{msg.body}</p>
              <p
                className="mt-1.5 text-[10px] uppercase tracking-wider"
                style={{
                  color:
                    msg.from === 'me'
                      ? 'oklch(0.85 0 0)'
                      : 'var(--fg-subtle)',
                }}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div
        className="border-t px-6 py-4"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="flex items-end gap-3 rounded-[var(--r-md)] border px-4 py-3"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <textarea
            rows={2}
            placeholder="Escreva uma resposta com a deferência da casa…"
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-50"
            style={{ color: 'var(--fg)' }}
            defaultValue=""
          />
          <button
            type="button"
            className="rounded-[var(--r-sm)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition"
            style={{
              background: 'var(--accent)',
              color: 'var(--primary-fg)',
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

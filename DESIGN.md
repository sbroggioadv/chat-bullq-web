---
version: "2.2"
name: BullQ · macOS Graphite
description: Fundação SPEC-010 extraída do mockup aprovado em 27/10/2026.
defaultMode: dark
supportsDark: true
archetype: Grafite neutro e vidro macOS
chips:
  - SF Pro / Geist
  - Grafite
  - Vidro
  - 18px
consumer_contract:
  standalone: true
  goal: Implementar a interface aprovada do BullQ.
  priority_order:
    - Copiar o mockup aprovado.
    - Usar tokens bq sem alterar marcas existentes.
  mode_rule: data-mode light usa colors; dark usa dark.
  font_rule: Usar pilha nativa, Geist somente se disponível.
  asset_rule: Não exigir ativos externos.
  accessibility_rule: Foco visível, nomes acessíveis e teclado.
colors:
  wall-a: "#e6e8ec"
  wall-b: "#f4f5f7"
  glow-1: rgb(217 119 87 / 0.16)
  glow-2: rgb(139 147 255 / 0.18)
  win: rgb(255 255 255 / 0.60)
  win-solid: "#ffffff"
  glass: rgb(247 248 250 / 0.62)
  glass-strong: rgb(255 255 255 / 0.9)
  surface: rgb(15 18 25 / 0.018)
  raised: "#ffffff"
  raised-2: rgb(15 18 25 / 0.05)
  hair: rgb(15 18 25 / 0.08)
  hair-strong: rgb(15 18 25 / 0.15)
  t1: "#12141a"
  t2: "#474d59"
  t3: "#6f7684"
  accent: "#c4623f"
  accent-text: "#a94f2e"
  accent-soft: rgb(196 98 63 / 0.11)
  on-accent: "#ffffff"
  agent: "#5b63e0"
  agent-text: "#4149c4"
  agent-soft: rgb(91 99 224 / 0.10)
  info: "#2f6fd6"
  info-text: "#2559b0"
  info-soft: rgb(47 111 214 / 0.10)
  ok: "#1d9a4a"
  ok-soft: rgb(29 154 74 / 0.11)
  warn: "#b07405"
  warn-soft: rgb(176 116 5 / 0.11)
  err: "#cf3a3a"
  err-soft: rgb(207 58 58 / 0.10)
  bubble-in: "#ffffff"
  bubble-out: rgb(196 98 63 / 0.10)
  bubble-out-hair: rgb(196 98 63 / 0.24)
  solid-bg: "#12141a"
  solid-fg: "#ffffff"
  av-fg: "#1d2029"
  primary: "#12141a"
  primary-foreground: "#ffffff"
  background: "#e6e8ec"
  foreground: "#12141a"
  card: "#ffffff"
  card-foreground: "#12141a"
  popover: rgb(255 255 255 / 0.9)
  popover-foreground: "#12141a"
  secondary: "#ffffff"
  secondary-foreground: "#474d59"
  muted: rgb(15 18 25 / 0.018)
  muted-foreground: "#6f7684"
  accent-foreground: "#ffffff"
  destructive: "#cf3a3a"
  border: rgb(15 18 25 / 0.08)
  input: rgb(15 18 25 / 0.15)
  ring: "#c4623f"
  scrim: rgb(20 24 34 / 0.22)
  tertiary: "#5b63e0"
  neutral: "#6f7684"
  switch-thumb-on: "#ffffff"
  on-channel: "#ffffff"
  on-agent-forced: "#ffffff"
  on-avatar-owner: "#ffffff"
dark:
  wall-a: "#08090c"
  wall-b: "#111318"
  glow-1: rgb(255 255 255 / 0.035)
  glow-2: rgb(139 147 255 / 0.07)
  win: rgb(15 16 20 / 0.58)
  win-solid: "#141519"
  glass: rgb(26 28 34 / 0.52)
  glass-strong: rgb(20 21 26 / 0.86)
  surface: rgb(255 255 255 / 0.025)
  raised: rgb(255 255 255 / 0.05)
  raised-2: rgb(255 255 255 / 0.085)
  hair: rgb(255 255 255 / 0.07)
  hair-strong: rgb(255 255 255 / 0.13)
  t1: "#f1f2f4"
  t2: "#b8bdc7"
  t3: "#868c98"
  accent: "#e6e7eb"
  accent-text: "#f1f2f4"
  accent-soft: rgb(255 255 255 / 0.09)
  on-accent: "#0e0f12"
  agent: "#8b93ff"
  agent-text: "#a9afff"
  agent-soft: rgb(139 147 255 / 0.13)
  info: "#6aa3ff"
  info-text: "#93bbff"
  info-soft: rgb(106 163 255 / 0.13)
  ok: "#5bd97a"
  ok-soft: rgb(91 217 122 / 0.13)
  warn: "#e4c45a"
  warn-soft: rgb(228 196 90 / 0.12)
  err: "#ff7b7b"
  err-soft: rgb(255 123 123 / 0.13)
  bubble-in: rgb(255 255 255 / 0.045)
  bubble-out: rgb(255 255 255 / 0.11)
  bubble-out-hair: rgb(255 255 255 / 0.10)
  solid-bg: "#f1f2f4"
  solid-fg: "#0e0f12"
  av-fg: "#f1f2f4"
  wa: "#25d366"
  ig: "#e1306c"
  mail: "#5b8def"
  tg: "#2aabee"
  primary: "#f1f2f4"
  primary-foreground: "#0e0f12"
  background: "#08090c"
  foreground: "#f1f2f4"
  card: "#141519"
  card-foreground: "#f1f2f4"
  popover: rgb(20 21 26 / 0.86)
  popover-foreground: "#f1f2f4"
  secondary: rgb(255 255 255 / 0.05)
  secondary-foreground: "#b8bdc7"
  muted: rgb(255 255 255 / 0.025)
  muted-foreground: "#868c98"
  accent-foreground: "#0e0f12"
  destructive: "#ff7b7b"
  border: rgb(255 255 255 / 0.07)
  input: rgb(255 255 255 / 0.13)
  ring: "#e6e7eb"
  scrim: rgb(0 0 0 / 0.5)
  tertiary: "#8b93ff"
  neutral: "#868c98"
  switch-thumb-on: "#ffffff"
  on-channel: "#ffffff"
  on-agent-forced: "#ffffff"
  on-avatar-owner: "#ffffff"
fonts:
  sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Geist", "Segoe UI", system-ui, sans-serif
  display: '"Geist", -apple-system, "SF Pro Display", system-ui, sans-serif'
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace'
typography:
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Geist", "Segoe UI", system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  heading:
    fontFamily: '"Geist", -apple-system, "SF Pro Display", system-ui, sans-serif'
    fontSize: 15px
    fontWeight: 500
    letterSpacing: -0.02em
  metrics:
    bq-avatar-font-ratio: "0.32"
    bq-leading-single: "1"
    bq-leading-hero: "1.06"
    bq-leading-page: "1.1"
    bq-leading-display: "1.15"
    bq-leading-event: "1.3"
    bq-leading-title: "1.35"
    bq-leading-auxiliary: "1.4"
    bq-leading-body: "1.45"
    bq-leading-message: "1.5"
    bq-leading-summary: "1.55"
    bq-leading-prose: "1.6"
    bq-leading-description: "1.65"
    bq-leading-rail-count: 16px
    bq-leading-unread: 18px
    bq-text-5-2vw: 5.2vw
    bq-text-file-micro: 7px
    bq-text-file-label: 8.5px
    bq-text-mark: 9px
    bq-text-chart-label: 9.5px
    bq-text-phase-number: 10px
    bq-text-counter: 10.5px
    bq-text-metadata: 11px
    bq-text-auxiliary: 11.5px
    bq-text-control: 12px
    bq-text-row: 12.5px
    bq-text-body: 13px
    bq-text-message: 13.5px
    bq-text-profile-initial: 14px
    bq-text-chat-title: 14.5px
    bq-text-heading: 15px
    bq-text-profile-name: 16px
    bq-text-list-title: 17px
    bq-text-dialog-title: 18px
    bq-text-brand: 19px
    bq-text-detail-title: 22px
    bq-text-kpi: 23px
    bq-text-page-title: 24px
    bq-text-hero-sm: 32px
    bq-text-hero-lg: 62px
    bq-tracking-hero: -0.03em
    bq-tracking-display: -0.02em
    bq-tracking-heading: -0.015em
    bq-tracking-profile: -0.01em
    bq-tracking-normal: "0"
    bq-tracking-avatar: 0.01em
    bq-tracking-kind: 0.03em
    bq-tracking-file: 0.04em
    bq-tracking-label: 0.05em
    bq-tracking-section: 0.06em
    bq-tracking-nav: 0.07em
    bq-tracking-eyebrow: 0.08em
    bq-weight-light: "300"
    bq-weight-regular: "400"
    bq-weight-medium: "500"
    bq-weight-semibold: "600"
    bq-weight-bold: "700"
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  bq-space-negative-84px: -84px
  bq-space-negative-14px: -14px
  bq-space-negative-8px: -8px
  bq-space-negative-4-5px: -4.5px
  bq-space-none: 0px
  bq-space-hairline: 1px
  bq-space-micro: 2px
  bq-space-step: 3px
  bq-space-xs: 4px
  bq-space-label: 5px
  bq-space-compact: 6px
  bq-space-control: 7px
  bq-space-sm: 8px
  bq-space-row: 9px
  bq-space-item: 10px
  bq-space-panel: 11px
  bq-space-md: 12px
  bq-space-kpi: 13px
  bq-space-section: 14px
  bq-space-card: 15px
  bq-space-lg: 16px
  bq-space-content: 18px
  bq-space-page: 20px
  bq-space-detail: 22px
  bq-space-xl: 24px
  bq-space-settings: 28px
  bq-space-empty: 30px
  bq-space-hero: 40px
  bq-space-canvas: 48px
  bq-space-save-reserve: 100px
rounded:
  button: 9px
  rail-item: 11px
  menu: 12px
  window: 18px
  bq-radius-step: 2px
  bq-radius-progress: 3px
  bq-radius-heat: 4px
  bq-radius-tag: 5px
  bq-radius-badge: 6px
  bq-radius-file: 7px
  bq-radius-field: 8px
  bq-radius-button: 9px
  bq-radius-input: 10px
  bq-radius-rail-item: 11px
  bq-radius-menu: 12px
  bq-radius-attachment: 13px
  bq-radius-card: 14px
  bq-radius-bubble: 15px
  bq-radius-panel: 16px
  bq-radius-window: 18px
  bq-radius-group: 30%
  bq-radius-circle: 50%
  bq-radius-pill: 99px
  bq-radius-status-pill: 999px
shadows:
  window: 0 40px 90px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.06)
  popover: 0 18px 48px rgb(0 0 0 / 0.5)
motion:
  rail: 180ms ease
  hover: 150ms
elevation:
  window: 0 40px 90px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.06)
  popover: 0 18px 48px rgb(0 0 0 / 0.5)
components:
  button-primary:
    backgroundColor: "#f1f2f4"
    textColor: "#0e0f12"
    borderRadius: 9px
    height: 30px
  button-secondary:
    backgroundColor: transparent
    textColor: "#f1f2f4"
    border: 1px solid rgb(255 255 255 / 0.13)
  button-agent:
    backgroundColor: rgb(139 147 255 / 0.13)
    textColor: "#a9afff"
  nav-header:
    height: 52px
    backgroundColor: rgb(26 28 34 / 0.52)
  pill:
    height: 20px
    borderRadius: 6px
  segmented:
    height: 30px
    borderRadius: 9px
  menu:
    borderRadius: 12px
    backgroundColor: rgb(20 21 26 / 0.86)
  window:
    borderRadius: 18px
    backgroundColor: rgb(15 16 20 / 0.58)
  button-primary-hover:
    backgroundColor: rgb(255 255 255 / 0.05)
    textColor: "#f1f2f4"
  button-ghost:
    backgroundColor: transparent
    textColor: "#f1f2f4"
  card:
    backgroundColor: "#141519"
    textColor: "#f1f2f4"
  input-text:
    backgroundColor: rgb(255 255 255 / 0.05)
    textColor: "#f1f2f4"
    border: 1px solid rgb(255 255 255 / 0.13)
  badge-default:
    backgroundColor: rgb(255 255 255 / 0.085)
    textColor: "#b8bdc7"
    height: 20px
    borderRadius: 6px
preview_tokens:
  surface_bg: "#141519"
  surface_fg: "#f1f2f4"
  cta_bg: "#f1f2f4"
  cta_fg: "#0e0f12"
brand_primitives:
  wall-a: "#08090c"
  wall-b: "#111318"
  glow-1: rgb(255 255 255 / 0.035)
  glow-2: rgb(139 147 255 / 0.07)
  win: rgb(15 16 20 / 0.58)
  win-solid: "#141519"
  glass: rgb(26 28 34 / 0.52)
  glass-strong: rgb(20 21 26 / 0.86)
  surface: rgb(255 255 255 / 0.025)
  raised: rgb(255 255 255 / 0.05)
  raised-2: rgb(255 255 255 / 0.085)
  hair: rgb(255 255 255 / 0.07)
  hair-strong: rgb(255 255 255 / 0.13)
  t1: "#f1f2f4"
  t2: "#b8bdc7"
  t3: "#868c98"
  accent: "#e6e7eb"
  accent-text: "#f1f2f4"
  accent-soft: rgb(255 255 255 / 0.09)
  on-accent: "#0e0f12"
  agent: "#8b93ff"
  agent-text: "#a9afff"
  agent-soft: rgb(139 147 255 / 0.13)
  info: "#6aa3ff"
  info-text: "#93bbff"
  info-soft: rgb(106 163 255 / 0.13)
  ok: "#5bd97a"
  ok-soft: rgb(91 217 122 / 0.13)
  warn: "#e4c45a"
  warn-soft: rgb(228 196 90 / 0.12)
  err: "#ff7b7b"
  err-soft: rgb(255 123 123 / 0.13)
  bubble-in: rgb(255 255 255 / 0.045)
  bubble-out: rgb(255 255 255 / 0.11)
  bubble-out-hair: rgb(255 255 255 / 0.10)
  solid-bg: "#f1f2f4"
  solid-fg: "#0e0f12"
  av-l: "0.38"
  av-c: "0.045"
  av-fg: "#f1f2f4"
  shadow-win: 0 40px 90px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.06)
  shadow-pop: 0 18px 48px rgb(0 0 0 / 0.5)
  wa: "#25d366"
  ig: "#e1306c"
  mail: "#5b8def"
  tg: "#2aabee"
  f-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Geist", "Segoe UI", system-ui, sans-serif
  f-display: '"Geist", -apple-system, "SF Pro Display", system-ui, sans-serif'
  f-mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace'
aliases: {}
showcase:
  headline: BullQ
  layout: default
source_tokens:
  light:
    wall-a: "#e6e8ec"
    wall-b: "#f4f5f7"
    glow-1: rgb(217 119 87 / 0.16)
    glow-2: rgb(139 147 255 / 0.18)
    win: rgb(255 255 255 / 0.60)
    win-solid: "#ffffff"
    glass: rgb(247 248 250 / 0.62)
    glass-strong: rgb(255 255 255 / 0.9)
    surface: rgb(15 18 25 / 0.018)
    raised: "#ffffff"
    raised-2: rgb(15 18 25 / 0.05)
    hair: rgb(15 18 25 / 0.08)
    hair-strong: rgb(15 18 25 / 0.15)
    t1: "#12141a"
    t2: "#474d59"
    t3: "#6f7684"
    accent: "#c4623f"
    accent-text: "#a94f2e"
    accent-soft: rgb(196 98 63 / 0.11)
    on-accent: "#ffffff"
    agent: "#5b63e0"
    agent-text: "#4149c4"
    agent-soft: rgb(91 99 224 / 0.10)
    info: "#2f6fd6"
    info-text: "#2559b0"
    info-soft: rgb(47 111 214 / 0.10)
    ok: "#1d9a4a"
    ok-soft: rgb(29 154 74 / 0.11)
    warn: "#b07405"
    warn-soft: rgb(176 116 5 / 0.11)
    err: "#cf3a3a"
    err-soft: rgb(207 58 58 / 0.10)
    bubble-in: "#ffffff"
    bubble-out: rgb(196 98 63 / 0.10)
    bubble-out-hair: rgb(196 98 63 / 0.24)
    solid-bg: "#12141a"
    solid-fg: "#ffffff"
    av-l: "0.86"
    av-c: "0.06"
    av-fg: "#1d2029"
    shadow-win: 0 30px 70px rgb(20 24 34 / 0.16), inset 0 1px 0 rgb(255 255 255 / 0.8)
    shadow-pop: 0 18px 44px rgb(20 24 34 / 0.18)
    primary: "#12141a"
    primary-foreground: "#ffffff"
    background: "#e6e8ec"
    foreground: "#12141a"
    card: "#ffffff"
    card-foreground: "#12141a"
    popover: rgb(255 255 255 / 0.9)
    popover-foreground: "#12141a"
    secondary: "#ffffff"
    secondary-foreground: "#474d59"
    muted: rgb(15 18 25 / 0.018)
    muted-foreground: "#6f7684"
    accent-foreground: "#ffffff"
    destructive: "#cf3a3a"
    border: rgb(15 18 25 / 0.08)
    input: rgb(15 18 25 / 0.15)
    ring: "#c4623f"
    scrim: rgb(20 24 34 / 0.22)
  dark:
    wall-a: "#08090c"
    wall-b: "#111318"
    glow-1: rgb(255 255 255 / 0.035)
    glow-2: rgb(139 147 255 / 0.07)
    win: rgb(15 16 20 / 0.58)
    win-solid: "#141519"
    glass: rgb(26 28 34 / 0.52)
    glass-strong: rgb(20 21 26 / 0.86)
    surface: rgb(255 255 255 / 0.025)
    raised: rgb(255 255 255 / 0.05)
    raised-2: rgb(255 255 255 / 0.085)
    hair: rgb(255 255 255 / 0.07)
    hair-strong: rgb(255 255 255 / 0.13)
    t1: "#f1f2f4"
    t2: "#b8bdc7"
    t3: "#868c98"
    accent: "#e6e7eb"
    accent-text: "#f1f2f4"
    accent-soft: rgb(255 255 255 / 0.09)
    on-accent: "#0e0f12"
    agent: "#8b93ff"
    agent-text: "#a9afff"
    agent-soft: rgb(139 147 255 / 0.13)
    info: "#6aa3ff"
    info-text: "#93bbff"
    info-soft: rgb(106 163 255 / 0.13)
    ok: "#5bd97a"
    ok-soft: rgb(91 217 122 / 0.13)
    warn: "#e4c45a"
    warn-soft: rgb(228 196 90 / 0.12)
    err: "#ff7b7b"
    err-soft: rgb(255 123 123 / 0.13)
    bubble-in: rgb(255 255 255 / 0.045)
    bubble-out: rgb(255 255 255 / 0.11)
    bubble-out-hair: rgb(255 255 255 / 0.10)
    solid-bg: "#f1f2f4"
    solid-fg: "#0e0f12"
    av-l: "0.38"
    av-c: "0.045"
    av-fg: "#f1f2f4"
    shadow-win: 0 40px 90px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.06)
    shadow-pop: 0 18px 48px rgb(0 0 0 / 0.5)
    wa: "#25d366"
    ig: "#e1306c"
    mail: "#5b8def"
    tg: "#2aabee"
    f-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Geist", "Segoe UI", system-ui, sans-serif
    f-display: '"Geist", -apple-system, "SF Pro Display", system-ui, sans-serif'
    f-mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace'
    primary: "#f1f2f4"
    primary-foreground: "#0e0f12"
    background: "#08090c"
    foreground: "#f1f2f4"
    card: "#141519"
    card-foreground: "#f1f2f4"
    popover: rgb(20 21 26 / 0.86)
    popover-foreground: "#f1f2f4"
    secondary: rgb(255 255 255 / 0.05)
    secondary-foreground: "#b8bdc7"
    muted: rgb(255 255 255 / 0.025)
    muted-foreground: "#868c98"
    accent-foreground: "#0e0f12"
    destructive: "#ff7b7b"
    border: rgb(255 255 255 / 0.07)
    input: rgb(255 255 255 / 0.13)
    ring: "#e6e7eb"
    scrim: rgb(0 0 0 / 0.5)
metrics:
  avatar-factor:
    bq-avatar-font-ratio: "0.32"
  border:
    bq-border-none: 0px
    bq-border-hairline: 1px
    bq-border-checkbox: 1.5px
    bq-border-focus: 2px
    bq-border-brand: 2.5px
    bq-border-event: 3px
  breakpoint:
    bq-breakpoint-phone: 560px
    bq-breakpoint-case: 640px
    bq-breakpoint-pane: 760px
    bq-breakpoint-project: 860px
    bq-breakpoint-workspace: 1100px
    bq-breakpoint-toolbar: 1120px
    bq-breakpoint-nav: 1380px
  container:
    bq-container-chat-compact: 470px
    bq-container-chat: 720px
  leading:
    bq-leading-single: "1"
    bq-leading-hero: "1.06"
    bq-leading-page: "1.1"
    bq-leading-display: "1.15"
    bq-leading-event: "1.3"
    bq-leading-title: "1.35"
    bq-leading-auxiliary: "1.4"
    bq-leading-body: "1.45"
    bq-leading-message: "1.5"
    bq-leading-summary: "1.55"
    bq-leading-prose: "1.6"
    bq-leading-description: "1.65"
    bq-leading-rail-count: 16px
    bq-leading-unread: 18px
  radius:
    bq-radius-step: 2px
    bq-radius-progress: 3px
    bq-radius-heat: 4px
    bq-radius-tag: 5px
    bq-radius-badge: 6px
    bq-radius-file: 7px
    bq-radius-field: 8px
    bq-radius-button: 9px
    bq-radius-input: 10px
    bq-radius-rail-item: 11px
    bq-radius-menu: 12px
    bq-radius-attachment: 13px
    bq-radius-card: 14px
    bq-radius-bubble: 15px
    bq-radius-panel: 16px
    bq-radius-window: 18px
    bq-radius-group: 30%
    bq-radius-circle: 50%
    bq-radius-pill: 99px
    bq-radius-status-pill: 999px
  size:
    bq-size-1px: 1px
    bq-size-2px: 2px
    bq-size-3px: 3px
    bq-size-4px: 4px
    bq-size-status-dot: 6px
    bq-size-source-dot: 7px
    bq-size-color-dot: 8px
    bq-size-channel-glyph: 9px
    bq-size-legend: 10px
    bq-size-icon-xs: 12px
    bq-size-settings-glyph: 13px
    bq-size-legend-wide: 14px
    bq-size-icon-sm: 15px
    bq-size-15ch: 15ch
    bq-size-switch-thumb: 16px
    bq-size-icon: 18px
    bq-size-phase-number: 19px
    bq-size-org-mark: 20px
    bq-size-switch-height: 22px
    bq-size-compact-control: 24px
    bq-size-segment: 26px
    bq-size-file-width: 28px
    bq-size-avatar-pipeline: 30px
    bq-size-31percent: 31%
    bq-size-icon-button: 32px
    bq-size-file-height: 34px
    bq-size-switch-width: 36px
    bq-size-avatar-row: 38px
    bq-size-rail-item: 40px
    bq-size-40percent: 40%
    bq-size-tile-large: 42px
    bq-size-chart-count: 44px
    bq-size-agenda-slot: 48px
    bq-size-settings-row: 50px
    bq-size-toolbar: 52px
    bq-size-jarvis-toolbar: 56px
    bq-size-56ch: 56ch
    bq-size-textarea-small: 58px
    bq-size-58percent: 58%
    bq-size-rail: 60px
    bq-size-chat-header: 62px
    bq-size-62vw: 62vw
    bq-size-64ch: 64ch
    bq-size-avatar-profile: 64px
    bq-size-schedule-label: 70px
    bq-size-textarea: 72px
    bq-size-75ch: 75ch
    bq-size-80percent: 80%
    bq-size-prompt-plain: 80px
    bq-size-82percent: 82%
    bq-size-85percent: 85%
    bq-size-86percent: 86%
    bq-size-chat-status-compact: 86px
    bq-size-88percent: 88%
    bq-size-chart-label: 92px
    bq-size-94percent: 94%
    bq-size-textarea-message: 96px
    bq-size-100percent: 100%
    bq-size-100vw: 100vw
    bq-size-watchdog-column: 100px
    bq-size-time-field: 118px
    bq-size-prompt: 120px
    bq-size-chat-agent-compact: 124px
    bq-size-130px: 130px
    bq-size-tag-input: 140px
    bq-size-chat-status: 150px
    bq-size-kpi-min: 158px
    bq-size-template-min: 160px
    bq-size-chart: 170px
    bq-size-email-nav-compact: 180px
    bq-size-warning-min: 200px
    bq-size-rail-expanded: 204px
    bq-size-pipeline-column: 205px
    bq-size-email-nav: 210px
    bq-size-picker-max: 216px
    bq-size-menu-min: 230px
    bq-size-attachment-min: 250px
    bq-size-department-min: 260px
    bq-size-settings-nav: 264px
    bq-size-270px: 270px
    bq-size-jarvis-nav: 272px
    bq-size-incoming-column: 276px
    bq-size-email-list-compact: 280px
    bq-size-project-list: 300px
    bq-size-contact-side: 318px
    bq-size-conversation-list: 320px
    bq-size-context-menu: 330px
    bq-size-email-list: 340px
    bq-size-automation-log: 360px
    bq-size-toast-max: 380px
    bq-size-search-max: 420px
    bq-size-canvas-max: 440px
    bq-size-department-max: 520px
    bq-size-message-max: 560px
    bq-size-agenda-min: 720px
    bq-size-settings-max: 740px
    bq-size-sheet-max: 760px
    bq-size-dialog-height: 780px
    bq-size-dialog-max: 1180px
  space:
    bq-space-negative-84px: -84px
    bq-space-negative-14px: -14px
    bq-space-negative-8px: -8px
    bq-space-negative-4-5px: -4.5px
    bq-space-none: 0px
    bq-space-hairline: 1px
    bq-space-micro: 2px
    bq-space-step: 3px
    bq-space-xs: 4px
    bq-space-label: 5px
    bq-space-compact: 6px
    bq-space-control: 7px
    bq-space-sm: 8px
    bq-space-row: 9px
    bq-space-item: 10px
    bq-space-panel: 11px
    bq-space-md: 12px
    bq-space-kpi: 13px
    bq-space-section: 14px
    bq-space-card: 15px
    bq-space-lg: 16px
    bq-space-content: 18px
    bq-space-page: 20px
    bq-space-detail: 22px
    bq-space-xl: 24px
    bq-space-settings: 28px
    bq-space-empty: 30px
    bq-space-hero: 40px
    bq-space-canvas: 48px
    bq-space-save-reserve: 100px
  stroke:
    bq-stroke-fine: "1"
    bq-stroke-flow-edge: "1.4"
    bq-stroke-flow-current: "1.6"
    bq-stroke-icon: "1.75"
    bq-stroke-flow-selected: "1.8"
    bq-stroke-check: "2"
    bq-stroke-icon-xs: "2.2"
    bq-stroke-channel: "2.6"
    bq-stroke-window-control: "3"
  text:
    bq-text-5-2vw: 5.2vw
    bq-text-file-micro: 7px
    bq-text-file-label: 8.5px
    bq-text-mark: 9px
    bq-text-chart-label: 9.5px
    bq-text-phase-number: 10px
    bq-text-counter: 10.5px
    bq-text-metadata: 11px
    bq-text-auxiliary: 11.5px
    bq-text-control: 12px
    bq-text-row: 12.5px
    bq-text-body: 13px
    bq-text-message: 13.5px
    bq-text-profile-initial: 14px
    bq-text-chat-title: 14.5px
    bq-text-heading: 15px
    bq-text-profile-name: 16px
    bq-text-list-title: 17px
    bq-text-dialog-title: 18px
    bq-text-brand: 19px
    bq-text-detail-title: 22px
    bq-text-kpi: 23px
    bq-text-page-title: 24px
    bq-text-hero-sm: 32px
    bq-text-hero-lg: 62px
  tracking:
    bq-tracking-hero: -0.03em
    bq-tracking-display: -0.02em
    bq-tracking-heading: -0.015em
    bq-tracking-profile: -0.01em
    bq-tracking-normal: "0"
    bq-tracking-avatar: 0.01em
    bq-tracking-kind: 0.03em
    bq-tracking-file: 0.04em
    bq-tracking-label: 0.05em
    bq-tracking-section: 0.06em
    bq-tracking-nav: 0.07em
    bq-tracking-eyebrow: 0.08em
  weight:
    bq-weight-light: "300"
    bq-weight-regular: "400"
    bq-weight-medium: "500"
    bq-weight-semibold: "600"
    bq-weight-bold: "700"
  avatar:
    hueFallback: 250
    fontRatio: 0.32
    personRadius: 50%
    groupRadius: 30%
mockup_support:
  bq-sender-l-dark: "0.72"
  bq-sender-c-dark: "0.11"
  bq-sender-l-light: "0.5"
  bq-sender-c-light: "0.12"
  bq-owner-l: "0.5"
  bq-owner-c: "0.08"
  bq-on-channel: "#ffffff"
  bq-on-agent-forced: "#ffffff"
  bq-on-avatar-owner: "#ffffff"
  bq-blur-contact: "28px"
  bq-saturate-contact: "170%"
  bq-layer-contact: "20"
  bq-opacity-dragging: "0.45"
---

## 1. Visual Theme & Atmosphere
Janela macOS de vidro sobre gradiente grafite. Fonte canônica: `docs/design/2026-10-27-repaginacao/mockup.html` no workspace BullQ; aprovação e escopo na SPEC-010. Este documento materializa essa aprovação, sem uma nova decisão visual.

## 2. Color Palette & Roles
Valores literais dos dois primeiros blocos :root do mockup estão no front matter. Transparências preservadas. `t1`, `t2`, `t3` formam a hierarquia; `agent` identifica IA, `info` informação e `ok/warn/err` estados. No CSS, todos recebem prefixo `--bq-` para coexistir com os temas legados e o editor de marca.

## 3. Typography Rules
Interface 13px/1.45 na pilha nativa SF Pro Text/Geist. Títulos de página em Geist/SF Pro Display com peso 500; breadcrumb na fonte de UI com peso 600. Números e atalhos usam Geist Mono/SF Mono. Não baixar fontes como requisito de execução; fallback nativo declarado no mockup.

## 4. Components
Botão 30px com variantes padrão, sólido e agente. Pill 20px, segmentos de 26px dentro de trilho com padding 2px. Menu de vidro com raio 12px. Sheet e janela usam Dialog do Headless UI, com foco e Escape. Janela usa controles macOS com nomes acessíveis; minimizar/maximizar são opcionais e só aparecem quando há handler. Switch usa role switch. Linha de ajustes associa texto e controle.

## 5. Layout Principles
Papel de parede com margens 16px horizontais e 14px verticais; janela com raio 18px. Trilho 60px recolhido e 204px expandido, itens 40px. Topo 52px. A coluna secundária externa fica só em Conversas (Caixas); pastas, pipelines e agentes têm navegação dentro das próprias páginas. Conteúdo interno pertence à W1.

## 6. Depth & Elevation
Janela blur 30px saturate 160%; topo blur 24px saturate 160%; popover blur 28px saturate 180%. Bordas finas hair/hair-strong e sombras literais. Sem suporte a backdrop-filter usar win-solid.

## 7. Do's and Don'ts
Usar apenas a paleta extraída. Preservar transparências. Não inventar status conectado. Não criar funcionalidades do piloto Incoming. Não remover fluxos existentes. Não alterar as telas W1. Não substituir configurações de marca persistidas. Nomear botões de ícone. Exibir foco. Respeitar movimento reduzido.

## 8. Responsive Behavior
A busca fica oculta até 1120px. Em largura até 560px, trilho fixo de 52px, itens de 36px, padding-block de 8px na parede e rótulos ocultos; navegação secundária em drawer acessível. Topo oculta organização até 860px e preserva o título; a troca de organização continua no menu do perfil. Conteúdo usa min-width zero e min-height zero. Em altura baixa o trilho rola, preservando acesso ao rodapé.

## 9. Agent Prompt Guide
### Quick Color Reference
- Grafite escuro: #141519; texto: #f1f2f4.
- Claro: #ffffff; texto: #12141a.
- IA escura: #8b93ff; clara: #5b63e0.
### Example Component Prompts
1. Crie card usando win-solid e hair, sem cor nova.
2. Crie botão sólido com solid-bg e solid-fg.
3. Crie badge de IA com agent-soft e agent-text.
4. Crie navegação 60px/204px e itens de 40px.
5. Crie seção escura com t1/t2/t3 e vidro.
### Iteration Guide
1. Compare com o mockup.
2. Confira o tema claro.
3. Preserve alpha.
4. Teste o teclado.
5. Teste os cortes de 1120px e 560px.
6. Preserve as telas internas.

## Fidelity Notes
As cores e sombras são literais, sem conversão ou perda de alpha. Fontes opcionais seguem fallback do mockup. O token scrim dos diálogos é extraído dos blocos :root posteriores. Ícones Lucide substituem os SVG inline do mockup. Incoming permanece indisponível até W2. As trees legadas ficam em painel contextual para preservar as funcionalidades existentes.

## Implementation
Next.js 16, React 19, Tailwind 4; configuração CSS-first em `src/app/globals.css`, sem tailwind.config separado. Não há shadcn components.json; primitivas em `src/components/ui/`, casca em `src/components/layout/`.

| Token | Utility |
|---|---|
| --bq-t1 | text-bq-text |
| --bq-t2 | text-bq-muted |
| --bq-agent | text-bq-agent |
| --bq-win-solid | bg-bq-surface |
| --bq-hair | border-bq-border |

Sem geração intermediária. Para regenerar, extrair os blocos :root do mockup aprovado, preservar valores e prefixar somente os nomes com bq. Os tokens legados continuam disponíveis; a W1 pode adotar os novos progressivamente.

### Casca · fidelidade SPEC-010, Emenda 1.17

- Títulos de página usam `--bq-f-display`, peso 500 (a lista de Conversas preserva 600, como `.lh-top h2` no mockup) e tracking -0.02em; o breadcrumb mantém 600 na fonte de UI, como `.crumbs b` do mockup. Ícones do trilho usam a geometria SVG literal do mockup, 18px e traço 1.75, em `shell-icon.tsx`.
- Só Conversas tem navegação secundária externa (`InboxTree`). Pastas/contas do E-mail, seletor de Pipelines e abas de Agentes ficam nas páginas respectivas. A coluna de Caixas recolhe em 1380px, com acesso pelo botão de navegação da seção.
- Organização sai do topo em 860px. A troca continua no menu do perfil do trilho, em todos os tamanhos. Em 560px, o indicador de conexão conserva a bolinha e o nome acessível, sem texto visual.
- “Ao vivo” só aparece depois de `ready` no socket compartilhado; sem confirmação, mostra “Sem conexão”, inclusive durante a reconexão. Usa `--bq-ok`/`--bq-ok-soft` conectado e `--bq-t3`/`--bq-raised` aguardando.
- Busca visível acima de 1120px: Ctrl+K e ⌘K focam o campo. O campo é somente leitura e explica no foco que a busca global ainda não está conectada; as buscas de cada tela continuam disponíveis. Nenhuma consulta fictícia.


### Escalas de métricas do mockup

O contrato é aditivo: os valores e caminhos anteriores continuam intactos. As escalas separam texto de linha, auxiliar, contador, títulos e metadados; espaçamento de controles, linhas, painéis e páginas; dimensões de ícones, avatares, arquivos e colunas; raios, bordas, traços e pontos de quebra. Um mesmo número em papéis diferentes pode ter tokens diferentes. Fontes e cores variáveis por tema continuam usando os tokens originais.

As métricas abaixo são literais do mockup aprovado. A referência inclui estilos de conteúdo demonstrativo e telas futuras: disponibilizar a medida não autoriza importar exemplos nem implementar funções indisponíveis. Zero estrutural, frações de grade e tamanhos intrínsecos (auto/minmax/1fr) são composição CSS, não dados de negócio nem novas métricas.

O bloco @theme static em src/app/globals.css declara --bq-* e o namespace Tailwind correspondente com valores literais. As duplicações literais fazem a ponte CSS/Tailwind sem cadeias var() novas. Não há geração em runtime. Alterações futuras devem atualizar as duas declarações e este contrato juntas. Border/stroke têm @utility explícita. max-* usa limite exclusivo do Tailwind; bq-through-* reproduz o max-width inclusivo do mockup. Consultas de contêiner usam o nome chat; não confundir breakpoint de viewport com container.

| Token CSS | Valor literal | Mockup (linhas) | Utility Tailwind 4 |
|---|---|---|---|
| --bq-avatar-font-ratio | 0.32 | 130 | bq-avatar-mockup |
| --bq-border-none | 0px | 57, 89, 205, 261, 273, 293, 321, 348, 380, 402, 442, 453, 610, 639, 706, 736, 746, 823, 845, 914, 977, 993, 1035, 1059, 1068, 1112, 1151, 1175, 1204, 1227, 1234, 1240, 1250, 1253, 1257, 2846, 3351, 3538 | border-bq-border-none |
| --bq-border-hairline | 1px | 67, 71, 82, 88, 91, 107, 110, 117, 122, 144, 151, 160, 163, 181, 185, 198, 204, 224, 228, 233, 240, 245, 254, 259, 272, 282, 284, 288, 292, 295, 320, 328, 331, 336, 346, 347, 348, 352, 353, 357, 362, 378, 380, 385, 391, 392, 402, 407, 431, 432, 441, 450, 453, 465, 469, 470, 479, 482, 493, 507, 513, 521, 541, 545, 550, 566, 568, 581, 585, 594, 610, 621, 638, 659, 665, 670, 672, 679, 687, 693, 706, 725, 746, 779, 803, 807, 815, 820, 826, 828, 830, 831, 843, 844, 864, 873, 885, 886, 889, 892, 903, 907, 913, 914, 927, 935, 943, 944, 951, 954, 961, 974, 979, 992, 1004, 1009, 1027, 1034, 1057, 1058, 1068, 1082, 1097, 1102, 1105, 1108, 1136, 1150, 1155, 1160, 1169, 1175, 1190, 1193, 1203, 1208, 1215, 1227, 1233, 1235, 1240, 1246, 1249, 1252, 1257, 3299 | border-bq-border-hairline |
| --bq-border-checkbox | 1.5px | 314, 366, 601 | border-bq-border-checkbox |
| --bq-border-focus | 2px | 58, 704, 850, 978, 1094 | border-bq-border-focus |
| --bq-border-brand | 2.5px | 394 | border-bq-border-brand |
| --bq-border-event | 3px | 831 | border-bq-border-event |
| --bq-breakpoint-phone | 560px | 718, 748 | bq-breakpoint-phone: / max-bq-breakpoint-phone: / bq-through-phone: |
| --bq-breakpoint-case | 640px | 386 | bq-breakpoint-case: / max-bq-breakpoint-case: / bq-through-case: |
| --bq-breakpoint-pane | 760px | 958, 1110, 1157, 1260 | bq-breakpoint-pane: / max-bq-breakpoint-pane: / bq-through-pane: |
| --bq-breakpoint-project | 860px | 712, 735 | bq-breakpoint-project: / max-bq-breakpoint-project: / bq-through-project: |
| --bq-breakpoint-workspace | 1100px | 957 | bq-breakpoint-workspace: / max-bq-breakpoint-workspace: / bq-through-workspace: |
| --bq-breakpoint-toolbar | 1120px | 730 | bq-breakpoint-toolbar: / max-bq-breakpoint-toolbar: / bq-through-toolbar: |
| --bq-breakpoint-nav | 1380px | 729 | bq-breakpoint-nav: / max-bq-breakpoint-nav: / bq-through-nav: |
| --bq-container-chat-compact | 470px | 1278 | @bq-container-chat-compact/chat: / @max-bq-container-chat-compact/chat: |
| --bq-container-chat | 720px | 1271 | @bq-container-chat/chat: / @max-bq-container-chat/chat: |
| --bq-leading-single | 1 | 201 | leading-bq-leading-single |
| --bq-leading-hero | 1.06 | 399 | leading-bq-leading-hero |
| --bq-leading-page | 1.1 | 138, 771 | leading-bq-leading-page |
| --bq-leading-display | 1.15 | 504, 666, 781, 1052, 1218 | leading-bq-leading-display |
| --bq-leading-event | 1.3 | 831 | leading-bq-leading-event |
| --bq-leading-title | 1.35 | 972 | leading-bq-leading-title |
| --bq-leading-auxiliary | 1.4 | 999, 1020, 1143, 1198, 1247 | leading-bq-leading-auxiliary |
| --bq-leading-body | 1.45 | 55, 335, 345, 454, 477, 979, 1053, 1064, 1176, 1211, 1222, 1236 | leading-bq-leading-body |
| --bq-leading-message | 1.5 | 240, 261, 380, 484, 679, 915, 951, 1071, 1074, 1171, 1228, 2488 | leading-bq-leading-message |
| --bq-leading-summary | 1.55 | 305, 376, 1102 | leading-bq-leading-summary |
| --bq-leading-prose | 1.6 | 511, 680, 911 | leading-bq-leading-prose |
| --bq-leading-description | 1.65 | 362 | leading-bq-leading-description |
| --bq-leading-rail-count | 16px | 76 | leading-bq-leading-rail-count |
| --bq-leading-unread | 18px | 221 | leading-bq-leading-unread |
| --bq-radius-step | 2px | 486, 1015 | rounded-bq-radius-step |
| --bq-radius-progress | 3px | 601, 628, 629, 791, 1091, 1092 | rounded-bq-radius-progress |
| --bq-radius-heat | 4px | 793, 796, 797, 978, 1148 | rounded-bq-radius-heat |
| --bq-radius-tag | 5px | 91, 116, 241, 242, 246, 314, 366, 476, 679, 850, 881, 948, 1005, 1100 | rounded-bq-radius-tag |
| --bq-radius-badge | 6px | 58, 87, 112, 197, 299, 306, 309, 387, 447, 604, 630, 694, 799, 849, 918, 1042, 1075, 1166, 1179, 1213 | rounded-bq-radius-badge |
| --bq-radius-file | 7px | 104, 176, 247, 346, 394, 473, 606, 610, 687, 700 | rounded-bq-radius-file |
| --bq-radius-field | 8px | 76, 110, 123, 165, 192, 228, 266, 348, 364, 431, 439, 453, 465, 479, 674, 706, 822, 831, 935, 951, 1004, 1039, 1065, 1068, 1097, 1147, 1150, 1155, 1175, 1178, 1215, 1227, 1240, 1257 | rounded-bq-radius-field |
| --bq-radius-button | 9px | 85, 95, 103, 117, 221, 268, 312, 320, 340, 344, 443, 477, 513, 643, 652, 693, 856, 914, 942, 1034, 1130, 1139, 1169, 1172 | rounded-bq-radius-button |
| --bq-radius-input | 10px | 72, 88, 160, 163, 204, 292, 328, 380, 469, 585, 854, 974, 1102, 1103 | rounded-bq-radius-input |
| --bq-radius-rail-item | 11px | 73, 288, 944, 961, 979, 988, 1009, 1045, 1222 | rounded-bq-radius-rail-item |
| --bq-radius-menu | 12px | 122, 141, 181, 210, 284, 304, 331, 362, 450, 482, 497, 521, 545, 550, 581, 621, 672, 807, 873, 907, 954, 1028, 1105, 1160, 1183, 1185, 1217, 1246 | rounded-bq-radius-menu |
| --bq-radius-attachment | 13px | 245, 1236, 1242 | rounded-bq-radius-attachment |
| --bq-radius-card | 14px | 151, 670, 725, 779, 1057, 1082, 1108, 1193, 1208, 1220, 1235 | rounded-bq-radius-card |
| --bq-radius-bubble | 15px | 240, 254 | rounded-bq-radius-bubble |
| --bq-radius-panel | 16px | 144, 259, 352, 507, 566, 594, 679, 704, 815, 864, 885, 927, 943, 1190 | rounded-bq-radius-panel |
| --bq-radius-window | 18px | 67, 391, 541 | rounded-bq-radius-window |
| --bq-radius-group | 30% | 131 | rounded-bq-radius-group |
| --bq-radius-circle | 50% | 78, 93, 98, 127, 130, 132, 282, 289, 372, 515, 570, 690, 811, 817, 898, 994, 1031, 1094, 1098, 1134, 1135, 4275 | rounded-bq-radius-circle |
| --bq-radius-pill | 99px | 92, 107, 233, 402, 406, 644 | rounded-bq-radius-pill |
| --bq-radius-status-pill | 999px | 357 | rounded-bq-radius-status-pill |
| --bq-size-1px | 1px | 370, 434, 588, 1153 | size-bq-size-1px, w-bq-size-1px, h-bq-size-1px |
| --bq-size-2px | 2px | 435, 1192 | size-bq-size-2px, w-bq-size-2px, h-bq-size-2px |
| --bq-size-3px | 3px | 1015 | size-bq-size-3px, w-bq-size-3px, h-bq-size-3px |
| --bq-size-4px | 4px | 486 | size-bq-size-4px, w-bq-size-4px, h-bq-size-4px |
| --bq-size-status-dot | 6px | 93, 98, 628, 690, 898, 1091 | size-bq-size-status-dot, w-bq-size-status-dot, h-bq-size-status-dot |
| --bq-size-source-dot | 7px | 811, 817 | size-bq-size-source-dot, w-bq-size-source-dot, h-bq-size-source-dot |
| --bq-size-color-dot | 8px | 127, 432, 571, 796, 1098, 1152 | size-bq-size-color-dot, w-bq-size-color-dot, h-bq-size-color-dot |
| --bq-size-channel-glyph | 9px | 133, 372, 433 | size-bq-size-channel-glyph, w-bq-size-channel-glyph, h-bq-size-channel-glyph |
| --bq-size-legend | 10px | 601, 791 | size-bq-size-legend, w-bq-size-legend, h-bq-size-legend |
| --bq-size-icon-xs | 12px | 61, 448, 570, 799 | size-bq-size-icon-xs, w-bq-size-icon-xs, h-bq-size-icon-xs |
| --bq-size-settings-glyph | 13px | 1044 | size-bq-size-settings-glyph, w-bq-size-settings-glyph, h-bq-size-settings-glyph |
| --bq-size-legend-wide | 14px | 601 | size-bq-size-legend-wide, w-bq-size-legend-wide, h-bq-size-legend-wide |
| --bq-size-icon-sm | 15px | 60 | size-bq-size-icon-sm, w-bq-size-icon-sm, h-bq-size-icon-sm |
| --bq-size-15ch | 15ch | 399 | size-bq-size-15ch, w-bq-size-15ch, h-bq-size-15ch |
| --bq-size-switch-thumb | 16px | 76, 132, 289, 314, 366, 588, 1144, 2326 | size-bq-size-switch-thumb, w-bq-size-switch-thumb, h-bq-size-switch-thumb |
| --bq-size-icon | 18px | 59, 116, 197, 220, 221, 476, 616, 793, 1100 | size-bq-size-icon, w-bq-size-icon, h-bq-size-icon |
| --bq-size-phase-number | 19px | 515 | size-bq-size-phase-number, w-bq-size-phase-number, h-bq-size-phase-number |
| --bq-size-org-mark | 20px | 87, 112, 387, 394, 447, 1075 | size-bq-size-org-mark, w-bq-size-org-mark, h-bq-size-org-mark |
| --bq-size-switch-height | 22px | 288, 357, 606, 610, 687, 694, 992, 994, 1005, 1042, 1046, 1192 | size-bq-size-switch-height, w-bq-size-switch-height, h-bq-size-switch-height |
| --bq-size-compact-control | 24px | 176, 394, 471, 614, 700, 1157, 1179, 4275, 3310 | size-bq-size-compact-control, w-bq-size-compact-control, h-bq-size-compact-control |
| --bq-size-segment | 26px | 104, 107, 176, 575, 674, 726, 784, 822, 918, 935, 1005, 1094, 1135, 1179, 1242, 2760 | size-bq-size-segment, w-bq-size-segment, h-bq-size-segment |
| --bq-size-file-width | 28px | 110, 165, 228, 266, 327, 439, 586, 643, 822, 918, 952, 953, 961, 1097, 1147, 3532 | size-bq-size-file-width, w-bq-size-file-width, h-bq-size-file-width |
| --bq-size-avatar-pipeline | 30px | 117, 192, 265, 268, 348, 364, 513, 693, 706, 792, 1065, 1068, 1130, 1150, 1155, 1215, 1257, 1990, 3469 | size-bq-size-avatar-pipeline, w-bq-size-avatar-pipeline, h-bq-size-avatar-pipeline |
| --bq-size-31percent | 31% | 4074 | size-bq-size-31percent, w-bq-size-31percent, h-bq-size-31percent |
| --bq-size-icon-button | 32px | 78, 88, 95, 123, 204, 292, 320, 453, 473, 691, 725, 1034, 1039, 1108, 1134, 1175, 1227, 1240, 1267, 3636, 4045, 4065, 4077, 4417 | size-bq-size-icon-button, w-bq-size-icon-button, h-bq-size-icon-button |
| --bq-size-file-height | 34px | 72, 247, 327, 465 | size-bq-size-file-height, w-bq-size-file-height, h-bq-size-file-height |
| --bq-size-switch-width | 36px | 282, 288, 470, 644, 751, 764, 1266, 2766 | size-bq-size-switch-width, w-bq-size-switch-width, h-bq-size-switch-width |
| --bq-size-avatar-row | 38px | 130, 210, 856, 2229 | size-bq-size-avatar-row, w-bq-size-avatar-row, h-bq-size-avatar-row |
| --bq-size-rail-item | 40px | 73, 247, 261, 587, 1031, 4295 | size-bq-size-rail-item, w-bq-size-rail-item, h-bq-size-rail-item |
| --bq-size-40percent | 40% | 746 | size-bq-size-40percent, w-bq-size-40percent, h-bq-size-40percent |
| --bq-size-tile-large | 42px | 406, 568, 1045, 1217 | size-bq-size-tile-large, w-bq-size-tile-large, h-bq-size-tile-large |
| --bq-size-chart-count | 44px | 402, 794 | size-bq-size-chart-count, w-bq-size-chart-count, h-bq-size-chart-count |
| --bq-size-agenda-slot | 48px | 828 | size-bq-size-agenda-slot, w-bq-size-agenda-slot, h-bq-size-agenda-slot |
| --bq-size-settings-row | 50px | 1058 | size-bq-size-settings-row, w-bq-size-settings-row, h-bq-size-settings-row |
| --bq-size-toolbar | 52px | 82, 750, 762, 819 | size-bq-size-toolbar, w-bq-size-toolbar, h-bq-size-toolbar |
| --bq-size-jarvis-toolbar | 56px | 397, 659 | size-bq-size-jarvis-toolbar, w-bq-size-jarvis-toolbar, h-bq-size-jarvis-toolbar |
| --bq-size-56ch | 56ch | 400 | size-bq-size-56ch, w-bq-size-56ch, h-bq-size-56ch |
| --bq-size-textarea-small | 58px | 380, 454, 1258 | size-bq-size-textarea-small, w-bq-size-textarea-small, h-bq-size-textarea-small |
| --bq-size-58percent | 58% | 410 | size-bq-size-58percent, w-bq-size-58percent, h-bq-size-58percent |
| --bq-size-rail | 60px | 71 | size-bq-size-rail, w-bq-size-rail, h-bq-size-rail |
| --bq-size-chat-header | 62px | 224 | size-bq-size-chat-header, w-bq-size-chat-header, h-bq-size-chat-header |
| --bq-size-62vw | 62vw | 661 | size-bq-size-62vw, w-bq-size-62vw, h-bq-size-62vw |
| --bq-size-64ch | 64ch | 667 | size-bq-size-64ch, w-bq-size-64ch, h-bq-size-64ch |
| --bq-size-avatar-profile | 64px | 2300 | size-bq-size-avatar-profile, w-bq-size-avatar-profile, h-bq-size-avatar-profile |
| --bq-size-schedule-label | 70px | 1087 | size-bq-size-schedule-label, w-bq-size-schedule-label, h-bq-size-schedule-label |
| --bq-size-textarea | 72px | 1071 | size-bq-size-textarea, w-bq-size-textarea, h-bq-size-textarea |
| --bq-size-75ch | 75ch | 511 | size-bq-size-75ch, w-bq-size-75ch, h-bq-size-75ch |
| --bq-size-80percent | 80% | 234, 397 | size-bq-size-80percent, w-bq-size-80percent, h-bq-size-80percent |
| --bq-size-prompt-plain | 80px | 1137, 1229 | size-bq-size-prompt-plain, w-bq-size-prompt-plain, h-bq-size-prompt-plain |
| --bq-size-82percent | 82% | 1236 | size-bq-size-82percent, w-bq-size-82percent, h-bq-size-82percent |
| --bq-size-85percent | 85% | 678 | size-bq-size-85percent, w-bq-size-85percent, h-bq-size-85percent |
| --bq-size-86percent | 86% | 741 | size-bq-size-86percent, w-bq-size-86percent, h-bq-size-86percent |
| --bq-size-chat-status-compact | 86px | 1279 | size-bq-size-chat-status-compact, w-bq-size-chat-status-compact, h-bq-size-chat-status-compact |
| --bq-size-88percent | 88% | 757 | size-bq-size-88percent, w-bq-size-88percent, h-bq-size-88percent |
| --bq-size-chart-label | 92px | 794, 842, 1070, 1176 | size-bq-size-chart-label, w-bq-size-chart-label, h-bq-size-chart-label |
| --bq-size-94percent | 94% | 254 | size-bq-size-94percent, w-bq-size-94percent, h-bq-size-94percent |
| --bq-size-textarea-message | 96px | 550, 610, 915, 1280 | size-bq-size-textarea-message, w-bq-size-textarea-message, h-bq-size-textarea-message |
| --bq-size-100percent | 100% | 51, 55, 65, 123, 163, 187, 192, 210, 245, 261, 352, 380, 400, 401, 426, 453, 465, 541, 566, 567, 584, 629, 648, 652, 691, 706, 736, 746, 753, 784, 788, 797, 801, 892, 914, 961, 977, 1004, 1071, 1091, 1092, 1108, 1122, 1123, 1137, 1139, 1152, 1157, 1175, 1189, 1193, 1227, 1257, 1263 | size-bq-size-100percent, w-bq-size-100percent, h-bq-size-100percent |
| --bq-size-100vw | 100vw | 725 | size-bq-size-100vw, w-bq-size-100vw, h-bq-size-100vw |
| --bq-size-watchdog-column | 100px | 1252, 1260 | size-bq-size-watchdog-column, w-bq-size-watchdog-column, h-bq-size-watchdog-column |
| --bq-size-time-field | 118px | 1090, 1275 | size-bq-size-time-field, w-bq-size-time-field, h-bq-size-time-field |
| --bq-size-prompt | 120px | 261, 1228, 4041 | size-bq-size-prompt, w-bq-size-prompt, h-bq-size-prompt |
| --bq-size-chat-agent-compact | 124px | 1276 | size-bq-size-chat-agent-compact, w-bq-size-chat-agent-compact, h-bq-size-chat-agent-compact |
| --bq-size-130px | 130px | 4044, 4074 | size-bq-size-130px, w-bq-size-130px, h-bq-size-130px |
| --bq-size-tag-input | 140px | 611, 989 | size-bq-size-tag-input, w-bq-size-tag-input, h-bq-size-tag-input |
| --bq-size-chat-status | 150px | 1129, 4062 | size-bq-size-chat-status, w-bq-size-chat-status, h-bq-size-chat-status |
| --bq-size-kpi-min | 158px | 778 | size-bq-size-kpi-min, w-bq-size-kpi-min, h-bq-size-kpi-min |
| --bq-size-template-min | 160px | 1235, 1245 | size-bq-size-template-min, w-bq-size-template-min, h-bq-size-template-min |
| --bq-size-chart | 170px | 788, 1130, 3386 | size-bq-size-chart, w-bq-size-chart, h-bq-size-chart |
| --bq-size-email-nav-compact | 180px | 957 | size-bq-size-email-nav-compact, w-bq-size-email-nav-compact, h-bq-size-email-nav-compact |
| --bq-size-warning-min | 200px | 1186, 4041 | size-bq-size-warning-min, w-bq-size-warning-min, h-bq-size-warning-min |
| --bq-size-rail-expanded | 204px | 424 | size-bq-size-rail-expanded, w-bq-size-rail-expanded, h-bq-size-rail-expanded |
| --bq-size-pipeline-column | 205px | 863 | size-bq-size-pipeline-column, w-bq-size-pipeline-column, h-bq-size-pipeline-column |
| --bq-size-email-nav | 210px | 185, 885 | size-bq-size-email-nav, w-bq-size-email-nav, h-bq-size-email-nav |
| --bq-size-picker-max | 216px | 472 | size-bq-size-picker-max, w-bq-size-picker-max, h-bq-size-picker-max |
| --bq-size-menu-min | 230px | 122, 1069 | size-bq-size-menu-min, w-bq-size-menu-min, h-bq-size-menu-min |
| --bq-size-attachment-min | 250px | 245, 693 | size-bq-size-attachment-min, w-bq-size-attachment-min, h-bq-size-attachment-min |
| --bq-size-department-min | 260px | 700, 741 | size-bq-size-department-min, w-bq-size-department-min, h-bq-size-department-min |
| --bq-size-settings-nav | 264px | 1026 | size-bq-size-settings-nav, w-bq-size-settings-nav, h-bq-size-settings-nav |
| --bq-size-270px | 270px | 1545 | size-bq-size-270px, w-bq-size-270px, h-bq-size-270px |
| --bq-size-jarvis-nav | 272px | 638, 640 | size-bq-size-jarvis-nav, w-bq-size-jarvis-nav, h-bq-size-jarvis-nav |
| --bq-size-incoming-column | 276px | 143 | size-bq-size-incoming-column, w-bq-size-incoming-column, h-bq-size-incoming-column |
| --bq-size-email-list-compact | 280px | 957 | size-bq-size-email-list-compact, w-bq-size-email-list-compact, h-bq-size-email-list-compact |
| --bq-size-project-list | 300px | 493, 814, 1439 | size-bq-size-project-list, w-bq-size-project-list, h-bq-size-project-list |
| --bq-size-contact-side | 318px | 272, 274 | size-bq-size-contact-side, w-bq-size-contact-side, h-bq-size-contact-side |
| --bq-size-conversation-list | 320px | 198, 957, 1187 | size-bq-size-conversation-list, w-bq-size-conversation-list, h-bq-size-conversation-list |
| --bq-size-context-menu | 330px | 705 | size-bq-size-context-menu, w-bq-size-context-menu, h-bq-size-context-menu |
| --bq-size-email-list | 340px | 397, 617, 708, 885, 1137 | size-bq-size-email-list, w-bq-size-email-list, h-bq-size-email-list |
| --bq-size-automation-log | 360px | 925 | size-bq-size-automation-log, w-bq-size-automation-log, h-bq-size-automation-log |
| --bq-size-toast-max | 380px | 401, 725 | size-bq-size-toast-max, w-bq-size-toast-max, h-bq-size-toast-max |
| --bq-size-search-max | 420px | 88, 1195 | size-bq-size-search-max, w-bq-size-search-max, h-bq-size-search-max |
| --bq-size-canvas-max | 440px | 582, 661 | size-bq-size-canvas-max, w-bq-size-canvas-max, h-bq-size-canvas-max |
| --bq-size-department-max | 520px | 1190 | size-bq-size-department-max, w-bq-size-department-max, h-bq-size-department-max |
| --bq-size-message-max | 560px | 234, 254, 678, 1108, 1137 | size-bq-size-message-max, w-bq-size-message-max, h-bq-size-message-max |
| --bq-size-agenda-min | 720px | 352, 819 | size-bq-size-agenda-min, w-bq-size-agenda-min, h-bq-size-agenda-min |
| --bq-size-settings-max | 740px | 1049 | size-bq-size-settings-max, w-bq-size-settings-max, h-bq-size-settings-max |
| --bq-size-sheet-max | 760px | 541 | size-bq-size-sheet-max, w-bq-size-sheet-max, h-bq-size-sheet-max |
| --bq-size-dialog-height | 780px | 566, 664, 691 | size-bq-size-dialog-height, w-bq-size-dialog-height, h-bq-size-dialog-height |
| --bq-size-dialog-max | 1180px | 566 | size-bq-size-dialog-max, w-bq-size-dialog-max, h-bq-size-dialog-max |
| --bq-space-negative-84px | -84px | 1108 | gap-bq-space-negative-84px, p-bq-space-negative-84px, m-bq-space-negative-84px |
| --bq-space-negative-14px | -14px | 617 | gap-bq-space-negative-14px, p-bq-space-negative-14px, m-bq-space-negative-14px |
| --bq-space-negative-8px | -8px | 312 | gap-bq-space-negative-8px, p-bq-space-negative-8px, m-bq-space-negative-8px |
| --bq-space-negative-4-5px | -4.5px | 433 | gap-bq-space-negative-4-5px, p-bq-space-negative-4-5px, m-bq-space-negative-4-5px |
| --bq-space-none | 0px | 55, 57, 65, 76, 88, 104, 107, 110, 112, 116, 117, 123, 138, 139, 150, 192, 201, 204, 221, 224, 228, 233, 254, 257, 266, 268, 284, 292, 303, 305, 320, 335, 345, 348, 355, 357, 360, 361, 364, 387, 399, 400, 402, 406, 420, 422, 453, 465, 473, 484, 495, 496, 504, 511, 513, 542, 568, 575, 596, 605, 606, 610, 613, 614, 616, 644, 646, 659, 664, 666, 667, 681, 682, 687, 691, 693, 700, 703, 706, 762, 764, 771, 772, 802, 804, 822, 833, 849, 856, 872, 882, 904, 918, 932, 935, 951, 961, 977, 992, 1034, 1038, 1039, 1049, 1052, 1053, 1056, 1068, 1074, 1075, 1097, 1130, 1150, 1155, 1159, 1168, 1171, 1175, 1188, 1191, 1215, 1218, 1219, 1221, 1227, 1233, 1240, 1242, 1249, 1257, 1264, 1272, 1286, 1530, 2488, 2828, 2846, 2866, 3351, 3365, 3538, 3553, 4294, 4295, 4394, 4413, 4426, 4432 | gap-bq-space-none, p-bq-space-none, m-bq-space-none |
| --bq-space-hairline | 1px | 91, 191, 299, 314, 472, 604, 630, 675, 822, 831, 850, 881, 980, 1037, 1141, 1148 | gap-bq-space-hairline, p-bq-space-hairline, m-bq-space-hairline |
| --bq-space-micro | 2px | 103, 143, 161, 175, 213, 237, 263, 309, 347, 363, 585, 619, 652, 686, 782, 784, 799, 807, 853, 863, 868, 886, 892, 917, 932, 934, 948, 997, 1002, 1012, 1021, 1062, 1144, 1150, 1163, 1166, 1178, 1191, 1203, 1213, 1441, 289 | gap-bq-space-micro, p-bq-space-micro, m-bq-space-micro |
| --bq-space-step | 3px | 71, 191, 220, 233, 234, 344, 346, 347, 425, 479, 485, 545, 585, 588, 680, 792, 844, 974, 1014, 1196, 1209, 1212, 1219 | gap-bq-space-step, p-bq-space-step, m-bq-space-step |
| --bq-space-xs | 4px | 76, 92, 112, 126, 181, 187, 209, 238, 243, 259, 275, 276, 329, 336, 347, 355, 361, 405, 451, 472, 478, 496, 559, 615, 682, 693, 706, 779, 831, 832, 835, 856, 887, 888, 1003, 1004, 1038, 1053, 1056, 1074, 1150, 1152, 1153, 1154, 1226, 1238, 1246, 1264, 1286, 2488, 3116, 3303, 3469 | gap-bq-space-xs, p-bq-space-xs, m-bq-space-xs |
| --bq-space-label | 5px | 85, 91, 122, 139, 173, 220, 221, 279, 281, 308, 311, 376, 387, 431, 463, 489, 506, 606, 613, 621, 667, 687, 772, 822, 849, 944, 1018, 1075, 1138, 1148, 1153, 1171, 1212, 3362 | gap-bq-space-label, p-bq-space-label, m-bq-space-label |
| --bq-space-compact | 6px | 78, 85, 92, 104, 107, 110, 116, 126, 162, 180, 181, 208, 232, 233, 258, 259, 266, 277, 292, 299, 333, 334, 347, 364, 377, 379, 421, 440, 443, 456, 460, 470, 505, 512, 513, 600, 604, 605, 616, 644, 648, 668, 678, 686, 692, 693, 699, 700, 714, 791, 810, 816, 833, 850, 854, 879, 881, 887, 890, 905, 912, 918, 933, 935, 948, 951, 952, 954, 955, 965, 973, 1001, 1047, 1087, 1089, 1096, 1097, 1105, 1130, 1142, 1197, 1239, 1241, 1242, 1256, 1272, 2488, 3543, 4432 | gap-bq-space-compact, p-bq-space-compact, m-bq-space-compact |
| --bq-space-control | 7px | 85, 112, 117, 163, 228, 268, 309, 312, 336, 337, 340, 377, 387, 443, 479, 497, 513, 630, 648, 693, 795, 831, 844, 854, 869, 873, 969, 1004, 1007, 1034, 1055, 1075, 1150, 1154, 1166, 1168, 1169, 1172, 1174, 1213, 1221, 1233, 1441, 2365, 2793 | gap-bq-space-control, p-bq-space-control, m-bq-space-control |
| --bq-space-sm | 8px | 83, 88, 110, 140, 146, 172, 199, 200, 204, 207, 209, 214, 233, 254, 255, 259, 292, 303, 310, 312, 320, 331, 335, 344, 359, 361, 378, 382, 385, 386, 401, 406, 441, 443, 454, 457, 458, 465, 470, 473, 477, 482, 494, 496, 501, 508, 520, 544, 558, 569, 606, 610, 644, 646, 648, 652, 655, 659, 671, 681, 682, 687, 689, 691, 700, 713, 749, 773, 802, 803, 805, 806, 820, 843, 844, 872, 876, 887, 888, 895, 903, 907, 913, 914, 940, 942, 945, 951, 961, 974, 988, 992, 1004, 1009, 1012, 1013, 1061, 1066, 1071, 1093, 1103, 1104, 1138, 1139, 1155, 1159, 1176, 1190, 1199, 1203, 1207, 1214, 1215, 1218, 1220, 1231, 1235, 1236, 1245, 1257, 1272, 1996, 3308, 3469, 3529, 4394 | gap-bq-space-sm, p-bq-space-sm, m-bq-space-sm |
| --bq-space-row | 9px | 85, 92, 123, 126, 141, 156, 160, 163, 187, 192, 240, 266, 304, 320, 328, 340, 348, 357, 364, 380, 385, 393, 418, 431, 450, 473, 479, 614, 641, 652, 706, 820, 852, 868, 872, 882, 908, 935, 944, 951, 974, 979, 992, 1009, 1028, 1108, 1138, 1139, 1150, 1154, 1161, 1169, 1172, 1183, 1222, 1228, 1249, 1441, 3116, 4446 | gap-bq-space-row, p-bq-space-row, m-bq-space-row |
| --bq-space-item | 10px | 72, 88, 104, 107, 110, 141, 146, 150, 151, 163, 185, 199, 204, 210, 228, 232, 233, 245, 259, 280, 284, 292, 296, 312, 323, 344, 353, 401, 405, 419, 424, 453, 454, 465, 477, 568, 575, 594, 595, 605, 613, 625, 641, 647, 672, 679, 778, 779, 794, 807, 843, 854, 873, 882, 886, 887, 890, 892, 903, 913, 914, 926, 927, 929, 942, 943, 954, 955, 961, 968, 988, 1028, 1034, 1038, 1039, 1047, 1058, 1068, 1071, 1097, 1102, 1103, 1108, 1130, 1139, 1161, 1175, 1176, 1183, 1185, 1190, 1193, 1203, 1222, 1225, 1227, 1228, 1240, 1242, 1252, 1530, 2186, 3624, 4074, 4294, 4295, 4475 | gap-bq-space-item, p-bq-space-item, m-bq-space-item |
| --bq-space-panel | 11px | 160, 210, 224, 245, 304, 328, 331, 380, 426, 450, 482, 497, 507, 513, 545, 676, 725, 807, 868, 873, 944, 961, 979, 1009, 1028, 1105, 1161, 1168, 1193, 1208, 1222, 1236, 1246 | gap-bq-space-panel, p-bq-space-panel, m-bq-space-panel |
| --bq-space-md | 12px | 71, 82, 117, 141, 146, 151, 181, 185, 209, 224, 240, 254, 259, 268, 275, 284, 296, 304, 331, 353, 356, 362, 378, 450, 482, 496, 503, 541, 545, 568, 584, 621, 641, 644, 646, 668, 670, 672, 703, 725, 756, 779, 785, 851, 863, 886, 888, 906, 907, 1027, 1058, 1082, 1087, 1102, 1103, 1105, 1187, 1189, 1193, 1208, 1216, 1220, 1235, 1246, 1272, 1530, 2488, 4393 | gap-bq-space-md, p-bq-space-md, m-bq-space-md |
| --bq-space-kpi | 13px | 679, 779, 868, 927, 943, 1183, 1185, 1208 | gap-bq-space-kpi, p-bq-space-kpi, m-bq-space-kpi |
| --bq-space-section | 14px | 65, 136, 137, 143, 146, 186, 199, 254, 276, 280, 284, 292, 303, 356, 362, 494, 502, 505, 507, 568, 593, 594, 599, 613, 617, 618, 641, 659, 664, 721, 725, 756, 769, 770, 790, 814, 892, 903, 906, 907, 913, 924, 943, 961, 1027, 1050, 1058, 1082, 1108, 1116, 1159, 1220, 1252, 4294, 291 | gap-bq-space-section, p-bq-space-section, m-bq-space-section |
| --bq-space-card | 15px | 353, 927 | gap-bq-space-card, p-bq-space-card, m-bq-space-card |
| --bq-space-lg | 16px | 65, 82, 222, 224, 259, 275, 276, 296, 303, 353, 369, 392, 396, 507, 540, 594, 665, 670, 703, 1027, 1036, 1116, 1159, 1231, 2488 | gap-bq-space-lg, p-bq-space-lg, m-bq-space-lg |
| --bq-space-content | 18px | 136, 181, 232, 353, 356, 378, 385, 396, 402, 502, 541, 664, 682, 769, 903, 906, 913, 4295 | gap-bq-space-content, p-bq-space-content, m-bq-space-content |
| --bq-space-page | 20px | 136, 369, 406, 541, 664, 769, 1027, 1049 | gap-bq-space-page, p-bq-space-page, m-bq-space-page |
| --bq-space-detail | 22px | 232, 351, 395, 502, 565, 664 | gap-bq-space-detail, p-bq-space-detail, m-bq-space-detail |
| --bq-space-xl | 24px | 392, 396, 502, 1049 | gap-bq-space-xl, p-bq-space-xl, m-bq-space-xl |
| --bq-space-settings | 28px | 1049 | gap-bq-space-settings, p-bq-space-settings, m-bq-space-settings |
| --bq-space-empty | 30px | 222, 3553, 4295 | gap-bq-space-empty, p-bq-space-empty, m-bq-space-empty |
| --bq-space-hero | 40px | 396 | gap-bq-space-hero, p-bq-space-hero, m-bq-space-hero |
| --bq-space-canvas | 48px | 584 | gap-bq-space-canvas, p-bq-space-canvas, m-bq-space-canvas |
| --bq-space-save-reserve | 100px | 1049, 1116 | gap-bq-space-save-reserve, p-bq-space-save-reserve, m-bq-space-save-reserve |
| --bq-stroke-fine | 1 | 524, 535 | stroke-bq-stroke-fine |
| --bq-stroke-flow-edge | 1.4 | 532 | stroke-bq-stroke-flow-edge |
| --bq-stroke-flow-current | 1.6 | 527 | stroke-bq-stroke-flow-current |
| --bq-stroke-icon | 1.75 | 59 | stroke-bq-stroke-icon |
| --bq-stroke-flow-selected | 1.8 | 528 | stroke-bq-stroke-flow-selected |
| --bq-stroke-check | 2 | 539 | stroke-bq-stroke-check |
| --bq-stroke-icon-xs | 2.2 | 61, 448 | stroke-bq-stroke-icon-xs |
| --bq-stroke-channel | 2.6 | 133 | stroke-bq-stroke-channel |
| --bq-stroke-window-control | 3 | 571 | stroke-bq-stroke-window-control |
| --bq-text-5-2vw | 5.2vw | 399 | text-bq-text-5-2vw |
| --bq-text-file-micro | 7px | 694, 1005 | text-bq-text-file-micro |
| --bq-text-file-label | 8.5px | 197, 247 | text-bq-text-file-label |
| --bq-text-mark | 9px | 476 | text-bq-text-mark |
| --bq-text-chart-label | 9.5px | 76, 87, 789, 792, 1148 | text-bq-text-chart-label |
| --bq-text-phase-number | 10px | 515, 536, 825, 837, 856, 934, 948, 4275 | text-bq-text-phase-number |
| --bq-text-counter | 10.5px | 91, 106, 116, 126, 187, 221, 243, 299, 339, 354, 357, 361, 384, 385, 475, 534, 604, 616, 619, 648, 802, 843, 881, 888, 899, 947, 951, 975, 994, 1023, 1038, 1040, 1099, 1135, 1138, 1171, 1199, 3383, 4394 | text-bq-text-counter |
| --bq-text-metadata | 11px | 78, 112, 125, 161, 196, 216, 233, 281, 309, 310, 318, 329, 374, 387, 440, 451, 452, 531, 587, 589, 622, 630, 634, 657, 675, 686, 687, 703, 783, 798, 850, 870, 871, 879, 940, 1012, 1075, 1107, 1166, 1191, 1205, 1213, 1238, 1988, 3541 | text-bq-text-metadata |
| --bq-text-auxiliary | 11.5px | 92, 148, 149, 159, 168, 238, 253, 266, 275, 287, 311, 326, 333, 335, 337, 340, 443, 445, 463, 470, 477, 489, 501, 549, 599, 606, 610, 614, 693, 700, 780, 790, 810, 816, 820, 831, 860, 887, 901, 950, 964, 969, 999, 1004, 1018, 1033, 1064, 1074, 1086, 1102, 1143, 1165, 1169, 1172, 1198, 1226, 1247, 1255, 1264, 2760, 2817, 2847, 3306, 3308, 3309 | text-bq-text-auxiliary |
| --bq-text-control | 12px | 104, 107, 110, 173, 180, 181, 202, 227, 228, 278, 279, 330, 345, 360, 409, 431, 458, 484, 505, 513, 520, 550, 575, 621, 627, 726, 782, 794, 847, 908, 918, 932, 933, 942, 944, 961, 963, 977, 979, 988, 1008, 1009, 1047, 1056, 1067, 1088, 1089, 1097, 1103, 1179, 1206, 1211, 1228, 1242, 1259 | text-bq-text-control |
| --bq-text-row | 12.5px | 117, 123, 141, 167, 218, 255, 257, 268, 286, 305, 316, 321, 325, 328, 332, 348, 358, 362, 364, 376, 380, 453, 465, 473, 481, 483, 530, 573, 597, 667, 672, 689, 706, 725, 801, 858, 877, 878, 895, 900, 909, 914, 921, 976, 998, 1035, 1039, 1053, 1068, 1105, 1108, 1130, 1142, 1151, 1155, 1164, 1175, 1183, 1185, 1203, 1215, 1219, 1221, 1222, 1227, 1229, 1236, 1240, 1246, 1257, 1286, 1441, 2866, 4278 | text-bq-text-row |
| --bq-text-body | 13px | 55, 72, 147, 158, 160, 252, 298, 395, 427, 500, 509, 511, 548, 656, 869, 911, 972, 1032, 1063, 1085, 1197, 1210, 1254, 4295 | text-bq-text-body |
| --bq-text-message | 13.5px | 215, 240, 261, 406, 679, 680, 931 | text-bq-text-message |
| --bq-text-profile-initial | 14px | 1031, 2488, 4038 | text-bq-text-profile-initial |
| --bq-text-chat-title | 14.5px | 226 | text-bq-text-chat-title |
| --bq-text-heading | 15px | 398, 400, 428, 642, 857 | text-bq-text-heading |
| --bq-text-profile-name | 16px | 277 | text-bq-text-profile-name |
| --bq-text-list-title | 17px | 201, 355, 495, 596, 821 | text-bq-text-list-title |
| --bq-text-dialog-title | 18px | 542, 904, 3538 | text-bq-text-dialog-title |
| --bq-text-brand | 19px | 393 | text-bq-text-brand |
| --bq-text-detail-title | 22px | 504, 626, 809, 1052, 1218 | text-bq-text-detail-title |
| --bq-text-kpi | 23px | 781 | text-bq-text-kpi |
| --bq-text-page-title | 24px | 138, 666, 771 | text-bq-text-page-title |
| --bq-text-hero-sm | 32px | 399 | text-bq-text-hero-sm |
| --bq-text-hero-lg | 62px | 399 | text-bq-text-hero-lg |
| --bq-tracking-hero | -0.03em | 399 | tracking-bq-tracking-hero |
| --bq-tracking-display | -0.02em | 72, 138, 393, 428, 504, 626, 666, 771, 781, 1052, 1218 | tracking-bq-tracking-display |
| --bq-tracking-heading | -0.015em | 201, 495, 542, 596, 642, 904 | tracking-bq-tracking-heading |
| --bq-tracking-profile | -0.01em | 277, 355 | tracking-bq-tracking-profile |
| --bq-tracking-normal | 0 | 782 | tracking-bq-tracking-normal |
| --bq-tracking-avatar | 0.01em | 130 | tracking-bq-tracking-avatar |
| --bq-tracking-kind | 0.03em | 398, 1148 | tracking-bq-tracking-kind |
| --bq-tracking-file | 0.04em | 247, 802, 948, 1012 | tracking-bq-tracking-file |
| --bq-tracking-label | 0.05em | 357, 843, 934, 1038, 1138, 1191 | tracking-bq-tracking-label |
| --bq-tracking-section | 0.06em | 126, 275, 619, 888 | tracking-bq-tracking-section |
| --bq-tracking-nav | 0.07em | 187, 648 | tracking-bq-tracking-nav |
| --bq-tracking-eyebrow | 0.08em | 354, 361, 536 | tracking-bq-tracking-eyebrow |
| --bq-weight-light | 300 | 399 | font-bq-weight-light |
| --bq-weight-regular | 400 | 216, 233, 243, 318, 531, 1107, 1247 | font-bq-weight-regular |
| --bq-weight-medium | 500 | 91, 92, 104, 106, 112, 116, 117, 125, 138, 167, 196, 219, 252, 268, 299, 311, 325, 339, 343, 374, 384, 385, 387, 393, 398, 406, 427, 431, 443, 451, 452, 464, 481, 489, 504, 530, 534, 542, 596, 604, 606, 626, 630, 644, 656, 666, 700, 771, 781, 783, 789, 792, 798, 802, 809, 821, 825, 837, 843, 847, 856, 857, 870, 871, 879, 881, 896, 899, 904, 940, 947, 951, 965, 998, 1023, 1040, 1052, 1063, 1067, 1075, 1099, 1102, 1103, 1105, 1130, 1142, 1166, 1171, 1199, 1206, 1218, 1226, 1254, 1259, 1539, 3386, 3538 | font-bq-weight-medium |
| --bq-weight-semibold | 600 | 72, 76, 78, 84, 87, 142, 147, 158, 187, 197, 201, 215, 221, 226, 238, 255, 275, 277, 286, 298, 332, 342, 354, 355, 357, 361, 375, 428, 445, 470, 483, 495, 500, 509, 515, 536, 548, 574, 619, 642, 648, 684, 704, 832, 859, 869, 877, 909, 931, 934, 948, 963, 972, 976, 977, 981, 990, 994, 1010, 1012, 1031, 1032, 1038, 1056, 1135, 1138, 1148, 1164, 1170, 1179, 1184, 1191, 1197, 1210, 1243, 1246, 1286, 2216, 2858, 3465, 3617, 4275 | font-bq-weight-semibold |
| --bq-weight-bold | 700 | 247, 476, 897, 4038 | font-bq-weight-bold |
| --bq-switch-thumb-on | #ffffff | 291 | bg-bq-switch-thumb-on |

### Avatar opt-in

O Avatar existente não muda por padrão. A classe bq-avatar-mockup aplica a geometria de .av (L130–133) e ajusta o span de iniciais existente: font-size = tamanho × --bq-avatar-font-ratio, peso semibold, tracking-avatar, av-fg, fundo oklch(av-l av-c hue). bq-avatar-pipeline/contact/row/profile usam respectivamente 30/36/38/64px; bq-avatar-group usa raio30%, pessoa50%. --bq-avatar-hue pode ser herdado de um contêiner; o fallback250 é o de .me (L78). Não substitui foto disponível nem inventa a existência de grupo.

Para reproduzir hue(name), M1608: iniciar h=0; para cada caractere de String(name), h=(h*31+charCodeAt(0))%360; se15≤h≤85, retornar h+140, senão h. Trata-se de derivação visual determinística do nome real, não de categoria semântica. As chamadas de avatar do mockup (M1939–1941) só escolhem o tamanho e indicam grupo quando kind==='grupo'.

### Chave e cabeçalho

Switch preserva role/aria-checked/label/disabled/onChange. Geometria .sw (M288–291): 36×22px, borda1px hair-strong, raio11px, polegar16px com inset2px, deslocamento14px. Desligado usa t2; ligado usa switch-thumb-on branco constante e trilho ok, nos dois temas.

Cabeçalho: .toolbar gap12px (M82); .search margin-inline:auto (M88) é quem distribui espaço. Ao ocultá-la em1120px (M732), breadcrumb, indicador e sino seguem a ordem DOM com gap12px. O estado continua vindo do socket real. Os demais recuos e alturas da casca ficam como estavam.


### Suporte aditivo L4/L7 · fidelidade 2

Os tokens anteriores permanecem intactos. Coeficientes e cores abaixo estão no YAML e em @theme static, com valor literal. --bq-sender-l/c escolhem dark/light, preservando data-mode; hue é dado, nunca cor solta.

| Token | Valor | Linha do mockup |
|---|---|---|
| --bq-sender-l-dark | 0.72 | 238 |
| --bq-sender-c-dark | 0.11 | 238 |
| --bq-sender-l-light | 0.5 | 239 |
| --bq-sender-c-light | 0.12 | 239 |
| --bq-owner-l | 0.5 | 1135 |
| --bq-owner-c | 0.08 | 1135 |
| --bq-on-channel | #ffffff | 132 |
| --bq-on-agent-forced | #ffffff | 1133 |
| --bq-on-avatar-owner | #ffffff | 1135 |
| --bq-blur-contact | 28px | 731 |
| --bq-saturate-contact | 170% | 731 |
| --bq-layer-contact | 20 | 731 |
| --bq-opacity-dragging | 0.45 | 875 |

- .av (130): Avatar com bq-avatar-mockup; bq-avatar-contact/pipeline/profile dão 36/30/64px. O tamanho padrão é 38px. 20.48px = 64px × avatar-font-ratio0.32, sem arredondamento. Pessoa círculo, bq-avatar-group dá 30%. Fotos/alt continuam intactos.
- Matiz (1608): importar mockupAvatarHue de @/components/ui/avatar-hue; aplicar --bq-avatar-hue no wrapper via CSSProperties. É o hash literal por nome, com deslocamento da faixa15–85; não substitui uma cor configurada pelo usuário.
- .who-l (238–239): bq-sender-mockup usa 11.5px/600, padding4px, oklch(.72 .11 hue) escuro e oklch(.5 .12 hue) claro.
- .nitem .sq (197): bq-group-swatch usa18×18/raio6/8.5px e av-l/av-c/av-fg. .org .sq (87) continua accent-soft/accent-text,20×20/raio6/9.5px: é outro papel, não avatar de grupo.
- .chb (132–133): bq-channel-badge como irmão de Avatar dentro de wrapper relative; --bq-channel-color recebe var(--bq-wa/ig/mail/tg), nunca hex local.16×16, right/bottom -space-micro, halo border-focus2px win-solid, glifo9/traço2.6. O irmão evita recortar o selo no overflow-hidden de Avatar.
- .own-btn .av-mini (1135): Avatar com bq-avatar-mockup bq-avatar-owner,26px/10.5px, branco/oklch(.5 .08 hue). Sem responsável, aplicar raised-2/t3/hair-strong e conteúdo honesto da raia.
- Status (1619): Novo→info; Em atendimento→warn; Aguardando cliente→agent; Resolvido→ok. A raia usa apenas estados reais suportados. Não inferir semântica dos enums não mapeados.
- IA (1130–1133): padrão agent-soft/agent-text; pausada warn-soft/warn; forçada agent/on-agent-forced (branco em ambos). on-accent muda no escuro e NÃO equivale a esse branco.
- Canal (1611–1616): WhatsApp wa#25d366, Instagram ig#e1306c, E-mail mail#5b8def, Telegram tg#2aabee; tokens já existentes, constantes entre temas.
- Contrato de métricas: blur-bq-contact e backdrop-blur-bq-contact=28px; backdrop-bq-contact compõe blur28px + saturate170%; z-bq-contact=20 (731). opacity-bq-dragging=.45 (875). Para aplicações CSS diretas, usar var(--bq-*) acima.
- Espaço -2px do selo = calc(-1 * var(--bq-space-micro)); anel4px do compositor = --bq-space-xs; 40% da lista de Projetos = --bq-size-40percent; colunas mínimas340px = --bq-size-email-list (mesmo valor literal), gap14px = --bq-space-section.

Não são mudanças de tela: a adoção pelas raias é explícita e deve passar pelos seus próprios gates de acessibilidade. Nenhum tom foi ajustado para contraste nesta publicação.

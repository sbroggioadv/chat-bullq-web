'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

type Mode = 'light' | 'dark' | 'system';

interface ThemeModeToggleProps {
  /** `compact` = botão único 32px (header/sidebar). `expanded` = 3 segmentos (settings). */
  variant?: 'compact' | 'expanded';
  className?: string;
}

/**
 * Toggle do tema claro/escuro. Persistência automática via next-themes
 * (`localStorage[bullq2-theme-mode]`). Respeita `prefers-color-scheme`
 * no boot quando o user não escolheu manualmente.
 *
 * Animação de 150ms é tratada no body via `transition` no globals.css,
 * então a troca é fluida sem precisar de motion lib aqui.
 */
export function ThemeModeToggle({ variant = 'compact', className }: ThemeModeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch — antes do mount não sabemos qual tema o user prefere.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Carregando preferência de tema"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-fg-muted',
          className,
        )}
        disabled
      >
        <Sun className="size-4 opacity-50" />
      </button>
    );
  }

  if (variant === 'expanded') {
    const options: Array<{ value: Mode; label: string; icon: typeof Sun }> = [
      { value: 'light', label: 'Claro', icon: Sun },
      { value: 'dark', label: 'Escuro', icon: Moon },
      { value: 'system', label: 'Sistema', icon: Monitor },
    ];
    return (
      <div
        role="radiogroup"
        aria-label="Tema da interface"
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1',
          className,
        )}
      >
        {options.map((opt) => {
          const active = theme === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-fg-muted hover:bg-muted hover:text-fg',
              )}
            >
              <Icon className="size-4" />
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Compact: botão único que alterna light <-> dark. Long-press não vale — UX clara.
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-pressed={isDark}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors',
        'hover:bg-muted hover:text-fg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      {/* Sol e Lua sobrepostos com transição de opacidade/escala suave (sem JS extra) */}
      <Sun
        className={cn(
          'absolute size-4 transition-all duration-200',
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
      />
      <Moon
        className={cn(
          'absolute size-4 transition-all duration-200',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
        )}
      />
      {/* Spacer pra dar tamanho ao botão (Sun/Moon são absolutos) */}
      <span className="block size-4 opacity-0" aria-hidden />
    </button>
  );
}

'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from 'lucide-react';
import { sanitizeEmailHtml, htmlToPlainText } from '../lib/email-sanitize';

interface EmailRichEditorProps {
  valueHtml: string;
  onChange: (html: string, plain: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

/**
 * Editor rich-text mínimo (contentEditable + execCommand).
 * Saída sempre sanitizada. Sem TipTap/Quill — KISS.
 */
export function EmailRichEditor({
  valueHtml,
  onChange,
  placeholder = 'Escreva…',
  rows = 5,
  disabled = false,
}: EmailRichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>('');

  // Sync externo → DOM só quando valor mudou de fora
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const safe = sanitizeEmailHtml(valueHtml) || '';
    if (safe === lastEmitted.current) return;
    if (el.innerHTML !== safe) {
      el.innerHTML = safe || '';
    }
  }, [valueHtml]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const raw = el.innerHTML;
    const safe = sanitizeEmailHtml(raw);
    // se o sanitize limpou algo, reescreve o DOM
    if (safe !== raw) {
      const sel = saveSelection(el);
      el.innerHTML = safe;
      restoreSelection(el, sel);
    }
    lastEmitted.current = safe;
    onChange(safe, htmlToPlainText(safe));
  }, [onChange]);

  const cmd = (command: string, value?: string) => {
    if (disabled) return;
    ref.current?.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      /* ignore unsupported */
    }
    emit();
  };

  const onLink = () => {
    if (disabled) return;
    const url = window.prompt('URL do link (https://…)', 'https://');
    if (!url) return;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed) && !/^mailto:/i.test(trimmed)) {
      return;
    }
    cmd('createLink', trimmed);
  };

  const minH = Math.max(3, rows) * 1.5;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-white px-1.5 py-1 dark:border-zinc-800 dark:bg-zinc-950">
        <ToolbarBtn
          label="Negrito"
          onClick={() => cmd('bold')}
          disabled={disabled}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          label="Itálico"
          onClick={() => cmd('italic')}
          disabled={disabled}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          label="Sublinhado"
          onClick={() => cmd('underline')}
          disabled={disabled}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
        <ToolbarBtn
          label="Lista"
          onClick={() => cmd('insertUnorderedList')}
          disabled={disabled}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          label="Lista numerada"
          onClick={() => cmd('insertOrderedList')}
          disabled={disabled}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Link" onClick={onLink} disabled={disabled}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline
        aria-label={placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className="email-rich-editor max-h-64 overflow-y-auto px-3 py-2 text-sm text-zinc-900 outline-none empty:before:pointer-events-none empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)] dark:text-zinc-100 dark:empty:before:text-zinc-500 [&_a]:text-primary [&_a]:underline"
        style={{ minHeight: `${minH}rem` }}
      />
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => {
        // evita perder seleção do contentEditable
        e.preventDefault();
        onClick();
      }}
      className="inline-flex size-7 items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function saveSelection(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function restoreSelection(root: HTMLElement, range: Range | null) {
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  try {
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    root.focus();
  }
}

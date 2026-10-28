'use client';

import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItems, MenuItem, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { X } from 'lucide-react';

export function Button({ variant = 'default', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'solid' | 'agent' }) {
  return <button type="button" className={`bq-button ${className}`} data-variant={variant} {...props} />;
}
export function Pill({ tone = 'default', children }: { tone?: 'default' | 'agent' | 'info'; children: ReactNode }) {
  return <span className="bq-pill" data-tone={tone}>{children}</span>;
}
export function SegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className="bq-segments" role="group" aria-label={label}>{options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
export function FoundationMenu({ label, items }: { label: string; items: { label: string; onClick: () => void; disabled?: boolean }[] }) {
  return <Menu><MenuButton className="bq-button">{label}</MenuButton><MenuItems anchor="bottom start" className="bq-popover">{items.map((item) => <MenuItem key={item.label} disabled={item.disabled}><button type="button" disabled={item.disabled} onClick={item.onClick}>{item.label}</button></MenuItem>)}</MenuItems></Menu>;
}
export function FoundationPopover({ label, children }: { label: string; children: ReactNode }) {
  return <Popover><PopoverButton className="bq-button">{label}</PopoverButton><PopoverPanel anchor="bottom start" className="bq-popover">{children}</PopoverPanel></Popover>;
}
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return <Dialog open={open} onClose={onClose} className="bq-dialog relative z-50"><DialogBackdrop className="bq-scrim fixed inset-0" /><DialogPanel className="bq-drawer fixed inset-y-0 right-0 w-full max-w-md overflow-y-auto p-4"><div className="flex items-center justify-between"><DialogTitle>{title}</DialogTitle><button type="button" className="bq-icon" aria-label="Fechar painel" onClick={onClose}><X size={18} /></button></div>{children}</DialogPanel></Dialog>;
}
export function MacWindow({ open, onClose, onMinimize, onMaximize, title, children }: { open: boolean; onClose: () => void; onMinimize?: () => void; onMaximize?: () => void; title: string; children: ReactNode }) {
  return <Dialog open={open} onClose={onClose} className="bq-dialog relative z-50"><DialogBackdrop className="bq-scrim fixed inset-0" /><div className="fixed inset-0 flex items-center justify-center p-4"><DialogPanel className="bq-dialog-panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden"><div className="bq-toolbar"><div className="bq-lights"><button type="button" aria-label="Fechar janela" onClick={onClose} /><button type="button" aria-label="Minimizar janela" disabled={!onMinimize} onClick={onMinimize} /><button type="button" aria-label="Maximizar janela" disabled={!onMaximize} onClick={onMaximize} /></div><DialogTitle>{title}</DialogTitle></div><div className="overflow-y-auto p-4">{children}</div></DialogPanel></div></Dialog>;
}
export function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="bq-switch" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}><span /></button>;
}
export function SettingRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = useId();
  return <div className="bq-setting-row" role="group" aria-labelledby={id}><div><h3 id={id}>{title}</h3>{description && <p>{description}</p>}</div>{children}</div>;
}
export function PageSkeleton() {
  return <div role="status" aria-label="Carregando página" aria-busy="true" className="h-full space-y-4 p-6"><span className="sr-only">Carregando…</span><div aria-hidden="true" className="bq-skeleton h-7 w-44" /><div aria-hidden="true" className="flex gap-2">{[0,1,2].map((item) => <div key={item} className="bq-skeleton h-8 w-24" />)}</div><div aria-hidden="true" className="space-y-3">{[0,1,2,3,4].map((item) => <div key={item} className="bq-skeleton h-14 w-full" />)}</div></div>;
}

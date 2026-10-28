'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, MacWindow } from '@/components/ui/foundation';
import { channelsService, type Channel, type UpdateChannelPayload } from '@/features/channels/services/channels.service';

interface EditChannelDialogProps {
  channel: Channel | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditChannelDialog({ channel, onClose, onSaved }: EditChannelDialogProps) {
  return channel ? <ChannelEditor key={channel.id} channel={channel} onClose={onClose} onSaved={onSaved} /> : null;
}

function ChannelEditor({ channel, onClose, onSaved }: EditChannelDialogProps & { channel: Channel }) {
  const [name, setName] = useState(channel.name);
  // Apenas a intenção de edição, nunca os valores salvos no servidor.
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [secretAction, setSecretAction] = useState<'keep' | 'replace' | 'clear'>('keep');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const fields = fieldsFor(channel.type);
  const dirty = name.trim() !== channel.name || Object.keys(config).length > 0 || secretAction !== 'keep';
  const invalid = !name.trim() || (secretAction === 'replace' && !secret.trim()) || fields.some(f => f.key in config && config[f.key] !== null && !config[f.key]?.trim());
  const discardField = (key: string) => setConfig(previous => {
    const next = { ...previous }; delete next[key]; return next;
  });
  const save = async () => {
    if (!dirty || invalid || saving) return;
    const patch: UpdateChannelPayload = {};
    if (name.trim() !== channel.name) patch.name = name.trim();
    if (Object.keys(config).length) patch.config = config;
    if (secretAction === 'replace') patch.webhookSecret = secret.trim();
    if (secretAction === 'clear') patch.webhookSecret = null;
    setSaving(true);
    try {
      await channelsService.update(channel.id, patch);
      toast.success('Canal atualizado'); onSaved(); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao atualizar canal'); }
    finally { setSaving(false); }
  };
  const inputClass = 'w-full rounded-lg border border-[var(--bq-hair-strong)] bg-[var(--bq-raised)] px-3 py-2 text-sm text-[var(--bq-t1)]';
  return <MacWindow open onClose={() => { if (!saving) onClose(); }} title="Editar credenciais">
    <form className="space-y-5 text-[var(--bq-t1)]" onSubmit={event => { event.preventDefault(); void save(); }}>
      <p className="text-xs text-[var(--bq-t3)]">As credenciais salvas não são exibidas. Preencha somente o que deseja trocar.</p>
      <label className="block text-sm">Nome do canal<input className={inputClass} value={name} onChange={event => setName(event.target.value)} /></label>
      {fields.map(field => <div key={field.key} className="space-y-2">
        <label className="block text-sm" htmlFor={`channel-${field.key}`}>{field.label} {field.optional ? '(opcional)' : ''} · {channel.configFields?.[field.key] === true ? 'Preenchido' : 'Vazio'}</label>
        <input id={`channel-${field.key}`} className={inputClass} type={field.secret ? "password" : "text"} autoComplete={field.secret ? "new-password" : "off"} disabled={config[field.key] === null} placeholder="Cole um novo valor para trocar" value={config[field.key] ?? ''} onChange={event => { const value = event.target.value; if (!value) discardField(field.key); else setConfig(previous => ({ ...previous, [field.key]: value })); }} />
        <div className="flex gap-2">
          {field.optional && <Button onClick={() => setConfig(previous => ({ ...previous, [field.key]: null }))}>Limpar {field.label}</Button>}
          {field.key in config && <Button onClick={() => discardField(field.key)}>Manter valor salvo</Button>}
        </div>
        {config[field.key] === null && <p className="text-xs text-[var(--bq-warn)]">Este campo será removido ao salvar.</p>}
      </div>)}
      <label className="block text-sm">Webhook Secret<select aria-label="Ação do Webhook Secret" className={inputClass} value={secretAction} onChange={event => { setSecretAction(event.target.value as typeof secretAction); setSecret(''); }}>
        <option value="keep">Manter sem alteração</option><option value="replace">Trocar segredo</option><option value="clear">Limpar segredo</option>
      </select></label>
      {secretAction === 'replace' && <label className="block text-sm">Novo Webhook Secret<input className={inputClass} type="password" autoComplete="new-password" value={secret} onChange={event => setSecret(event.target.value)} /></label>}
      {secretAction === 'clear' && <p className="text-xs text-[var(--bq-warn)]">O segredo será removido ao salvar.</p>}
      <div className="flex items-center justify-end gap-2"><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button variant="solid" type="submit" disabled={!dirty || invalid || saving}>{saving ? 'Salvando…' : 'Salvar'}</Button></div>
    </form>
  </MacWindow>;
}

interface FieldDef {
  secret?: boolean;
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
}

/** Field set per channel type — mirrors create-channel-dialog. */
function fieldsFor(type: Channel['type']): FieldDef[] {
  if (type === 'WHATSAPP_OFFICIAL') {
    return [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: 'Encontrado no Meta Business Suite' },
      { key: 'accessToken', secret: true, label: 'Access Token', placeholder: 'System User Token ou Temporary Token' },
      { key: 'appSecret', secret: true, label: 'App Secret', placeholder: 'Chave secreta do app (Settings → Basic na Meta)' },
      { key: 'businessAccountId', label: 'Business Account ID (WABA)', placeholder: 'Habilita auto-subscribe do webhook', optional: true },
    ];
  }
  if (type === 'WHATSAPP_ZAPPFY') {
    return [
      { key: 'token', secret: true, label: 'Token', placeholder: 'Token da instância Zappfy' },
    ];
  }
  if (type === 'INSTAGRAM') {
    return [
      { key: 'accessToken', secret: true, label: 'Access Token', placeholder: 'Instagram User Access Token (IGAAN...)' },
      { key: 'appSecret', secret: true, label: 'App Secret', placeholder: 'Chave secreta do app' },
      { key: 'igBusinessId', label: 'Instagram Business ID', placeholder: 'Detectado automaticamente', optional: true },
      { key: 'igAppId', label: 'Instagram App ID', optional: true },
    ];
  }
  if (type === 'GMAIL') {
    return [
      { key: 'email', label: 'E-mail', placeholder: 'caixa@dominio.com', optional: true },
      { key: 'refreshToken', secret: true, label: 'Refresh Token OAuth', placeholder: '1//...' },
      { key: 'clientId', label: 'Client ID', optional: true },
      { key: 'clientSecret', secret: true, label: 'Client Secret', optional: true },
      { key: 'query', label: 'Filtro Gmail (query)', placeholder: 'in:inbox', optional: true },
    ];
  }
  return [];
}

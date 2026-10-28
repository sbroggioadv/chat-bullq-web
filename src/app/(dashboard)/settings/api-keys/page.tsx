'use client';

import { Button, SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiKeysService, type ApiKey, type CreatedApiKey } from '@/features/settings/services/api-keys.service';
import { useOrgId } from '@/hooks/use-org-query-key';

export default function SettingsApiKeysPage() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys', orgId],
    queryFn: () => apiKeysService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await apiKeysService.create({ name: newName.trim() });
      setCreatedKey(created);
      setNewName('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar chave');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (key: ApiKey) => {
    if (!confirm(`Revogar a chave "${key.name}"? Aplicações usando essa chave perderão acesso imediatamente.`)) return;
    try {
      await apiKeysService.revoke(key.id);
      toast.success('Chave revogada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao revogar');
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setCreatedKey(null);
    setCopied(false);
  };

  return (
    <div className="space-y-5">
      <section><h2 className={styles.sectionTitle}>Nova chave</h2><div className={styles.block}>
        <SettingRow title="Nome da chave" description="Ex.: Claude Code MCP, backup, Zapier"><div className={styles.inviteControls}>
          <input aria-label="Nome da chave" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Nome da chave" />
          <Button variant="solid" onClick={handleCreate} disabled={!newName.trim() || creating}>{creating ? 'Criando…' : 'Gerar chave'}</Button>
        </div></SettingRow>
      </div></section>
      <section><h2 className={styles.sectionTitle}>Chaves ativas{keys ? ` · ${keys.length}` : ''}</h2><div className={styles.block}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
          ))
        ) : !keys?.length ? (
          <p className="p-3.5 text-[var(--bq-t3)]">Nenhuma chave criada. Gere uma chave acima para conectar o MCP.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className={styles.listRow}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{key.name}</span>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {key.prefix}…
                  </code>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                  <span>Criada por {key.user.name}</span>
                  <span>•</span>
                  <span>Em {new Date(key.createdAt).toLocaleDateString('pt-BR')}</span>
                  {key.lastUsedAt ? (
                    <>
                      <span>•</span>
                      <span>Último uso {new Date(key.lastUsedAt).toLocaleString('pt-BR')}</span>
                    </>
                  ) : (
                    <>
                      <span>•</span>
                      <span className="text-zinc-400">Nunca usada</span>
                    </>
                  )}
                  {key.expiresAt && (
                    <>
                      <span>•</span>
                      <span>Expira em {new Date(key.expiresAt).toLocaleDateString('pt-BR')}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(key)}
                className="ml-3 rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                title="Revogar chave"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      </section>
      <section><h2 className={styles.sectionTitle}>Conectar ao Claude Code (MCP)</h2><div className={`${styles.block} p-3.5`}>
        <pre className={styles.code}>{'claude mcp add chat-bullq -e CHAT_BULLQ_API_KEY=<sua chave> -- node /path/to/chat-bullq-mcp/dist/index.js'}</pre>
        <p className="mt-2 text-xs text-[var(--bq-t3)]">Substitua o caminho pela instalação do MCP e use a chave exibida uma única vez ao criar.</p>
      </div></section>
      {createdKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Chave criada</h3>
              <button onClick={closeModal} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-xs">
                  Copie a chave agora. Por segurança, ela <b>não será exibida novamente</b>. Se perder, será necessário gerar uma nova.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  {createdKey.name}
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {createdKey.rawKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Conectar ao Claude Code (MCP)</p>
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed text-zinc-100">
{`claude mcp add chat-bullq \\
  -e CHAT_BULLQ_API_KEY=${createdKey.rawKey} \\
  -- node /path/to/chat-bullq-mcp/dist/index.js`}
                </pre>
              </div>
            </div>

            <div className="flex justify-end border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <button
                onClick={closeModal}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

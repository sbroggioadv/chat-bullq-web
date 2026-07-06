'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCredentialsService,
  type AiCapability,
  type AiProvider,
  type CapabilityRouting,
  type CredentialTestStatus,
  type MaskedCredential,
} from '@/features/settings/services/ai-credentials.service';
import { useOrgId } from '@/hooks/use-org-query-key';

type Tab = 'credentials' | 'routing';

interface ProviderMeta {
  id: AiProvider;
  name: string;
  description: string;
  keyExampleHint: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'ZAI',
    name: 'Z.AI',
    description: 'GLM-5.2, GLM-5.1, GLM-4.7',
    keyExampleHint: 'sk-...',
  },
  {
    id: 'KIMI',
    name: 'Kimi',
    description: 'Moonshot Kimi K2',
    keyExampleHint: 'sk-...',
  },
  {
    id: 'ANTHROPIC',
    name: 'Anthropic',
    description: 'Claude (Sonnet, Haiku, Opus)',
    keyExampleHint: 'sk-ant-...',
  },
  {
    id: 'OPENAI',
    name: 'OpenAI',
    description: 'GPT-4o, Whisper, Embeddings',
    keyExampleHint: 'sk-...',
  },
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    description: '1.5 Flash, 1.5 Pro',
    keyExampleHint: 'AIza...',
  },
];

const CAPABILITY_LABELS: Record<AiCapability, { label: string; help: string; allowed: AiProvider[] }> = {
  LLM_AGENT: {
    label: 'Agentes IA',
    help: 'Provider usado nas conversas com agentes (Augusto, Sales, Support)',
    allowed: ['ZAI', 'OPENAI', 'GEMINI', 'KIMI', 'ANTHROPIC'],
  },
  TRANSCRIPTION: {
    label: 'Transcrição de áudio',
    help: 'Provider usado quando o usuário clica "Transcrever" num áudio',
    allowed: ['OPENAI', 'GEMINI'],
  },
  EMBEDDINGS: {
    label: 'Embeddings RAG',
    help: 'Provider usado pra indexar e buscar contexto (RAG). Hoje só OpenAI.',
    allowed: ['OPENAI'],
  },
};

const STATUS_BADGES: Record<
  CredentialTestStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  UNTESTED: {
    label: 'Não testado',
    icon: Clock,
    className: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950',
  },
  SUCCESS: {
    label: 'Conectado',
    icon: CheckCircle2,
    className: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950',
  },
  FAILURE: {
    label: 'Falha',
    icon: XCircle,
    className: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950',
  },
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'agora há pouco';
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `há ${diffD}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function SettingsAiCredentialsPage() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  const [tab, setTab] = useState<Tab>('credentials');

  const { data: credentials, isLoading: loadingCreds } = useQuery({
    queryKey: ['ai-credentials', orgId],
    queryFn: () => aiCredentialsService.list(),
  });

  const { data: routing, isLoading: loadingRouting } = useQuery({
    queryKey: ['ai-routing', orgId],
    queryFn: () => aiCredentialsService.listRouting(),
  });

  const { data: health } = useQuery({
    queryKey: ['llm-health'],
    queryFn: () => aiCredentialsService.healthLlm(),
    staleTime: 30_000,
  });

  const credByProvider = useMemo(() => {
    const map = new Map<AiProvider, MaskedCredential>();
    (credentials ?? []).forEach((c) => map.set(c.provider, c));
    return map;
  }, [credentials]);

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Credenciais de IA
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Use suas próprias chaves Z.AI / OpenAI / Gemini, com escolha de provider por capacidade.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === 'credentials'} onClick={() => setTab('credentials')}>
          Credenciais
        </TabButton>
        <TabButton active={tab === 'routing'} onClick={() => setTab('routing')}>
          Roteamento
        </TabButton>
      </div>

      {tab === 'credentials' && (
        <CredentialsTab
          providers={PROVIDERS}
          credByProvider={credByProvider}
          loading={loadingCreds}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['ai-credentials'] });
            qc.invalidateQueries({ queryKey: ['llm-health'] });
          }}
        />
      )}

      {tab === 'routing' && (
        <RoutingTab
          routing={routing ?? []}
          credByProvider={credByProvider}
          loading={loadingRouting}
          envFallback={health?.env}
          onChanged={() => qc.invalidateQueries({ queryKey: ['ai-routing'] })}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function CredentialsTab({
  providers,
  credByProvider,
  loading,
  onChanged,
}: {
  providers: ProviderMeta[];
  credByProvider: Map<AiProvider, MaskedCredential>;
  loading: boolean;
  onChanged: () => void;
}) {
  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {providers.map((p) => (
        <ProviderCard
          key={p.id}
          provider={p}
          credential={credByProvider.get(p.id)}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  credential,
  onChanged,
}: {
  provider: ProviderMeta;
  credential: MaskedCredential | undefined;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const status = credential?.lastTestStatus ?? 'UNTESTED';
  const StatusBadge = STATUS_BADGES[status];

  const handleSave = async () => {
    if (keyValue.trim().length < 10) {
      toast.error('Chave inválida (muito curta)');
      return;
    }
    setSaving(true);
    try {
      await aiCredentialsService.upsert(provider.id, keyValue.trim());
      toast.success(`${provider.name}: chave salva`);
      setEditing(false);
      setKeyValue('');
      setShowKey(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const updated = await aiCredentialsService.test(provider.id);
      if (updated.lastTestStatus === 'SUCCESS') {
        toast.success(`${provider.name}: conexão ok`);
      } else {
        toast.error(`${provider.name}: ${updated.lastTestError ?? 'falhou'}`);
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao testar');
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remover credencial ${provider.name}? A organização passará a usar o fallback do servidor.`)) {
      return;
    }
    try {
      await aiCredentialsService.remove(provider.id);
      toast.success(`${provider.name}: removida`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{provider.name}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${StatusBadge.className}`}
            >
              <StatusBadge.icon className="h-3 w-3" />
              {StatusBadge.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{provider.description}</p>
          {credential ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {provider.keyExampleHint}***{credential.keyHint}
              </code>
              <span>•</span>
              <span>Último teste: {formatRelative(credential.lastTestAt)}</span>
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-zinc-400">
              Não configurada — usa fallback do servidor
            </p>
          )}
          {credential?.lastTestError && (
            <p className="mt-2 flex items-start gap-1 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{credential.lastTestError}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {credential && !editing && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Testar
            </button>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {credential ? 'Atualizar' : 'Configurar'}
            </button>
          ) : (
            <button
              onClick={() => {
                setEditing(false);
                setKeyValue('');
                setShowKey(false);
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          )}
          {credential && !editing && (
            <button
              onClick={handleRemove}
              className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex items-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Cole sua API key {provider.name}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={provider.keyExampleHint}
                autoFocus
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || keyValue.trim().length < 10}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

function RoutingTab({
  routing,
  credByProvider,
  loading,
  envFallback,
  onChanged,
}: {
  routing: CapabilityRouting[];
  credByProvider: Map<AiProvider, MaskedCredential>;
  loading: boolean;
  envFallback?: { zai: boolean; kimi: boolean; anthropic: boolean; openai: boolean; gemini: boolean };
  onChanged: () => void;
}) {
  // Estado local pra batch save
  const [draft, setDraft] = useState<Record<AiCapability, AiProvider> | null>(null);
  const [saving, setSaving] = useState(false);

  const effective: Record<AiCapability, AiProvider> = useMemo(() => {
    const map: Partial<Record<AiCapability, AiProvider>> = {};
    routing.forEach((r) => {
      map[r.capability] = r.providerSelected;
    });
    return {
      LLM_AGENT: map.LLM_AGENT ?? 'ZAI',
      TRANSCRIPTION: map.TRANSCRIPTION ?? 'OPENAI',
      EMBEDDINGS: map.EMBEDDINGS ?? 'OPENAI',
    };
  }, [routing]);

  const current = draft ?? effective;
  const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(effective);

  const isAvailable = (provider: AiProvider): boolean => {
    return credByProvider.has(provider) || (envFallback?.[provider.toLowerCase() as keyof typeof envFallback] ?? false);
  };
  const unavailableSelections = (Object.keys(current) as AiCapability[]).filter(
    (cap) => !isAvailable(current[cap]),
  );

  const handleSelect = (capability: AiCapability, provider: AiProvider) => {
    setDraft({ ...current, [capability]: provider });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await aiCredentialsService.updateRouting(
        (Object.keys(draft) as AiCapability[]).map((cap) => ({
          capability: cap,
          providerSelected: draft[cap],
        })),
      );
      toast.success('Roteamento atualizado');
      setDraft(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Se nenhuma credencial estiver configurada para o provider escolhido, o sistema usa as
          chaves globais do servidor automaticamente (fallback gracioso).
        </p>
      </div>

      {unavailableSelections.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Há capacidade apontando para provider sem credencial. Configure a chave na aba
            Credenciais ou selecione outro provider antes de usar em produção.
          </p>
        </div>
      )}

      {(Object.keys(CAPABILITY_LABELS) as AiCapability[]).map((cap) => {
        const meta = CAPABILITY_LABELS[cap];
        const isLocked = cap === 'EMBEDDINGS'; // só OPENAI por enquanto
        const selectedAvailable = isAvailable(current[cap]);
        return (
          <div
            key={cap}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {meta.label}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">{meta.help}</p>
                {!selectedAvailable && (
                  <p className="mt-2 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>Provider selecionado sem credencial ou fallback de servidor.</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {meta.allowed.map((provider) => {
                  const selected = current[cap] === provider;
                  const available = isAvailable(provider);
                  return (
                    <button
                      key={provider}
                      onClick={() => !isLocked && available && handleSelect(cap, provider)}
                      disabled={isLocked || !available}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : available
                            ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                            : 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600'
                      }`}
                      title={!available ? 'Provider sem credencial — configure na aba Credenciais' : undefined}
                    >
                      {PROVIDERS.find((p) => p.id === provider)?.name ?? provider}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-2 pt-2">
        {isDirty && (
          <button
            onClick={() => setDraft(null)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar roteamento
        </button>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { inboxService, type Message } from '@/features/inbox/services/inbox.service';
import { projectsService } from '@/features/projects/services/projects.service';
import {
  classifyClickUpError,
  clickupInboxService,
  type ClickUpCampo,
  type ClickUpCard,
  type ClickUpCandidato,
  type ClickUpCatalogResponse,
  type ClickUpCatalogShortcut,
  type ClickUpWorkbenchResponse,
} from '@/features/inbox/services/clickup-inbox.service';

const inputCls =
  'w-full rounded-md border border-[var(--bq-hair-strong)] bg-[var(--bq-win-solid)] px-2.5 py-1.5 text-[13px] text-[var(--bq-t1)] outline-none focus:border-primary focus:ring-1 focus:ring-primary   ';
const labelCls =
  'text-[11px] font-medium uppercase tracking-wide text-[var(--bq-t3)] ';

export function ClickUpPanel({
  conversationId,
  contactName = '',
  isGroup = false,
}: {
  conversationId: string;
  contactName?: string;
  isGroup?: boolean;
}) {
  return (
    <ClickUpWorkbench
      conversationId={conversationId}
      contactName={contactName}
      isGroup={isGroup}
    />
  );
}

function isAnchorConflict(err: unknown): boolean {
  if (classifyClickUpError(err) === 'switch_required') return true;
  return (
    err instanceof ApiClientError
    && err.status === 409
    && (err.code === 'CLICKUP_ANCHOR_SWITCH_REQUIRED' || err.code === 'CLICKUP_ANCHOR_EXISTS')
  );
}

function ClickUpWorkbench({
  conversationId,
  contactName = '',
  isGroup = false,
}: {
  conversationId: string;
  contactName?: string;
  isGroup?: boolean;
}) {
  const queryClient = useQueryClient();
  const resolveQ = useQuery({
    queryKey: ['clickup-workbench', conversationId],
    queryFn: () => clickupInboxService.resolveWorkbench(conversationId),
  });
  const errorKind = resolveQ.error ? classifyClickUpError(resolveQ.error) : null;

  if (resolveQ.isLoading) {
    return (
      <div className="flex justify-center p-6" data-testid="clickup-state-loading">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--bq-t3)]" />
      </div>
    );
  }
  if (errorKind === 'not_configured') {
    return (
      <p className="p-4 text-xs text-[var(--bq-t2)]" data-testid="clickup-state-not-configured">
        Integração ClickUp não configurada neste ambiente.
      </p>
    );
  }
  if (errorKind === 'upstream' || resolveQ.error) {
    return (
      <p className="p-4 text-xs text-[var(--bq-t2)]" data-testid="clickup-state-upstream">
        ClickUp indisponível no momento. Tente de novo em instantes.
      </p>
    );
  }

  const data = resolveQ.data;
  if (!data) return null;

  const setData = (next: ClickUpWorkbenchResponse) => {
    queryClient.setQueryData(['clickup-workbench', conversationId], next);
  };

  return (
    <div className="space-y-3 p-4" data-testid="clickup-workbench">
      {!isGroup && data.phoneShortcut ? (
        <PhoneShortcutStrip
          conversationId={conversationId}
          shortcut={data.phoneShortcut}
          canCreateLead={data.canCreateLead}
          contactName={contactName}
          mutable={data.status !== 'task_vinculada' && data.status !== 'binding_invalido'}
          onBound={(card) =>
            setData({ ...data, status: 'task_vinculada', card, phoneShortcut: data.phoneShortcut })
          }
        />
      ) : null}

      {data.dossier ? (
        <div
          className="rounded-md border border-[var(--bq-hair)] px-2.5 py-2 text-xs "
          data-testid="clickup-dossier-chip"
        >
          <p className="font-medium text-[var(--bq-t1)] ">Dossiê {data.dossier.name}</p>
          {data.dossier.clickupTaskId && data.status !== 'task_vinculada' ? (
            <button
              type="button"
              data-testid="clickup-usar-task-dossie"
              className="mt-1 text-[11px] font-medium text-primary hover:underline"
              onClick={() =>
                clickupInboxService
                  .bindWorkbenchTask(conversationId, { taskRef: data.dossier!.clickupTaskId! })
                  .then((res) => {
                    setData({ ...data, status: 'task_vinculada', card: res.card });
                    toast.success('Task do dossiê vinculada a esta conversa');
                  })
                  .catch((err) => toast.error(err instanceof Error ? err.message : 'Falha ao vincular'))
              }
            >
              Usar task do dossiê
            </button>
          ) : null}
        </div>
      ) : null}

      {data.status === 'task_vinculada' && data.card ? (
        <div data-testid="clickup-state-task-vinculada">
          <ClickUpCardView
            conversationId={conversationId}
            card={data.card}
            onCard={(card) => setData({ ...data, status: 'task_vinculada', card })}
          />
          <ClickUpIncorporate conversationId={conversationId} hasDossier={Boolean(data.dossier)} />
        </div>
      ) : null}

      {data.status === 'binding_invalido' ? (
        <p className="text-xs text-[var(--bq-t2)]" data-testid="clickup-state-binding-invalido">
          O vínculo ClickUp desta conversa está inválido ou inacessível. Vincule outra task ou crie
          uma nova — nada é escolhido automaticamente.
        </p>
      ) : null}

      {data.status === 'sem_vinculo' ? (
        <p className="text-xs text-[var(--bq-t2)]" data-testid="clickup-state-sem-vinculo">
          Nenhuma task ClickUp vinculada a esta conversa.
        </p>
      ) : null}

      <WorkbenchBindCreate
        conversationId={conversationId}
        data={data}
        defaultName={contactName.trim() || data.dossier?.name || ''}
        onBound={(card, extras) =>
          setData({
            ...data,
            status: 'task_vinculada',
            card,
            dossier:
              data.dossier && extras?.crossLinked
                ? { ...data.dossier, clickupTaskId: card.taskId }
                : data.dossier,
          })
        }
      />
    </div>
  );
}

function PhoneShortcutStrip({
  conversationId,
  shortcut,
  canCreateLead,
  contactName,
  mutable = true,
  onBound,
}: {
  conversationId: string;
  shortcut: NonNullable<ClickUpWorkbenchResponse['phoneShortcut']>;
  canCreateLead: boolean;
  contactName: string;
  mutable?: boolean;
  onBound: (card: ClickUpCard) => void;
}) {
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<string | null>(null);
  const bindM = useMutation({
    mutationFn: (taskRef: string) => clickupInboxService.bindWorkbenchTask(conversationId, { taskRef }),
    onSuccess: (res) => {
      onBound(res.card);
      toast.success('Task vinculada a esta conversa');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao vincular'),
  });
  const leadM = useMutation({
    mutationFn: () => clickupInboxService.createTask(conversationId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clickup-workbench', conversationId] });
      toast.success('Lead criado no ClickUp');
      if (res.card) onBound(res.card);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao criar lead'),
  });

  if (shortcut.status === 'fora_do_padrao' || shortcut.status === 'grupo') return null;

  return (
    <div
      className="space-y-2 rounded-md border border-[var(--bq-hair)] px-2.5 py-2 "
      data-testid="clickup-phone-shortcut"
    >
      {shortcut.status === 'unico' && shortcut.card ? (
        <>
          <p className="text-xs text-[var(--bq-t2)]">
            Card comercial: {shortcut.card.nome} · {shortcut.card.lista}
          </p>
          <div className="flex gap-2">
            {shortcut.card.url ? (
              <a
                href={shortcut.card.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Abrir no ClickUp
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {mutable ? (
              <button
                type="button"
                data-testid="clickup-usar-nesta-conversa"
                disabled={bindM.isPending}
                onClick={() => bindM.mutate(shortcut.card!.taskId)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Usar nesta conversa
              </button>
            ) : null}
          </div>
          {mutable ? (
            <ClickUpCardView
              conversationId={conversationId}
              card={shortcut.card}
              onCard={(card) => {
                queryClient.setQueryData(['clickup-workbench', conversationId], (prev: ClickUpWorkbenchResponse | undefined) =>
                  prev ? { ...prev, phoneShortcut: { ...shortcut, card } } : prev,
                );
              }}
            />
          ) : null}
        </>
      ) : null}

      {shortcut.status === 'ambiguo' ? (
        <div data-testid="clickup-state-ambiguo">
          <p className="text-xs text-[var(--bq-t2)]">
            Há mais de um card para este telefone. Escolha um — nada é selecionado automaticamente.
          </p>
          {(shortcut.candidatos ?? []).map((c) => (
            <button
              key={c.taskId}
              type="button"
              onClick={() => setPicked(c.taskId)}
              className="mt-1 block w-full rounded-md border border-[var(--bq-hair)] px-2.5 py-2 text-left text-xs hover:bg-[var(--bq-surface)]  "
            >
              <span className="font-medium text-[var(--bq-t1)] ">{c.nome || '—'}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-[var(--bq-t2)]">{c.taskId}</span>
              <span className="block text-[11px] text-[var(--bq-t3)]">
                {c.lista || 'lista'} · {c.status || '—'}
              </span>
            </button>
          ))}
          {picked && mutable ? (
            <button
              type="button"
              data-testid="clickup-usar-nesta-conversa"
              disabled={bindM.isPending}
              onClick={() => bindM.mutate(picked)}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Usar nesta conversa
            </button>
          ) : null}
        </div>
      ) : null}

      {shortcut.status === 'sem_card' ? (
        <div data-testid="clickup-state-sem-card">
          <p className="text-xs text-[var(--bq-t2)]">Nenhum card ClickUp para este telefone.</p>
          {canCreateLead && mutable ? (
            <>
              <button
                type="button"
                data-testid="clickup-create"
                disabled={!contactName.trim() || leadM.isPending}
                onClick={() => leadM.mutate()}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {leadM.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : `Criar lead em ${shortcut.primaryListLabel || 'Processo de Vendas'}`}
              </button>
              {!contactName.trim() ? (
                <p className="mt-1 text-[11px] text-[var(--bq-warn)]" data-testid="clickup-create-needs-name">
                  Nomeie o contato na aba Contato antes de criar o card.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WorkbenchBindCreate({
  conversationId,
  data,
  defaultName,
  onBound,
}: {
  conversationId: string;
  data: ClickUpWorkbenchResponse;
  defaultName: string;
  onBound: (card: ClickUpCard, extras?: { crossLinked?: boolean }) => void;
}) {
  const [mode, setMode] = useState<'idle' | 'vincular' | 'criar'>('idle');
  const [taskRef, setTaskRef] = useState('');
  const [candidatos, setCandidatos] = useState<ClickUpCandidato[] | null>(null);
  const [listId, setListId] = useState('');
  const [name, setName] = useState(defaultName);
  const [spaceId, setSpaceId] = useState('');
  const dossierKey = `${data.dossier?.id ?? ''}:${data.dossier?.clickupTaskId ?? ''}`;
  const [crossLinkChoice, setCrossLinkChoice] = useState<{ key: string; value: boolean } | null>(null);
  const crossLink = crossLinkChoice?.key === dossierKey ? crossLinkChoice.value : Boolean(data.dossier && !data.dossier.clickupTaskId);
  const setCrossLink = (value: boolean) => setCrossLinkChoice({ key: dossierKey, value });
  const [switchDialog, setSwitchDialog] = useState<null | { kind: 'bind'; ref: string } | { kind: 'create' }>(
    null,
  );


  const catalogQ = useQuery({
    queryKey: ['clickup-workbench-catalog', conversationId],
    queryFn: () => clickupInboxService.getWorkbenchCatalog(conversationId),
    enabled: mode === 'criar' || mode === 'vincular',
  });
  const catalog: ClickUpCatalogResponse | undefined = catalogQ.data;
  const shortcuts: ClickUpCatalogShortcut[] = catalog?.catalogShortcuts ?? data.catalogShortcuts ?? [];
  const spaces = catalog?.spaces ?? [];
  const crossLinkBody = data.dossier ? { crossLinkDossier: crossLink } : {};

  const searchM = useMutation({
    mutationFn: () =>
      clickupInboxService.searchWorkbenchTasks(
        conversationId,
        taskRef.trim(),
        spaceId || undefined,
      ),
    onSuccess: (res) => setCandidatos(res.candidatos ?? []),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha na busca'),
  });
  const bindM = useMutation({
    mutationFn: ({ ref, confirmSwitch }: { ref: string; confirmSwitch?: boolean }) =>
      clickupInboxService.bindWorkbenchTask(conversationId, {
        taskRef: ref,
        ...crossLinkBody,
        ...(confirmSwitch ? { confirmSwitch: true } : {}),
      }),
    onSuccess: (res) => {
      const crossLinked = Boolean(data.dossier && crossLink);
      onBound(res.card, { crossLinked });
      if (crossLinked) setCrossLink(false);
      setSwitchDialog(null);
      toast.success('Task vinculada a esta conversa');
    },
    onError: (err, vars) => {
      if (isAnchorConflict(err)) {
        setSwitchDialog({ kind: 'bind', ref: vars.ref });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Falha ao vincular');
    },
  });
  const createM = useMutation({
    mutationFn: ({ confirmSwitch }: { confirmSwitch?: boolean } = {}) =>
      clickupInboxService.createWorkbenchTask(conversationId, {
        listId,
        name: name.trim(),
        ...crossLinkBody,
        ...(confirmSwitch ? { confirmSwitch: true } : {}),
      }),
    onSuccess: (res) => {
      const crossLinked = Boolean(data.dossier && crossLink);
      onBound(res.card, { crossLinked });
      if (crossLinked) setCrossLink(false);
      setSwitchDialog(null);
      toast.success('Task criada no ClickUp');
    },
    onError: (err) => {
      if (isAnchorConflict(err)) {
        setSwitchDialog({ kind: 'create' });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Falha ao criar no ClickUp');
    },
  });

  return (
    <div className="space-y-3">
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <div className="flex-1" data-testid="clickup-vincular">
            <button
              type="button"
              data-testid="clickup-workbench-vincular"
              onClick={() => setMode('vincular')}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Vincular existente
            </button>
          </div>
          <div className="flex-1" data-testid="clickup-criar">
            <button
              type="button"
              data-testid="clickup-workbench-criar"
              onClick={() => setMode('criar')}
              className="inline-flex w-full items-center justify-center rounded-md border border-[var(--bq-hair-strong)] px-3 py-1.5 text-xs font-medium "
            >
              Criar nova
            </button>
          </div>
        </div>
      ) : null}

      {switchDialog ? (
        <div
          role="dialog"
          className="space-y-2 rounded-md border border-[var(--bq-warn)] bg-[var(--bq-warn-soft)] px-2.5 py-2 text-xs  "
          data-testid="clickup-confirm-switch"
        >
          <p>Esta conversa já tem uma task. Trocar a âncora? A task anterior permanece no ClickUp.</p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="clickup-confirm-switch-cancel"
              onClick={() => setSwitchDialog(null)}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-[var(--bq-hair-strong)] px-3 py-1.5 font-medium "
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="clickup-confirm-switch-confirm"
              onClick={() => {
                if (switchDialog.kind === 'bind') {
                  bindM.mutate({ ref: switchDialog.ref, confirmSwitch: true });
                } else {
                  createM.mutate({ confirmSwitch: true });
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'vincular' ? (
        <div className="space-y-2" data-testid="clickup-workbench-bind">
          {spaces.length > 0 ? (
            <label className="block">
              <span className={labelCls}>Space (opcional)</span>
              <select
                className={`${inputCls} mt-1`}
                data-testid="clickup-search-space"
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  setCandidatos(null);
                }}
              >
                <option value="">Listas de atalho</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <input
            className={inputCls}
            value={taskRef}
            placeholder="Cole a URL/ID ou busque pelo nome"
            onChange={(e) => {
              setTaskRef(e.target.value);
              setCandidatos(null);
            }}
          />
          <button
            type="button"
            data-testid="clickup-workbench-search"
            disabled={!taskRef.trim() || searchM.isPending}
            onClick={() => searchM.mutate()}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {searchM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Buscar'}
          </button>
          {candidatos ? (
            candidatos.length === 0 ? (
              <p className="text-[11px] text-[var(--bq-t2)]">Nenhuma task encontrada.</p>
            ) : (
              <div className="space-y-2" data-testid="clickup-workbench-candidatos">
                <p className="text-[11px] text-[var(--bq-t2)]">
                  Escolha uma task — nada é selecionado automaticamente.
                </p>
                {candidatos.map((c) => (
                  <button
                    key={c.taskId}
                    type="button"
                    onClick={() => bindM.mutate({ ref: c.taskId })}
                    className="block w-full rounded-md border border-[var(--bq-hair)] px-2.5 py-2 text-left text-xs hover:bg-[var(--bq-surface)]  "
                  >
                    <span className="font-medium text-[var(--bq-t1)] ">
                      {c.nome || '—'}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-[var(--bq-t2)]">
                      {c.taskId}
                    </span>
                    <span className="block text-[11px] text-[var(--bq-t3)]">
                      {c.lista || 'lista'} · {c.status || '—'}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <button
              type="button"
              data-testid="clickup-workbench-bind-paste"
              disabled={!taskRef.trim() || bindM.isPending}
              onClick={() => bindM.mutate({ ref: taskRef.trim() })}
              className="inline-flex w-full items-center justify-center rounded-md border border-[var(--bq-hair-strong)] px-3 py-1.5 text-xs font-medium disabled:opacity-50 "
            >
              Vincular esta referência
            </button>
          )}
          {data.dossier ? (
            <label
              className="flex items-start gap-2 text-xs text-[var(--bq-t2)] "
              data-testid="clickup-cross-link-dossier"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={crossLink}
                onChange={(e) => setCrossLink(e.target.checked)}
              />
              <span>
                Cruzar no dossiê {data.dossier.name}
                {data.dossier.clickupTaskId && crossLink ? (
                  <span className="mt-0.5 block text-[11px] text-[var(--bq-warn)] " data-testid="clickup-cross-link-overwrite">
                    A task atual do dossiê será substituída.
                  </span>
                ) : null}
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {mode === 'criar' ? (
        <div className="space-y-2" data-testid="clickup-workbench-create">
          <label className="block" data-testid="clickup-workbench-list">
            <span className={labelCls}>Lista</span>
            <select
              className={`${inputCls} mt-1`}
              data-testid="clickup-create-list"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              <option value="">Selecione a lista</option>
              <optgroup label="Atalhos" data-testid="clickup-catalog-shortcuts">
                {shortcuts.map((lista) => (
                  <option key={lista.id} value={lista.id}>
                    {lista.label}
                  </option>
                ))}
              </optgroup>
              {spaces.map((space) => (
                <optgroup
                  key={space.id}
                  label={space.label}
                  data-testid={`clickup-catalog-space-${space.id}`}
                >
                  {space.lists
                    .filter((lista) => !shortcuts.some((atalho) => atalho.id === lista.id))
                    .map((lista) => (
                      <option key={lista.id} value={lista.id}>
                        {lista.label}
                      </option>
                    ))}
                  {space.folders.flatMap((folder) =>
                    folder.lists
                      .filter((lista) => !shortcuts.some((atalho) => atalho.id === lista.id))
                      .map((lista) => (
                        <option key={lista.id} value={lista.id}>
                          {folder.label} / {lista.label}
                        </option>
                      )),
                  )}
                </optgroup>
              ))}
            </select>
          </label>
          <input
            className={inputCls}
            value={name}
            placeholder="Nome da task"
            onChange={(e) => setName(e.target.value)}
          />
          {data.dossier ? (
            <label
              className="flex items-start gap-2 text-xs text-[var(--bq-t2)] "
              data-testid="clickup-cross-link-dossier"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={crossLink}
                onChange={(e) => setCrossLink(e.target.checked)}
              />
              <span>
                Cruzar no dossiê {data.dossier.name}
                {data.dossier.clickupTaskId && crossLink ? (
                  <span className="mt-0.5 block text-[11px] text-[var(--bq-warn)] " data-testid="clickup-cross-link-overwrite">
                    A task atual do dossiê será substituída.
                  </span>
                ) : null}
              </span>
            </label>
          ) : null}
          <button
            type="button"
            data-testid="clickup-workbench-create-submit"
            disabled={!listId || !name.trim() || createM.isPending}
            onClick={() => createM.mutate({})}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {createM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Criar no ClickUp'}
          </button>
        </div>
      ) : null}
    </div>
  );
}


function ClickUpCardView({
  conversationId,
  card,
  onCard,
}: {
  conversationId: string;
  card: ClickUpCard;
  onCard: (card: ClickUpCard) => void;
}) {
  const [oQue, setOQue] = useState('');
  const [proximo, setProximo] = useState('');
  const [novaAtividade, setNovaAtividade] = useState('');

  const statusM = useMutation({
    mutationFn: (status: string) =>
      clickupInboxService.patchStatus(conversationId, card.taskId, status),
    onSuccess: (res) => {
      onCard(res.card);
      toast.success('Etapa atualizada');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao atualizar etapa'),
  });

  const fieldM = useMutation({
    mutationFn: ({ fieldId, value }: { fieldId: string; value: unknown }) =>
      clickupInboxService.patchField(conversationId, card.taskId, fieldId, value),
    onSuccess: (res) => {
      onCard(res.card);
      toast.success('Campo atualizado');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao atualizar campo'),
  });

  const commentM = useMutation({
    mutationFn: () =>
      clickupInboxService.postComment(conversationId, card.taskId, {
        oQue: oQue.trim(),
        proximoPasso: proximo.trim(),
      }),
    onSuccess: (res) => {
      setOQue('');
      setProximo('');
      onCard({ ...card, comentarios: res.comentarios });
      toast.success('Comentário registrado');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha no comentário'),
  });

  const activityM = useMutation({
    mutationFn: () =>
      clickupInboxService.postActivity(conversationId, card.taskId, {
        name: novaAtividade.trim(),
      }),
    onSuccess: (res) => {
      setNovaAtividade('');
      onCard(res.card);
      toast.success('Atividade criada');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha na atividade'),
  });

  const completeM = useMutation({
    mutationFn: (activityId: string) =>
      clickupInboxService.completeActivity(conversationId, card.taskId, activityId),
    onSuccess: (res) => {
      onCard(res.card);
      toast.success('Atividade concluída');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao concluir'),
  });

  const mutating = statusM.isPending || fieldM.isPending;

  return (
    <div className="space-y-4 p-4" data-testid="clickup-state-unico">
      <div>
        <p className={labelCls}>Card</p>
        <p className="text-sm font-medium text-[var(--bq-t1)] ">{card.nome}</p>
        <p className="text-[11px] text-[var(--bq-t3)]">{card.lista || 'lista'}</p>
        {card.url ? (
          <a
            href={card.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Abrir no ClickUp
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      <div data-testid="clickup-mutations">
        <p className={labelCls}>Etapa</p>
        <select
          className={inputCls}
          value={card.etapa ?? ''}
          disabled={mutating}
          onChange={(e) => {
            if (e.target.value) statusM.mutate(e.target.value);
          }}
        >
          {(card.etapas ?? []).map((etapa) => (
            <option key={etapa} value={etapa}>
              {etapa}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {card.campos.map((campo) => (
          <FieldEditor
            key={campo.id}
            campo={campo}
            disabled={mutating}
            onSave={(value) => fieldM.mutate({ fieldId: campo.id, value })}
          />
        ))}
      </div>

      {card.atividadesHabilitadas ? (
        <div data-testid="clickup-activities">
          <p className={labelCls}>Atividades</p>
          <ul className="mt-1 space-y-1">
            {card.atividades.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                <span>{a.nome}</span>
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => completeM.mutate(a.id)}
                >
                  Concluir
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-1">
            <input
              className={inputCls}
              value={novaAtividade}
              placeholder="Nova atividade"
              onChange={(e) => setNovaAtividade(e.target.value)}
            />
            <button
              type="button"
              disabled={!novaAtividade.trim() || activityM.isPending}
              onClick={() => activityM.mutate()}
              className="rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
            >
              Criar
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <p className={labelCls}>Comentário</p>
        <textarea
          className={`${inputCls} mt-1 min-h-[64px]`}
          value={oQue}
          placeholder="O que aconteceu"
          onChange={(e) => setOQue(e.target.value)}
        />
        <input
          className={`${inputCls} mt-1`}
          value={proximo}
          placeholder="Próximo passo"
          onChange={(e) => setProximo(e.target.value)}
        />
        <button
          type="button"
          disabled={!oQue.trim() || commentM.isPending}
          onClick={() => commentM.mutate()}
          className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          Registrar
        </button>
      </div>

      {card.comentarios.length > 0 ? (
        <ul className="space-y-2">
          {card.comentarios.map((c) => (
            <li key={c.id} className="whitespace-pre-wrap text-[11px] text-[var(--bq-t2)]">
              {c.texto}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function messagePreview(msg: Message): string {
  const content = msg.content ?? {};
  return String(content.text || content.body || content.caption || content.fileName || msg.type || 'mensagem');
}

function messageHasText(msg: Message): boolean {
  const content = msg.content ?? {};
  return Boolean(content.text || content.body || content.caption) || msg.type === 'TEXT';
}

function messageHasFile(msg: Message): boolean {
  return ['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER'].includes(msg.type);
}

function ClickUpIncorporate({
  conversationId,
  hasDossier,
}: {
  conversationId: string;
  hasDossier: boolean;
}) {
  const messagesQ = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => inboxService.getMessages(conversationId),
  });
  const projectQ = useQuery({
    queryKey: ['project', conversationId],
    queryFn: () => projectsService.getByConversation(conversationId),
    enabled: hasDossier,
  });
  const incorporateM = useMutation({
    mutationFn: (body: { kind: 'comment' | 'attachment'; messageId?: string; documentId?: string }) =>
      clickupInboxService.incorporateWorkbench(conversationId, body),
    onSuccess: (_res, vars) => {
      toast.success(vars.kind === 'comment' ? 'Texto enviado ao ClickUp' : 'Arquivo enviado ao ClickUp');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao incorporar'),
  });
  const messages = (messagesQ.data?.messages ?? []).filter((msg) => !msg.revokedAt).slice(-20);
  const documents = hasDossier ? (projectQ.data?.attachments ?? []) : [];

  return (
    <div className="space-y-2 border-t border-[var(--bq-hair)] pt-3 " data-testid="clickup-incorporate">
      <p className={labelCls}>Incorporar na task</p>
      {messagesQ.isLoading && <p role="status">Carregando mensagens…</p>}
      {messagesQ.isError && <p role="alert">{messagesQ.error instanceof Error ? messagesQ.error.message : 'Não foi possível carregar mensagens.'}</p>}
      {projectQ.isError && <p role="alert">{projectQ.error instanceof Error ? projectQ.error.message : 'Não foi possível carregar arquivos do dossiê.'}</p>}
      {incorporateM.isError && <p role="alert">{incorporateM.error instanceof Error ? incorporateM.error.message : 'Falha ao incorporar.'}</p>}
      {!messagesQ.isLoading && !messagesQ.isError && messages.length === 0 && documents.length === 0 ? (
        <p className="text-[11px] text-[var(--bq-t2)]">Nenhuma mensagem ou arquivo para incorporar.</p>
      ) : null}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="rounded-md border border-[var(--bq-hair)] px-2.5 py-2 text-xs "
          data-testid={`clickup-incorporate-msg-${msg.id}`}
        >
          <p className="truncate text-[var(--bq-t2)] ">{messagePreview(msg)}</p>
          <div className="mt-1 flex gap-2">
            {messageHasText(msg) ? (
              <button
                type="button"
                data-testid={`clickup-incorporate-comment-${msg.id}`}
                disabled={incorporateM.isPending}
                onClick={() => incorporateM.mutate({ kind: 'comment', messageId: msg.id })}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Mandar texto
              </button>
            ) : null}
            {messageHasFile(msg) ? (
              <button
                type="button"
                data-testid={`clickup-incorporate-file-${msg.id}`}
                disabled={incorporateM.isPending}
                onClick={() => incorporateM.mutate({ kind: 'attachment', messageId: msg.id })}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Mandar arquivo
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-md border border-[var(--bq-hair)] px-2.5 py-2 text-xs "
          data-testid={`clickup-incorporate-doc-${doc.id}`}
        >
          <p className="truncate text-[var(--bq-t2)] ">{doc.fileName || doc.label}</p>
          <button
            type="button"
            data-testid={`clickup-incorporate-doc-file-${doc.id}`}
            disabled={incorporateM.isPending}
            onClick={() => incorporateM.mutate({ kind: 'attachment', documentId: doc.id })}
            className="mt-1 text-[11px] font-medium text-primary hover:underline"
          >
            Mandar arquivo
          </button>
        </div>
      ))}
    </div>
  );
}

function FieldEditor({
  campo,
  disabled,
  onSave,
}: {
  campo: ClickUpCampo;
  disabled: boolean;
  onSave: (value: unknown) => void;
}) {
  const initial = useMemo(() => campo.valorInput, [campo.valorInput]);
  const [draft, setDraft] = useState(initial);
  const trava = !campo.writable;

  if (campo.tipo === 'labels') {
    const selected = Array.isArray(draft) ? (draft as string[]) : [];
    return (
      <fieldset className="space-y-1">
        <legend className={labelCls}>
          {campo.nome}
          {trava ? ' 🔒' : ''}
        </legend>
        {campo.opcoes.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              disabled={trava || disabled}
              checked={selected.includes(o.id)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, o.id]
                  : selected.filter((id) => id !== o.id);
                setDraft(next);
                onSave(next);
              }}
            />
            {o.rotulo}
          </label>
        ))}
      </fieldset>
    );
  }

  if (campo.tipo === 'drop_down') {
    return (
      <label className="block">
        <span className={labelCls}>
          {campo.nome}
          {trava ? ' 🔒' : ''}
        </span>
        <select
          className={`${inputCls} mt-1`}
          disabled={trava || disabled}
          value={String(draft ?? '')}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            onSave(v === '' ? null : v);
          }}
        >
          <option value="">—</option>
          {campo.opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const typeAttr =
    campo.tipo === 'date'
      ? 'date'
      : campo.tipo === 'email'
        ? 'email'
        : campo.tipo === 'phone'
          ? 'tel'
          : campo.tipo === 'url'
            ? 'url'
            : campo.tipo === 'currency'
              ? 'number'
              : 'text';

  return (
    <label className="block">
      <span className={labelCls}>
        {campo.nome}
        {trava ? ' 🔒' : ''}
      </span>
      <input
        className={`${inputCls} mt-1`}
        type={typeAttr}
        disabled={trava || disabled}
        value={String(draft ?? '')}
        step={campo.tipo === 'currency' ? '0.01' : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (trava) return;
          const v = String(draft ?? '').trim();
          onSave(v === '' ? null : v);
        }}
      />
    </label>
  );
}

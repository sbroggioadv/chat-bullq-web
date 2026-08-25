'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  classifyClickUpError,
  clickupInboxService,
  type ClickUpCampo,
  type ClickUpCard,
  type ClickUpResolveResponse,
} from '../services/clickup-inbox.service';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
const labelCls =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500';

export function ClickUpPanel({
  conversationId,
  contactName = '',
}: {
  conversationId: string;
  contactName?: string;
}) {
  const queryClient = useQueryClient();
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);

  const resolveQ = useQuery({
    queryKey: ['clickup-inbox', conversationId],
    queryFn: () => clickupInboxService.resolve(conversationId),
  });

  const taskQ = useQuery({
    queryKey: ['clickup-inbox-task', conversationId, pickedTaskId],
    queryFn: () => clickupInboxService.getTask(conversationId, pickedTaskId!),
    enabled: Boolean(pickedTaskId),
  });

  const errorKind = resolveQ.error ? classifyClickUpError(resolveQ.error) : null;

  if (resolveQ.isLoading) {
    return (
      <div className="flex justify-center p-6" data-testid="clickup-state-loading">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (errorKind === 'not_configured') {
    return (
      <p className="p-4 text-xs text-zinc-500" data-testid="clickup-state-not-configured">
        Integração ClickUp não configurada neste ambiente.
      </p>
    );
  }

  if (errorKind === 'upstream' || resolveQ.error) {
    return (
      <p className="p-4 text-xs text-zinc-500" data-testid="clickup-state-upstream">
        ClickUp indisponível no momento. Tente de novo em instantes.
      </p>
    );
  }

  const data = resolveQ.data;
  if (!data) return null;

  if (data.status === 'grupo') {
    return (
      <p className="p-4 text-xs text-zinc-500" data-testid="clickup-state-grupo">
        Conversas em grupo não casam com um único card.
      </p>
    );
  }

  if (data.status === 'fora_do_padrao') {
    return (
      <p className="p-4 text-xs text-zinc-500" data-testid="clickup-state-fora">
        Telefone ausente ou fora do padrão brasileiro — o card não é aproximado.
      </p>
    );
  }

  if (data.status === 'sem_card') {
    return (
      <SemCardCreate
        conversationId={conversationId}
        contactName={contactName}
        onCreated={(card) => {
          queryClient.setQueryData(['clickup-inbox', conversationId], {
            status: 'unico',
            card,
          } satisfies ClickUpResolveResponse);
        }}
      />
    );
  }

  if (data.status === 'ambiguo' && !pickedTaskId) {
    return (
      <div className="space-y-2 p-4" data-testid="clickup-state-ambiguo">
        <p className="text-xs text-zinc-500">
          Há mais de um card para este telefone. Escolha um — nada é selecionado automaticamente.
        </p>
        {(data.candidatos ?? []).map((c) => (
          <button
            key={c.taskId}
            type="button"
            onClick={() => setPickedTaskId(c.taskId)}
            className="block w-full rounded-md border border-zinc-200 px-2.5 py-2 text-left text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.nome || '—'}</span>
            <span className="mt-0.5 block font-mono text-[11px] text-zinc-500">{c.taskId}</span>
            <span className="block text-[11px] text-zinc-400">
              {c.lista || 'lista'} · {c.status || '—'}
            </span>
          </button>
        ))}
      </div>
    );
  }

  const card = (pickedTaskId ? taskQ.data?.card : data.card) as ClickUpCard | undefined;
  if (pickedTaskId && taskQ.isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (!card) {
    return (
      <p className="p-4 text-xs text-zinc-500" data-testid="clickup-state-upstream">
        Não foi possível carregar o card.
      </p>
    );
  }

  return (
    <ClickUpCardView
      conversationId={conversationId}
      card={card}
      onCard={(next) => {
        queryClient.setQueryData(['clickup-inbox', conversationId], {
          status: 'unico',
          card: next,
        } satisfies ClickUpResolveResponse);
        if (pickedTaskId) {
          queryClient.setQueryData(['clickup-inbox-task', conversationId, pickedTaskId], {
            status: 'unico',
            card: next,
          });
        }
      }}
    />
  );
}

function SemCardCreate({
  conversationId,
  contactName,
  onCreated,
}: {
  conversationId: string;
  contactName: string;
  onCreated: (card: ClickUpCard) => void;
}) {
  const named = contactName.trim().length > 0;
  const createM = useMutation({
    mutationFn: () => clickupInboxService.createTask(conversationId),
    onSuccess: (res) => {
      onCreated(res.card);
      toast.success('Card criado no ClickUp');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao criar no ClickUp'),
  });

  return (
    <div className="space-y-3 p-4" data-testid="clickup-state-sem-card">
      <p className="text-xs text-zinc-500">Nenhum card ClickUp para este telefone.</p>
      <button
        type="button"
        data-testid="clickup-create"
        disabled={!named || createM.isPending}
        onClick={() => createM.mutate()}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {createM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Criar no ClickUp'}
      </button>
      {!named ? (
        <p className="text-[11px] text-amber-600" data-testid="clickup-create-needs-name">
          Nomeie o contato na aba Contato antes de criar o card.
        </p>
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
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{card.nome}</p>
        <p className="text-[11px] text-zinc-400">{card.lista || 'lista'}</p>
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
            <li key={c.id} className="whitespace-pre-wrap text-[11px] text-zinc-500">
              {c.texto}
            </li>
          ))}
        </ul>
      ) : null}
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

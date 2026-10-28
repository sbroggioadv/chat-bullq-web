'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, Activity, PanelRight } from 'lucide-react';
import { ConversationAiToggle } from '@/features/inbox/components/conversation-ai-toggle';
import { AssignmentPopover } from '@/features/inbox/components/assignment-popover';
import { AgentPinPopover } from '@/features/inbox/components/agent-pin-popover';
import { Button, FoundationPopover, Switch } from '@/components/ui/foundation';
import { PipelinePopover } from '@/features/inbox/components/pipeline-popover';
import { emailDeepLink, inboxService, type Conversation } from '@/features/inbox/services/inbox.service';
import { useConversationAiAllowedInGroup } from '@/features/inbox/hooks/use-conversation-ai-allowed-in-group';

interface ConversationHeaderProps {
  conversation: Conversation;
  onUpdate: () => void;
  /** When provided, renders a toggle button for the agent-runs sidebar. */
  onToggleAgentLogs?: () => void;
  agentLogsOpen?: boolean;
  /** Painel lateral Contact Workspace (Contato/E-mail/Agenda/Projeto). */
  onToggleProject?: () => void;
  projectOpen?: boolean;
}

export function ConversationHeader({
  conversation,
  onUpdate,
  onToggleAgentLogs,
  agentLogsOpen,
  onToggleProject,
  projectOpen,
}: ConversationHeaderProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const allowedMut = useConversationAiAllowedInGroup(conversation.id);

  const handleAllowedToggle = async (next: boolean) => {
    try {
      await allowedMut.mutateAsync(next);
      toast.success(next ? 'IA habilitada nesse grupo' : 'IA pausada nesse grupo');
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await inboxService.syncConversation(conversation.id);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['messages', conversation.id] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
      ]);
      if (result.imported > 0) {
        toast.success(
          `${result.imported} ${result.imported === 1 ? 'mensagem nova' : 'mensagens novas'} sincronizada${result.imported === 1 ? '' : 's'}`,
        );
      } else {
        toast.success('Tudo em dia — nenhuma mensagem nova');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };
  const handleAction = async (action: () => Promise<unknown>, successMsg: string) => {
    setIsLoading(true);
    try {
      await action();
      toast.success(successMsg);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  const aiLabel = conversation.aiEnabled === true ? 'IA forçada' : conversation.aiEnabled === false ? 'IA pausada' : 'IA · Padrão';
  return (
    <header className="bq-conversation-head">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <HeaderAvatar key={conversation.contact.avatarUrl} name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold" title={conversation.contact.name || conversation.contact.phone || 'Desconhecido'}>{conversation.contact.name || conversation.contact.phone || 'Desconhecido'}</h2>
          <p className="truncate text-[11px] text-[var(--bq-t3)]" title={conversation.contact.phone || undefined}>
            {conversation.channel.name} · {conversation.isGroup ? 'Grupo' : conversation.contact.phone || 'Conversa'}
          </p>
        </div>
      </div>
      {conversation.channel.type !== 'JARVIS' && <div className="bq-chat-actions">
        <FoundationPopover label={aiLabel}>
          <div className="w-64 space-y-3 p-2" aria-label="IA nesta conversa">
            <ConversationAiToggle inline conversation={conversation} disabled={isLoading}
              onChange={(next) => handleAction(() => inboxService.toggleAi(conversation.id, next), next === null ? 'IA no padrão global' : next ? 'IA forçada nesta conversa' : 'IA pausada nesta conversa')}
              onEngage={() => handleAction(async () => {
                const result = await inboxService.engageAi(conversation.id);
                if (!result.engaged) throw new Error(result.reason || 'Não foi possível engajar a IA');
              }, 'IA engajada — vai responder em segundos')}
            />
            {conversation.isGroup && <div className="flex items-center justify-between gap-2 text-xs"><span>IA permitida no grupo<br /><small>Só responde a @ ou reply</small></span><Switch label="IA permitida nesse grupo" checked={conversation.aiAllowedInGroup} disabled={allowedMut.isPending} onChange={handleAllowedToggle} /></div>}
            <AgentPinPopover inline conversation={conversation} onChanged={onUpdate} />
          </div>
        </FoundationPopover>
        <div className="bq-chat-extras">
          {conversation.status !== 'CLOSED' && <AssignmentPopover conversation={conversation} onChanged={onUpdate} />}
          <PipelinePopover conversation={conversation} onChanged={onUpdate} />
          {onToggleAgentLogs && <Button aria-label="Logs do agente" aria-pressed={agentLogsOpen} onClick={onToggleAgentLogs}><Activity size={14} /></Button>}
          <Button variant="solid" disabled={isLoading} onClick={() => handleAction(() => conversation.status === 'CLOSED' ? inboxService.reopenConversation(conversation.id) : inboxService.closeConversation(conversation.id), conversation.status === 'CLOSED' ? 'Conversa reaberta' : 'Conversa encerrada')}>
            {conversation.status === 'CLOSED' ? 'Reabrir' : 'Encerrar'}
          </Button>
        </div>
        {onToggleProject && <Button aria-label={projectOpen ? 'Fechar painel do contato' : 'Abrir painel do contato'} aria-pressed={projectOpen} onClick={onToggleProject}><PanelRight size={15} /></Button>}
        <FoundationPopover label="⋯">
          <div className="flex w-64 flex-col gap-2 p-2" aria-label="Opções da conversa">
            <div className="bq-chat-mobile-extras flex flex-col gap-2">
              {conversation.status !== 'CLOSED' && <AssignmentPopover conversation={conversation} onChanged={onUpdate} />}
              <PipelinePopover conversation={conversation} onChanged={onUpdate} />
              {onToggleAgentLogs && <Button onClick={onToggleAgentLogs}>Logs do agente</Button>}
              <Button disabled={isLoading} onClick={() => handleAction(() => conversation.status === 'CLOSED' ? inboxService.reopenConversation(conversation.id) : inboxService.closeConversation(conversation.id), conversation.status === 'CLOSED' ? 'Conversa reaberta' : 'Conversa encerrada')}>{conversation.status === 'CLOSED' ? 'Reabrir' : 'Encerrar'}</Button>
            </div>
            <Button onClick={handleSync} disabled={isSyncing}><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />Sincronizar mensagens</Button>
            {emailDeepLink(conversation) && <a className="bq-button" href={emailDeepLink(conversation)!}>Abrir no E-mail</a>}
          </div>
        </FoundationPopover>
      </div>}
    </header>
  );
}

function HeaderAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) return <img src={avatarUrl} alt={name || 'Contato'} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-9 w-9 shrink-0 rounded-xl object-cover" />;
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bq-raised-2)] text-xs font-semibold text-[var(--bq-t2)]">{(name || '?').slice(0, 2).toUpperCase()}</div>;
}

'use client';

import { useState, type CSSProperties } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { mockupAvatarHue } from '@/components/ui/avatar-hue';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, Activity, PanelRight, ArrowLeft, FolderKanban, CheckCheck, RotateCcw, Sparkles, ChevronDown, MessageSquare, Mail } from 'lucide-react';
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
  onBack?: () => void;
  /** When provided, renders a toggle button for the agent-runs sidebar. */
  onToggleAgentLogs?: () => void;
  agentLogsOpen?: boolean;
  /** Painel lateral Contact Workspace (Contato/E-mail/Agenda/Projeto). */
  onToggleProject?: () => void;
  projectOpen?: boolean;
  onOpenTasks?: () => void;
}

export function ConversationHeader({
  conversation,
  onUpdate,
  onBack,
  onToggleAgentLogs,
  agentLogsOpen,
  onToggleProject,
  projectOpen,
  onOpenTasks,
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

  const statusLabel = ({ OPEN: 'Em atendimento', PENDING: 'Pendente', WAITING: 'Aguardando', CLOSED: 'Encerrada', BOT: 'Com IA' } as Record<string, string>)[conversation.status] || conversation.status;
  const aiLabel = conversation.aiEnabled === true ? 'IA forçada' : conversation.aiEnabled === false ? 'IA pausada' : 'IA · Padrão';
  return (
    <header className="bq-conversation-head">
      {onBack && <Button className="bq-mobile-back" aria-label="Voltar para Conversas" onClick={onBack}><ArrowLeft size={16} /></Button>}
      <div className="bq-chat-identity flex min-w-0 flex-1 items-center">
        <div className="relative shrink-0"><HeaderAvatar key={conversation.contact.avatarUrl} name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} isGroup={conversation.isGroup} /><span className="bq-channel-badge" style={{"--bq-channel-color": `var(--bq-${conversation.channel.type.startsWith("WHATSAPP") ? "wa" : conversation.channel.type === "GMAIL" ? "mail" : conversation.channel.type === "INSTAGRAM" ? "ig" : "t3"})`} as CSSProperties}>{conversation.channel.type === "GMAIL" ? <Mail /> : conversation.channel.type === "INSTAGRAM" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="5" /><circle cx="12" cy="12" r="4" /></svg> : conversation.channel.type.startsWith("WHATSAPP") ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg> : <MessageSquare />}</span></div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold" title={conversation.contact.name || conversation.contact.phone || 'Desconhecido'}>{conversation.contact.name || conversation.contact.phone || 'Desconhecido'}</h2>
          <p className="truncate text-[11px] text-[var(--bq-t3)]" title={conversation.contact.phone || undefined}>
            {conversation.channel.name} · {conversation.isGroup ? 'Grupo' : conversation.contact.phone || 'Conversa'}
          </p>
        </div>
      </div>
      {conversation.channel.type !== 'JARVIS' && <div className="bq-chat-actions" data-ai={conversation.aiEnabled === true ? "forced" : conversation.aiEnabled === false ? "paused" : "default"}>
        <span className="bq-conversation-status" data-status={conversation.status} title={statusLabel}><span />{statusLabel}</span>
        <Popover className="relative"><PopoverButton className={`bq-button ${conversation.aiEnabled === true ? "text-bq-on-agent-forced" : ""}`} aria-label={aiLabel} title={aiLabel}><span className={`contents ${conversation.aiEnabled === true ? "text-bq-on-agent-forced" : ""}`}><Sparkles className="size-bq-size-icon-xs shrink-0" /><span className="truncate">{aiLabel}</span><ChevronDown className="size-bq-size-icon-xs shrink-0" /></span></PopoverButton><PopoverPanel anchor="bottom start" className="bq-popover">
          <div className="w-64 space-y-3 p-2" aria-label="IA nesta conversa">
            <ConversationAiToggle inline conversation={conversation} disabled={isLoading}
              onChange={(next) => handleAction(() => inboxService.toggleAi(conversation.id, next), next === null ? 'IA no padrão global' : next ? 'IA forçada nesta conversa' : 'IA pausada nesta conversa')}
              onEngage={() => handleAction(async () => {
                const result = await inboxService.engageAi(conversation.id);
                if (!result.engaged) throw new Error(result.reason || 'Não foi possível engajar a IA');
              }, 'IA engajada — vai responder em segundos')}
            />
            {conversation.isGroup && <div className="flex items-center justify-between gap-2 text-xs"><span>IA permitida no grupo<br /><small>Responde sozinha a toda mensagem do grupo</small></span><Switch label="IA permitida nesse grupo" checked={conversation.aiAllowedInGroup} disabled={allowedMut.isPending} onChange={handleAllowedToggle} /></div>}
            <AgentPinPopover inline conversation={conversation} onChanged={onUpdate} />
          </div>
        </PopoverPanel></Popover>
        <div className="bq-chat-extras">
          {conversation.status !== 'CLOSED' && <AssignmentPopover conversation={conversation} onChanged={onUpdate} />}
          <PipelinePopover conversation={conversation} onChanged={onUpdate} />
          {onToggleAgentLogs && <Button aria-label="Logs do agente" aria-pressed={agentLogsOpen} onClick={onToggleAgentLogs}><Activity size={14} /></Button>}
          <Button aria-label={conversation.status === "CLOSED" ? "Reabrir conversa" : "Encerrar conversa"} disabled={isLoading} onClick={() => handleAction(() => conversation.status === 'CLOSED' ? inboxService.reopenConversation(conversation.id) : inboxService.closeConversation(conversation.id), conversation.status === 'CLOSED' ? 'Conversa reaberta' : 'Conversa encerrada')}>
            {conversation.status === 'CLOSED' ? <RotateCcw size={15} /> : <CheckCheck size={15} />}
          </Button>
        </div>
        {onOpenTasks && <Button className="bq-chat-projects" aria-label="Projetos e tasks" onClick={onOpenTasks}><FolderKanban size={15} /></Button>}
        <FoundationPopover label="⋯">
          <div className="flex w-64 flex-col gap-2 p-2" aria-label="Opções da conversa">
            <div className="bq-chat-mobile-extras flex flex-col gap-2">
              {conversation.status !== 'CLOSED' && <AssignmentPopover conversation={conversation} onChanged={onUpdate} />}
              <PipelinePopover conversation={conversation} onChanged={onUpdate} />
              {onToggleAgentLogs && <Button onClick={onToggleAgentLogs}>Logs do agente</Button>}
              <Button disabled={isLoading} onClick={() => handleAction(() => conversation.status === 'CLOSED' ? inboxService.reopenConversation(conversation.id) : inboxService.closeConversation(conversation.id), conversation.status === 'CLOSED' ? 'Conversa reaberta' : 'Conversa encerrada')}>{conversation.status === 'CLOSED' ? 'Reabrir' : 'Encerrar'}</Button>
            </div>
            {onOpenTasks && <Button onClick={onOpenTasks}>Projetos e tasks</Button>}
            <Button onClick={handleSync} disabled={isSyncing}><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />Sincronizar mensagens</Button>
            {emailDeepLink(conversation) && <a className="bq-button" href={emailDeepLink(conversation)!}>Abrir no E-mail</a>}
          </div>
        </FoundationPopover>
        {onToggleProject && <Button aria-label={projectOpen ? 'Fechar painel do contato' : 'Abrir painel do contato'} aria-pressed={projectOpen} onClick={onToggleProject}><PanelRight size={15} /></Button>}
      </div>}
    </header>
  );
}

function HeaderAvatar({ name, avatarUrl, isGroup }: { name: string | null; avatarUrl: string | null; isGroup: boolean }) {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) return <img src={avatarUrl} alt={name || 'Contato'} referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`bq-avatar-mockup shrink-0 object-cover ${isGroup ? "bq-avatar-group" : ""}`} />;
  return <div style={{"--bq-avatar-hue": mockupAvatarHue(name || "?")} as CSSProperties} className={`bq-avatar-mockup flex shrink-0 items-center justify-center ${isGroup ? "bq-avatar-group" : ""}`}>{(name || '?').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>;
}

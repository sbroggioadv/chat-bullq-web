'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { jarvisDeskService } from '@/features/ai-agents/services/jarvis-desk.service';
import { AgentDetail } from '@/features/ai-agents/components/agent-detail';
import { MessageSquare, Plus } from 'lucide-react';
import { Button, SegmentedControl } from '@/components/ui/foundation';
import { CreateAgentDialog } from '@/features/ai-agents/components/create-agent-dialog';
import { useQueryClient } from '@tanstack/react-query';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';
import { AgentsList } from '@/features/ai-agents/components/agents-list';
import { JarvisOverviewTab } from '@/features/ai-agents/components/jarvis/overview-tab';
import { JarvisAgentTab } from '@/features/ai-agents/components/jarvis/agent-tab';
import { JarvisSkillsTab } from '@/features/ai-agents/components/jarvis/skills-tab';
import { JarvisToolsTab } from '@/features/ai-agents/components/jarvis/tools-tab';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';
import { JarvisWatchdogTab } from '@/features/ai-agents/components/jarvis/watchdog-tab';
import { JarvisScopeTab } from '@/features/ai-agents/components/jarvis/scope-tab';

type Tab =
  | 'overview'
  | 'agents'
  | 'skills'
  | 'tools'
  | 'agent'
  | 'runs'
  | 'watchdog'
  | 'scope';

const TAB_META: Record<Tab, { label: string }> = {
  overview: { label: 'Visão geral' },
  agents: { label: 'Agentes' },
  skills: { label: 'Skills' },
  tools: { label: 'Tools' },
  runs: { label: 'Execuções' },
  watchdog: { label: 'Watchdog' },
  agent: { label: 'Por agente' },
  scope: { label: 'Onde atua e cadência' },
};

const VALID_TABS: Tab[] = [
  'overview',
  'agents',
  'skills',
  'tools',
  'runs',
  'watchdog',
  'agent',
  'scope',
];

export default function AiAgentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const raw = (searchParams.get('tab') ?? 'overview') as Tab;
  const tab: Tab = VALID_TABS.includes(raw) ? raw : 'overview';
  const selectedId = searchParams.get('agentId');
  if (selectedId)
    return (
      <AgentDetail
        agentId={selectedId}
        onBack={() => router.push('/ai-agents?tab=agents')}
      />
    );

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <h1>Agentes</h1>
          <p>
            Os agentes de IA que atendem pelo escritório: quem são, quanto
            custam e como melhorar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              try {
                const desk = await jarvisDeskService.open();
                router.push(
                  `/inbox?conversationId=${desk.conversationId}&jarvis=1`,
                );
              } catch {
                toast.error('Não foi possível abrir o Jarvis');
              }
            }}
          >
            <MessageSquare size={14} />
            Conversar com o Jarvis
          </Button>
          <Button variant="solid" onClick={() => setCreating(true)}>
            <Plus size={14} />
            Novo agente
          </Button>
        </div>
      </header>
      <nav className={styles.tabs} aria-label="Área de agentes">
        <SegmentedControl
          label="Agentes"
          value={tab === 'agent' || tab === 'scope' ? 'agents' : tab}
          options={VALID_TABS.filter(
            (value) => value !== 'agent' && value !== 'scope',
          ).map((value) => ({ value, label: TAB_META[value].label }))}
          onChange={(value) => router.push(`/ai-agents?tab=${value}`)}
        />
      </nav>
      <div className={styles.body}>
        {['agents', 'agent', 'scope'].includes(tab) && (
          <nav className={styles.agentNavigation} aria-label="Explorar agentes">
            <SegmentedControl
              label="Explorar agentes"
              value={tab}
              options={[
                { value: 'agents', label: 'Organograma' },
                { value: 'agent', label: 'Por agente' },
                { value: 'scope', label: 'Scope & Cadência' },
              ]}
              onChange={(value) => router.push(`/ai-agents?tab=${value}`)}
            />
          </nav>
        )}
        {tab === 'overview' && <JarvisOverviewTab />}
        {tab === 'agents' && <AgentsList />}
        {tab === 'skills' && <JarvisSkillsTab />}
        {tab === 'tools' && <JarvisToolsTab />}
        {tab === 'runs' && <JarvisRunsTab />}
        {tab === 'watchdog' && <JarvisWatchdogTab />}
        {tab === 'agent' && <JarvisAgentTab />}
        {tab === 'scope' && <JarvisScopeTab />}
      </div>
      <CreateAgentDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
        }}
      />
    </div>
  );
}

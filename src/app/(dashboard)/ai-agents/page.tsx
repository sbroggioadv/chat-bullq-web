'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { jarvisDeskService } from '@/features/ai-agents/services/jarvis-desk.service';
import { AgentDetail } from '@/features/ai-agents/components/agent-detail';
import { AgentsPageHeader } from '@/features/ai-agents/components/agents-page-header';
import { MessageSquare, Plus } from 'lucide-react';
import {
  Button,
  SegmentedControl,
  PageSkeleton,
} from '@/components/ui/foundation';
import { CreateAgentDialog } from '@/features/ai-agents/components/create-agent-dialog';
import { useQueryClient } from '@tanstack/react-query';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';
import { AgentsList } from '@/features/ai-agents/components/agents-list';
import {
  JarvisOverviewTab,
  OverviewControls,
} from '@/features/ai-agents/components/jarvis/overview-tab';
import { JarvisAgentTab } from '@/features/ai-agents/components/jarvis/agent-tab';
import { JarvisSkillsTab } from '@/features/ai-agents/components/jarvis/skills-tab';
import { JarvisToolsTab } from '@/features/ai-agents/components/jarvis/tools-tab';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';
import { JarvisWatchdogTab } from '@/features/ai-agents/components/jarvis/watchdog-tab';
import { JarvisScopeTab } from '@/features/ai-agents/components/jarvis/scope-tab';

import type { Period } from '@/features/ai-agents/services/ai-agents.service';

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
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');
  const onCreate = () => setCreating(true);
  return (
    <div className={styles.workspace}>
      {/* URL resolution must not hold the static heading behind the content. */}
      <Suspense fallback={<AgentsHeader onCreate={onCreate} />}>
        <RouteHeader
          onCreate={onCreate}
          period={period}
          onPeriodChange={setPeriod}
        />
      </Suspense>
      <Suspense fallback={<PageSkeleton />}>
        <AgentsContent period={period} />
      </Suspense>
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

function AgentsHeader({
  onCreate,
  children,
}: {
  onCreate: () => void;
  children?: ReactNode;
}) {
  const router = useRouter();
  return (
    <AgentsPageHeader>
      {children}
      <Button
        onClick={async () => {
          try {
            const desk = await jarvisDeskService.open();
            router.push(
              `/inbox?conversationId=${desk.conversationId}&jarvis=1`,
            );
          } catch {
            toast.error('Não foi possível abrir o Synq Agent');
          }
        }}
      >
        <MessageSquare size={14} />
        Conversar com o Synq Agent
      </Button>
      <Button variant="solid" onClick={onCreate}>
        <Plus size={14} />
        Novo agente
      </Button>
    </AgentsPageHeader>
  );
}

function RouteHeader({
  onCreate,
  period,
  onPeriodChange,
}: {
  onCreate: () => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const searchParams = useSearchParams();
  if (searchParams.get('agentId')) return null;
  const raw = (searchParams.get('tab') ?? 'overview') as Tab;
  const overview = !VALID_TABS.includes(raw) || raw === 'overview';
  return (
    <AgentsHeader onCreate={onCreate}>
      {overview && (
        <OverviewControls period={period} onPeriodChange={onPeriodChange} />
      )}
    </AgentsHeader>
  );
}

function AgentsContent({ period }: { period: Period }) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    <>
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
        {tab === 'overview' && <JarvisOverviewTab period={period} />}
        {tab === 'agents' && <AgentsList />}
        {tab === 'skills' && <JarvisSkillsTab />}
        {tab === 'tools' && <JarvisToolsTab />}
        {tab === 'runs' && <JarvisRunsTab />}
        {tab === 'watchdog' && <JarvisWatchdogTab />}
        {tab === 'agent' && <JarvisAgentTab />}
        {tab === 'scope' && <JarvisScopeTab />}
      </div>
    </>
  );
}

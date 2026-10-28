import type { ReactNode } from 'react';
import styles from '@/features/ai-agents/components/agents-workspace.module.css';

export function AgentsPageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div>
        <h1>Agentes</h1>
        <p>
          Os agentes de IA que atendem pelo escritório: quem são, quanto custam
          e como melhorar.
        </p>
      </div>
      <div className={styles.headerTools}>{children}</div>
    </header>
  );
}

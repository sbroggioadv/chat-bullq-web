'use client';

import { Button, SettingRow } from '@/components/ui/foundation';
import styles from '@/features/settings/components/settings.module.css';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Shield, ShieldCheck, User, Copy, Link, X, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { membersService, type Member } from '@/features/settings/services/members.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { MemberChannelsDrawer } from '@/features/settings/components/member-channels-drawer';

const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: 'Proprietário', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  AGENT: { label: 'Atendente', icon: User, color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400' },
};

export default function SettingsMembersPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');
  const [inviting, setInviting] = useState(false);

  const orgId = useOrgId();
  const { data: members, isLoading } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => membersService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['members'] });

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [drawerMember, setDrawerMember] = useState<Member | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await membersService.invite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      refresh();
      if (result.autoAccepted) {
        toast.success('Membro adicionado com sucesso!');
      } else {
        const link = `${window.location.origin}/register?invite=${result.token}`;
        setInviteLink(link);
        toast.success('Convite criado! Compartilhe o link com o membro.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      await membersService.updateRole(memberId, role);
      toast.success('Role atualizada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar role');
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return;
    try {
      await membersService.remove(memberId);
      toast.success('Membro removido');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  return (
    <div className="space-y-5">
      <section><h2 className={styles.sectionTitle}>Convidar</h2><div className={styles.block}>
        <SettingRow title="E-mail da pessoa" description="Use Atendente para quem vai conectar e operar o próprio WhatsApp."><div className={styles.inviteControls}>
          <input aria-label="E-mail para convite" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInvite()} placeholder="nome@escritorio.com.br" />
          <select aria-label="Papel do convidado" value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="AGENT">Atendente</option><option value="ADMIN">Administrador</option></select>
          <Button variant="solid" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>{inviting ? 'Convidando…' : 'Convidar'}</Button>
        </div></SettingRow>
      </div></section>

      {inviteLink && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/30 dark:bg-primary/10">
          <Link className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Link de convite (expira em 7 dias)</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{inviteLink}</p>
          </div>
          <button
            onClick={copyInviteLink}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setInviteLink(null)}
            className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section><h2 className={styles.sectionTitle}>Membros{members ? ` · ${members.length}` : ''}</h2><div className={styles.block}>
        {isLoading ? <p className="p-4" role="status">Carregando membros…</p> : !members?.length ? <p className="p-4 text-[var(--bq-t3)]">Nenhum membro encontrado</p> : members.map(m => <div key={m.id} className={styles.listRow}>
          <span className={styles.memberAvatar}>{m.user.name.slice(0,2).toUpperCase()}</span>
          <div className={styles.rowText}><h3>{m.user.name}</h3><p>{m.user.email} · desde {new Date(m.joinedAt).toLocaleDateString('pt-BR')}</p></div>
          <div className={styles.rowActions}>
            {m.role === 'OWNER' ? <span className="bq-pill">{roleLabels[m.role].label}</span> : <select aria-label={`Papel de ${m.user.name}`} value={m.role} onChange={e => handleChangeRole(m.id,e.target.value)}><option value="ADMIN">Administrador</option><option value="AGENT">Atendente</option></select>}
            <Button onClick={() => setDrawerMember(m)} data-testid="member-channels-btn" aria-label={`Gerenciar canais de ${m.user.name}`}><Hash size={13} /> Canais</Button>
            {m.role !== 'OWNER' && <button className="bq-icon" aria-label={`Remover ${m.user.name}`} onClick={() => handleRemove(m.id,m.user.name)}><Trash2 size={14} /></button>}
          </div>
        </div>)}
      </div></section>

      <MemberChannelsDrawer
        open={!!drawerMember}
        member={
          drawerMember
            ? {
                // Backend resolves member by userId; the existing list returns
                // userOrganization rows where `userId` is the field we need.
                id: drawerMember.userId,
                name: drawerMember.user.name,
                role: drawerMember.role,
              }
            : null
        }
        onClose={() => setDrawerMember(null)}
        onSaved={refresh}
      />
    </div>
  );
}

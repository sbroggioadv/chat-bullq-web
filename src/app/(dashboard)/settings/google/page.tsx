import Link from 'next/link';
import { SettingRow } from '@/components/ui/foundation';
export default function GoogleSettingsPage() { return <div className="rounded-xl border border-[var(--bq-hair)] p-4"><SettingRow title="Conta Google" description="Conecte, reconecte ou autorize a Agenda pelo canal Gmail."><Link href="/settings/channels" className="bq-button">Abrir Canais</Link></SettingRow><SettingRow title="Agenda e reuniões" description="Consulte os eventos e reuniões disponíveis."><Link href="/calendar" className="bq-button">Abrir Agenda</Link></SettingRow></div>; }

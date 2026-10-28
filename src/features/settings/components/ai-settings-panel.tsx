'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { SettingsSaveBar } from '@/features/settings/components/settings-save-bar';
import { WatchdogSummary } from '@/features/settings/components/watchdog-summary';
import { useOrgId } from '@/hooks/use-org-query-key';
import styles from '@/features/settings/components/settings.module.css';
import { Button, SettingRow, Switch } from '@/components/ui/foundation';
import { toast } from 'sonner';
import {
  aiSettingsService,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_WATCHDOG_CONFIG,
  WEEKDAYS,
  type OrganizationAiSettings,
  type BusinessHoursConfig,
  type WatchdogConfig,
  type Weekday,
} from '@/features/ai-agents/services/ai-settings.service';
import { channelsService, type Channel } from '@/features/channels/services/channels.service';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
];

export function AiSettingsPanel({ watchdogOnly = false }: { watchdogOnly?: boolean }) {
  const orgId = useOrgId();
  const [revision, setRevision] = useState(0);
  const { data, isLoading, isError } = useQuery({ queryKey: ['ai-settings', orgId], queryFn: () => aiSettingsService.get() });
  if (isLoading) return <p role="status">Carregando configurações…</p>;
  if (isError || !data) return <p role="alert">Não foi possível carregar as configurações de IA.</p>;
  return <AiSettingsEditor key={`${orgId}:${revision}:${JSON.stringify(data)}`} data={data} watchdogOnly={watchdogOnly} onDiscard={() => setRevision(value => value + 1)} />;
}

function AiSettingsEditor({ data, watchdogOnly, onDiscard }: { data: OrganizationAiSettings; watchdogOnly: boolean; onDiscard: () => void }) {
  const qc = useQueryClient();
  const [aiEnabled, setAiEnabled] = useState(data.aiEnabled);
  const [aiPanicMode, setAiPanicMode] = useState(data.aiPanicMode ?? false);
  const [aiTimezone, setAiTimezone] = useState(data.aiTimezone);
  const [hours, setHours] = useState<BusinessHoursConfig>(data.aiBusinessHours ?? DEFAULT_BUSINESS_HOURS);
  // 24/7: representado no banco como aiBusinessHours = null. Mantemos os
  // valores de `hours` no state mesmo com 24/7 ON pra preservar a config
  // anterior se o user voltar atrás.
  const [alwaysOn, setAlwaysOn] = useState(data.aiBusinessHours == null);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState(data.aiOutOfHoursMessage ?? '');
  const [businessNotes, setBusinessNotes] = useState(data.aiBusinessNotes ?? '');
  const [autoDisable, setAutoDisable] = useState(data.aiAutoDisableOnHuman);
  const [tokenCap, setTokenCap] = useState<string>(data.aiMonthlyTokenCap?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  // ─── Watchdog state ──────────────────────────────
  const [watchdogEnabled, setWatchdogEnabled] = useState(data.watchdogEnabled);
  const [watchdogHours, setWatchdogHours] =
    useState<BusinessHoursConfig>(data.watchdogBusinessHours ?? DEFAULT_BUSINESS_HOURS);
  const [watchdogAlwaysOn, setWatchdogAlwaysOn] = useState(data.watchdogBusinessHours == null);
  const [watchdogConfig, setWatchdogConfig] = useState<Required<WatchdogConfig>>(
    { ...DEFAULT_WATCHDOG_CONFIG, ...(data.watchdogConfig ?? {}) },
  );

  // ─── URL whitelist state ─────────────────────────
  const [allowedDomainsText, setAllowedDomainsText] = useState((data.allowedUrlDomains ?? []).join('\n'));

  const current = JSON.stringify({ aiEnabled, aiPanicMode, aiTimezone, hours, alwaysOn, outOfHoursMessage, businessNotes, autoDisable, tokenCap, watchdogEnabled, watchdogHours, watchdogAlwaysOn, watchdogConfig, allowedDomainsText });
  const [initial] = useState(current);
  const dirty = current !== initial;

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedDomains = allowedDomainsText
        .split(/[\n,]+/)
        .map((d) =>
          d
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, ''),
        )
        .filter(Boolean);
      await aiSettingsService.update(watchdogOnly ? { watchdogEnabled, watchdogBusinessHours: watchdogAlwaysOn ? null : watchdogHours, watchdogConfig } : {
        aiEnabled,
        aiPanicMode,
        aiTimezone,
        aiBusinessHours: alwaysOn ? null : hours,
        aiOutOfHoursMessage: outOfHoursMessage,
        aiBusinessNotes: businessNotes.trim() ? businessNotes : null,
        aiAutoDisableOnHuman: autoDisable,
        aiMonthlyTokenCap: tokenCap ? parseInt(tokenCap, 10) : null,
        allowedUrlDomains: parsedDomains.length > 0 ? parsedDomains : null,
      });
      toast.success('Configurações de IA salvas');
      qc.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const updateWatchdogDay = (
    day: Weekday,
    patch: Partial<{ enabled: boolean; windows: Array<[string, string]> }>,
  ) => {
    setWatchdogHours((prev) => ({
      ...prev,
      [day]: {
        enabled: prev[day]?.enabled ?? false,
        windows: prev[day]?.windows ?? [],
        ...patch,
      },
    }));
  };

  const addWatchdogWindow = (day: Weekday) => {
    setWatchdogHours((prev) => {
      const existing = prev[day]?.windows ?? [];
      return {
        ...prev,
        [day]: {
          enabled: prev[day]?.enabled ?? true,
          windows: [...existing, ['09:00', '18:00']],
        },
      };
    });
  };

  const removeWatchdogWindow = (day: Weekday, idx: number) => {
    setWatchdogHours((prev) => {
      const existing = prev[day]?.windows ?? [];
      return {
        ...prev,
        [day]: {
          enabled: prev[day]?.enabled ?? false,
          windows: existing.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const updateDay = (
    day: Weekday,
    patch: Partial<{ enabled: boolean; windows: Array<[string, string]> }>,
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        enabled: prev[day]?.enabled ?? false,
        windows: prev[day]?.windows ?? [],
        ...patch,
      },
    }));
  };

  const addWindow = (day: Weekday) => {
    setHours((prev) => {
      const existing = prev[day]?.windows ?? [];
      return {
        ...prev,
        [day]: {
          enabled: prev[day]?.enabled ?? true,
          windows: [...existing, ['09:00', '18:00']],
        },
      };
    });
  };

  const removeWindow = (day: Weekday, idx: number) => {
    setHours((prev) => {
      const existing = prev[day]?.windows ?? [];
      return {
        ...prev,
        [day]: {
          enabled: prev[day]?.enabled ?? false,
          windows: existing.filter((_, i) => i !== idx),
        },
      };
    });
  };

  return (
    <div className={styles.aiPanel}>
      {!watchdogOnly && <>
      <section className={styles.kill}>
        <div className={styles.rowText}><h3>{aiPanicMode ? 'Toda a IA será pausada' : 'Controle de toda a IA'}</h3><p>Desliga a IA em todos os canais e pipelines. A alteração entra em vigor ao salvar.</p></div>
        <Button className={styles.danger} role="switch" aria-label="Pausar toda a IA" aria-checked={aiPanicMode} onClick={() => setAiPanicMode(!aiPanicMode)}>{aiPanicMode ? 'Religar a IA' : 'Desligar toda a IA'}</Button>
      </section>

      <section><h2 className={styles.sectionTitle}>Quando atende</h2><div className={styles.block}>
      <section className={styles.aiRow}>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              IA habilitada (geral)
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Padrão para novas conversas; cada canal e conversa pode ter sua regra. Agentes de pipeline só param com o controle de toda a IA acima.
            </p>
          </div>
          <Toggle label="IA habilitada" checked={aiEnabled} onChange={setAiEnabled} />
        </label>
      </section>

      {/* Auto-disable on human */}
      <section className={styles.aiRow}>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Pausar IA quando humano responde
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Assim que um atendente envia uma mensagem na conversa, a IA é
              automaticamente desativada nessa conversa específica.
            </p>
          </div>
          <Toggle label="Pausar IA quando humano responde" checked={autoDisable} onChange={setAutoDisable} />
        </label>
      </section>
      <SettingRow title="Resumir as conversas"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow>
      <SettingRow title="Sugerir tasks, reuniões e demandas"><span className={styles.unavailable}>Ainda não disponível</span></SettingRow>
      </div></section>

      {/* Business hours */}
      <section className={styles.aiBlock}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Horário de atendimento
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {alwaysOn
                ? 'IA responde a qualquer hora — 24 horas por dia, todos os dias.'
                : 'Fora desses horários a IA não responde.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Atendimento 24/7
              </span>
              <Toggle label="Atendimento 24 horas" checked={alwaysOn} onChange={setAlwaysOn} />
            </label>
            <select
              value={aiTimezone}
              onChange={(e) => setAiTimezone(e.target.value)}
              disabled={alwaysOn}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {alwaysOn ? null : (
        <div className="mt-4 space-y-3">
          {WEEKDAYS.map(({ key, label }) => {
            const day = hours[key] ?? { enabled: false, windows: [] };
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <label className="flex w-24 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) =>
                      updateDay(key, { enabled: e.target.checked })
                    }
                    className="h-3.5 w-3.5 rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {label}
                  </span>
                </label>

                {day.enabled ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {(day.windows ?? []).map(([from, to], i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          type="time"
                          value={from}
                          onChange={(e) => {
                            const updated = [...(day.windows ?? [])];
                            updated[i] = [e.target.value, to];
                            updateDay(key, { windows: updated });
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <span className="text-xs text-zinc-400">até</span>
                        <input
                          type="time"
                          value={to}
                          onChange={(e) => {
                            const updated = [...(day.windows ?? [])];
                            updated[i] = [from, e.target.value];
                            updateDay(key, { windows: updated });
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <button
                          onClick={() => removeWindow(key, i)}
                          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addWindow(key)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3 w-3" /> Janela
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">Não atende</span>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* Out of hours message */}
      <section className={styles.aiBlock}>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Mensagem fora de horário (opcional)
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Texto enviado automaticamente quando alguém manda mensagem fora do
          horário configurado. Vazio = não responde nada.
        </p>
        <textarea
          value={outOfHoursMessage}
          onChange={(e) => setOutOfHoursMessage(e.target.value)}
          rows={2}
          placeholder="Olá! No momento estamos fora do horário de atendimento. Voltamos amanhã às 9h e respondemos sua mensagem por aqui."
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </section>

      {/* Business notes — vai pro contexto de TODOS os agentes da org */}
      <section className={styles.aiBlock}>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Contexto do negócio (visto por todos os agentes)
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Texto livre que entra no system prompt de cada agente. Use pra info que
          muda com frequência e vale pra qualquer fluxo:
          como cada isca/lead magnet é entregue, horários de live, política de
          reembolso, talking points atuais, regras especiais.
          Atualize aqui em vez de editar agente por agente.
        </p>
        <textarea
          value={businessNotes}
          onChange={(e) => setBusinessNotes(e.target.value)}
          rows={8}
          maxLength={4000}
          placeholder={`Exemplos:

Iscas gratuitas:
- "MAESTRIA": entrega via aula ao vivo todo dia às 20h, link liberado 30min antes no grupo do WhatsApp.
- "EBOOK": link de download enviado automaticamente por email após mandar a palavra.

Política de bônus:
- Liberação 7 dias após a compra, automaticamente no portal. Sem liberação manual antes disso.

Reembolso:
- Garantia de 7 dias. Após esse prazo, escalar pra atendimento humano.`}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-400">
          {businessNotes.length} / 4000
        </p>
      </section>

      {/* Token cap */}
      <section className={styles.aiBlock}>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Limite mensal de tokens
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Soma input + output. Vazio = sem limite.
        </p>
        <input
          type="number"
          min="0"
          value={tokenCap}
          onChange={(e) => setTokenCap(e.target.value)}
          placeholder="ex: 1000000"
          className="mt-3 w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </section>

      {/* URL Whitelist */}
      <section className={styles.aiBlock}>
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Domínios permitidos em links da IA
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Quando preenchida, a IA não consegue mandar URL com host fora
              dessa lista — o sistema bloqueia em runtime e força a IA a
              reescrever sem o link inventado. Match é por sufixo: <code className="font-mono text-[10px]">bravy.co</code> autoriza
              <code className="ml-1 font-mono text-[10px]">members.bravy.co</code>. Vazia = não bloqueia (só loga aviso).
            </p>
            <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Informe os domínios autorizados para links enviados pela IA.
            </p>
            <textarea
              value={allowedDomainsText}
              onChange={(e) => setAllowedDomainsText(e.target.value)}
              rows={5}
              placeholder={`bravy.co\ntrivapp.com.br\nalunos.bravy.school`}
              className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-[10px] text-zinc-400">
              Um domínio por linha. Cole sem <code>https://</code> ou <code>www.</code> — a gente normaliza.
            </p>
          </div>
        </div>
      </section>

      <details className={`${styles.block} ${styles.details}`}><summary>IA por canal · ajustes imediatos</summary><ChannelAiOverrides /></details>
      </>}
      {watchdogOnly && <>
      <WatchdogSummary />
      {/* Watchdog kill switch */}
      <section className={styles.aiBlock}>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Watchdog habilitado
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Quando OFF, conversas presas ficam paradas até um humano
              intervir. Recomendado deixar ON.
            </p>
          </div>
          <Toggle label="Watchdog habilitado" checked={watchdogEnabled} onChange={setWatchdogEnabled} />
        </label>
      </section>

      <section><h2 className={styles.sectionTitle}>Ritmo</h2><div className={styles.block}><SettingRow title="Quanto esperar" description="Ajuste os tempos abaixo individualmente."><span className={styles.unavailable}>Ritmos predefinidos ainda não disponíveis</span></SettingRow></div></section>
      {/* Watchdog params */}
      <section className={styles.aiBlock}>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Parâmetros
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Controle quanto o watchdog espera antes de reagir e quantas vezes
          tenta antes de marcar a conversa como presa.
        </p>
        <div className={styles.numberRows}>
          <NumberField
            label="IA travou (status BOT)"
            hint="Minutos sem resposta com IA atendendo."
            suffix="min"
            value={watchdogConfig.delayBotMin}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, delayBotMin: v }))
            }
            disabled={!watchdogEnabled}
          />
          <NumberField
            label="Ninguém pegou (PENDING)"
            hint="Minutos sem ninguém assumir a conversa."
            suffix="min"
            value={watchdogConfig.delayPendingMin}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, delayPendingMin: v }))
            }
            disabled={!watchdogEnabled}
          />
          <NumberField
            label="Humano abandonou (OPEN)"
            hint="Minutos sem o atendente humano responder."
            suffix="min"
            value={watchdogConfig.delayHumanIdleMin}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, delayHumanIdleMin: v }))
            }
            disabled={!watchdogEnabled}
          />
          <NumberField
            label="Tentativas máximas"
            hint="Após esse número, marca como presa e notifica gestor."
            suffix=""
            value={watchdogConfig.maxAttempts}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, maxAttempts: v }))
            }
            disabled={!watchdogEnabled}
            min={1}
            max={10}
          />
        </div>
      </section>

      {/* Watchdog business hours */}
      <section className={styles.aiBlock}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Horário de atuação do watchdog
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {watchdogAlwaysOn
                ? 'Watchdog roda 24/7. Reativa conversas a qualquer hora.'
                : 'Fora desse horário o watchdog não reativa conversas.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                24/7
              </span>
              <Toggle
                label="Watchdog 24 horas" checked={watchdogAlwaysOn}
                onChange={setWatchdogAlwaysOn}
              />
            </label>
          </div>
        </div>

        {watchdogAlwaysOn ? null : (
          <div className="mt-4 space-y-3">
            {WEEKDAYS.map(({ key, label }) => {
              const day = watchdogHours[key] ?? { enabled: false, windows: [] };
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <label className="flex w-24 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) =>
                        updateWatchdogDay(key, { enabled: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-zinc-300"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {label}
                    </span>
                  </label>

                  {day.enabled ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {(day.windows ?? []).map(([from, to], i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input
                            type="time"
                            value={from}
                            onChange={(e) => {
                              const updated = [...(day.windows ?? [])];
                              updated[i] = [e.target.value, to];
                              updateWatchdogDay(key, { windows: updated });
                            }}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <span className="text-xs text-zinc-400">até</span>
                          <input
                            type="time"
                            value={to}
                            onChange={(e) => {
                              const updated = [...(day.windows ?? [])];
                              updated[i] = [from, e.target.value];
                              updateWatchdogDay(key, { windows: updated });
                            }}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <button
                            onClick={() => removeWatchdogWindow(key, i)}
                            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addWatchdogWindow(key)}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Plus className="h-3 w-3" /> Janela
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">Não atua</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <p className="mt-4 text-xs text-[var(--bq-t3)]">Ritmos predefinidos, ação personalizada por caso e destinatários de alerta ainda não disponíveis. Os tempos acima mantêm a configuração atual.</p>
      </>}
      <SettingsSaveBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={onDiscard} />
    </div>
  );
}

function NumberField({
  label,
  hint,
  suffix,
  value,
  onChange,
  disabled,
  min = 1,
  max = 1440,
}: {
  label: string;
  hint: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div className={styles.numberRow}>
      <div className={styles.rowText}><label className="text-[13px] font-medium">{label}</label><p>{hint}</p></div>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {suffix ? (
          <span className="text-xs text-zinc-500">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return <Switch checked={checked} onChange={onChange} label={label} />;
}

/**
 * Lista todos os canais ativos com um tri-state selector pra IA por canal:
 *   "Padrão" (null) → segue o toggle global da org
 *   "Forçar ON" (true) → IA responde nesse canal mesmo se org tá OFF
 *   "Forçar OFF" (false) → IA não responde nesse canal mesmo com org ON
 *
 * Cada mudança chama PATCH /channels/:id imediatamente — não precisa salvar.
 */
function ChannelAiOverrides() {
  const qc = useQueryClient();
  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', useOrgId()],
    queryFn: () => channelsService.list(),
  });

  const update = async (id: string, value: boolean | null) => {
    try {
      await channelsService.update(id, { aiEnabled: value });
      qc.invalidateQueries({ queryKey: ['channels'] });
      toast.success(
        value === null
          ? 'Canal seguindo padrão da org'
          : value
            ? 'IA forçada ON nesse canal'
            : 'IA desligada nesse canal',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  const visible = (channels ?? []).filter((c) => !!c.isActive);

  return (
    <section className={styles.aiBlock}>
      <div className="mb-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          IA por canal
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sobrepõe o toggle geral acima por canal. Útil pra ligar IA só num
          número de teste, ou desligar num canal de produção temporariamente.
        </p>
      </div>

      {isLoading ? (
        <div className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      ) : visible.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Nenhum canal ativo. Adicione canais na aba Canais.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => (
            <ChannelOverrideRow
              key={c.id}
              channel={c}
              onChange={(v) => update(c.id, v)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChannelOverrideRow({
  channel,
  onChange,
}: {
  channel: Channel;
  onChange: (v: boolean | null) => void;
}) {
  const opts: Array<{ value: 'inherit' | 'on' | 'off'; label: string; bg: string }> = [
    { value: 'inherit', label: 'Padrão', bg: 'bg-zinc-200 dark:bg-zinc-700' },
    { value: 'on', label: 'ON', bg: 'bg-emerald-500' },
    { value: 'off', label: 'OFF', bg: 'bg-red-500' },
  ];
  const current: 'inherit' | 'on' | 'off' =
    channel.aiEnabled === null || channel.aiEnabled === undefined
      ? 'inherit'
      : channel.aiEnabled
        ? 'on'
        : 'off';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {channel.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {channel.type.replace('_', ' ').toLowerCase()}
        </p>
      </div>
      <div className="inline-flex rounded-md bg-zinc-200 p-0.5 dark:bg-zinc-800">
        {opts.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChange(
                  opt.value === 'inherit' ? null : opt.value === 'on',
                )
              }
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? `${opt.bg} text-white`
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

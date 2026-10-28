"use client";

import { useMemo, useState } from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { Button, SegmentedControl } from "@/components/ui/foundation";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Tag as TagIcon,
  MessageCircle,
  CalendarClock,
  Star,
  RotateCcw,
  Mail,
  Instagram,
  Phone,
  ChevronDown,
} from "lucide-react";
import {
  dashboardService,
  type SparklinePoint,
} from "@/features/dashboard/services/dashboard.service";
import { useOrgId } from "@/hooks/use-org-query-key";
import { Heatmap } from "@/features/dashboard/components/Heatmap";
import { AgentList } from "@/features/dashboard/components/AgentList";

const CHANNEL_COLORS = [
  "var(--bq-ok)",
  "var(--bq-info)",
  "var(--bq-warn)",
  "var(--bq-agent)",
  "var(--bq-agent)",
  "var(--bq-info)",
];

type TrendDirection = "higher-is-better" | "lower-is-better";

function TrendBadge({
  value,
  direction,
}: {
  value: number;
  direction: TrendDirection;
}) {
  if (value === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--bq-t3)]">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const isPositive = direction === "higher-is-better" ? value > 0 : value < 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-[var(--bq-ok)]" : "text-[var(--bq-err)]"}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

function CsatTrendBadge({ value }: { value: number }) {
  const Icon = value === 0 ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const color =
    value === 0
      ? "text-[var(--bq-t3)]"
      : value > 0
        ? "text-[var(--bq-ok)]"
        : "text-[var(--bq-err)]";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {sign}{Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/5
    </span>
  );
}

function HeroKpi({
  label,
  value,
  suffix,
  trend,
  trendDirection,
  trendContent,
  accent,
  sparkline,
  sparklineSuffix,
  footer,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: number;
  trendDirection?: TrendDirection;
  trendContent?: React.ReactNode;
  accent: string;
  sparkline?: SparklinePoint[];
  sparklineSuffix?: string;
  footer?: React.ReactNode;
}) {
  const gradientId = `grad-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="relative min-h-[122px] min-w-0 flex flex-col rounded-[14px] border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-3   ">
      <details className="group relative text-[11.5px] text-[var(--bq-t3)]">
        <summary
          className="cursor-pointer list-none truncate"
          title="Ver detalhes do indicador"
        >
          {label}
        </summary>
        {footer && (
          <div className="absolute left-0 top-6 z-20 w-56 rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-glass-strong)] p-3 shadow-lg">
            {footer}
          </div>
        )}
      </details>

      <div className="mt-1 flex flex-col items-start gap-1">
        <span className="text-[23px] leading-[1.15] font-[family-name:var(--bq-f-display)] font-medium tabular-nums text-[var(--bq-t1)] ">
          {value}
          {suffix && (
            <span className="ml-0.5 text-xs text-[var(--bq-t3)]">{suffix}</span>
          )}
        </span>
        {(trendContent || (trend !== undefined && trendDirection)) && (
          <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
            {trendContent ??
              (trend !== undefined && trendDirection && (
                <TrendBadge value={trend} direction={trendDirection} />
              ))}
            <span className="text-[var(--bq-t3)]">vs. anterior</span>
          </div>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="mt-1 -mx-1 h-[26px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparkline}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{
                  stroke: accent,
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                contentStyle={{
                  background: "var(--bq-glass-strong)",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 11,
                  padding: "4px 8px",
                  color: "var(--bq-t1)",
                }}
                labelFormatter={(d) =>
                  typeof d === "string" ? d.slice(5) : ""
                }
                formatter={(v) => [`${v}${sparklineSuffix ?? ""}`, ""]}
                separator=""
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--bq-t2)"
                strokeWidth={1.5}
                fill="transparent"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="h-44 animate-pulse min-w-0 rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-surface)]  " />
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
  height = "h-[170px]",
  subtitle,
  legend,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  height?: string;
  subtitle?: string;
  legend?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-[14px]   ">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--bq-t2)] ">
            {Icon && <Icon className="h-4 w-4 text-[var(--bq-t3)]" />}
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[var(--bq-t3)]">{subtitle}</p>
          )}
        </div>
        {legend}
      </div>
      <div className={`mt-3 ${height}`}>{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--bq-glass-strong)",
  border: "none",
  borderRadius: 6,
  fontSize: 11,
  padding: "6px 10px",
  color: "var(--bq-t1)",
};

export default function DashboardPage() {
  const orgId = useOrgId();
  const [period, setPeriod] = useState("30");
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - Number(period));
    return { from: from.toISOString(), to: to.toISOString() };
  }, [period]);
  const {
    data: overview,
    isLoading: loadingOverview,
    isError: overviewError,
    refetch: retryOverview,
  } = useQuery({
    queryKey: ["dashboard-overview", orgId, range],
    queryFn: () => dashboardService.getOverview(range.from, range.to),
  });
  const { data: sparklines } = useQuery({
    queryKey: ["dashboard-sparklines", orgId, range],
    queryFn: () => dashboardService.getKpiSparklines(range.from, range.to),
  });
  const { data: volumeFlow } = useQuery({
    queryKey: ["dashboard-volume-flow", orgId, range],
    queryFn: () => dashboardService.getVolumeFlow(range.from, range.to),
  });
  const { data: messagesFlow } = useQuery({
    queryKey: ["dashboard-messages-flow", orgId, range],
    queryFn: () => dashboardService.getMessagesFlow(range.from, range.to),
  });
  const { data: peakHours } = useQuery({
    queryKey: ["dashboard-peak-hours", orgId, range],
    queryFn: () => dashboardService.getPeakHours(range.from, range.to),
  });
  const { data: volumeByChannel } = useQuery({
    queryKey: ["dashboard-volume-channel", orgId, range],
    queryFn: () => dashboardService.getVolumeByChannel(range.from, range.to),
  });
  const { data: channelPremises } = useQuery({
    queryKey: ["dashboard-channel-premises", orgId, range],
    queryFn: () => dashboardService.getChannelPremises(range.from, range.to),
  });
  const { data: botPerf } = useQuery({
    queryKey: ["dashboard-bot-performance", orgId, range],
    queryFn: () => dashboardService.getBotPerformance(range.from, range.to),
  });
  const { data: topTags } = useQuery({
    queryKey: ["dashboard-top-tags", orgId, range],
    queryFn: () => dashboardService.getTopTags(range.from, range.to),
  });
  const { data: agents } = useQuery({
    queryKey: ["dashboard-agents", orgId, range],
    queryFn: () => dashboardService.getAgentPerformance(range.from, range.to),
  });
  const { data: csat } = useQuery({
    queryKey: ["dashboard-csat", orgId, range],
    queryFn: () => dashboardService.getCsat(range.from, range.to),
  });
  const { data: reopens } = useQuery({
    queryKey: ["dashboard-reopens", orgId, range],
    queryFn: () => dashboardService.getReopens(range.from, range.to),
  });

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-none px-5 py-[18px] text-[13px] text-[var(--bq-t1)] antialiased">
        <header className="mb-[14px] flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl leading-[1.1] font-[family-name:var(--bq-f-display)] font-medium tracking-[-0.02em]">
              Dashboard
            </h1>
            <p className="mt-1 text-[var(--bq-t3)]">
              Premissas · WhatsApp · Instagram · E-mail · últimos {period} dias
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Período"
              value={period}
              options={[
                { value: "7", label: "7 dias" },
                { value: "30", label: "30 dias" },
                { value: "90", label: "90 dias" },
              ]}
              onChange={setPeriod}
            />
            <Menu>
              <MenuButton className="bq-button">
                <ChevronDown size={14} aria-hidden="true" />
                Exportar
              </MenuButton>
              <MenuItems anchor="bottom end" className="bq-popover">
                <MenuItem>
                  <button
                    type="button"
                    disabled={!overview}
                    onClick={() => {
                      if (!overview) return;
                      const csv = [
                        "Indicador;Valor",
                        ...Object.entries(overview)
                          .filter(([, value]) => typeof value !== "object")
                          .map(([key, value]) => `${key};${value ?? ""}`),
                      ].join("\n");
                      const url = URL.createObjectURL(
                        new Blob(["\ufeff" + csv], {
                          type: "text/csv;charset=utf-8",
                        }),
                      );
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `bullq-dashboard-${period}d.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Baixar indicadores (CSV)
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </header>
        {overviewError && (
          <div
            role="alert"
            className="mb-3 flex flex-wrap items-center gap-3 min-w-0 rounded-xl border border-[var(--bq-hair)] p-3"
          >
            Não foi possível carregar os indicadores.{" "}
            <Button onClick={() => retryOverview()}>Tentar novamente</Button>
          </div>
        )}
        {/* HERO KPIs */}
        <div className="grid gap-[10px] grid-cols-[repeat(auto-fit,minmax(158px,1fr))]">
          {loadingOverview ? (
            <>
              {Array.from({ length: 7 }, (_, i) => (
                <HeroSkeleton key={i} />
              ))}
            </>
          ) : overview ? (
            <>
              <HeroKpi
                label="Conversas ativas"
                value={overview.activeConversations}
                accent="var(--bq-info)"
                sparkline={sparklines?.active}
                footer={
                  <span>
                    {overview.activeBreakdown.pending} fila ·{" "}
                    {overview.activeBreakdown.open} aberta ·{" "}
                    {overview.activeBreakdown.waiting} aguardando
                    {overview.stuckConversations > 0 ? (
                      <>
                        {" · "}
                        <a
                          href="/inbox?stuck=true"
                          className="font-medium text-[var(--bq-warn)] hover:underline "
                        >
                          {overview.stuckConversations} presa
                          {overview.stuckConversations === 1 ? "" : "s"}
                        </a>
                      </>
                    ) : null}
                  </span>
                }
              />
              <HeroKpi
                label="Tempo 1ª resposta"
                value={overview.avgFirstResponseMinutes ?? "—"}
                suffix={
                  overview.avgFirstResponseMinutes !== null ? "min" : undefined
                }
                trend={overview.avgFirstResponseTrend}
                trendDirection="lower-is-better"
                accent="var(--bq-warn)"
                sparkline={sparklines?.firstResponse}
                sparklineSuffix="min"
                footer={<span>Média do período · menor é melhor</span>}
              />
              <HeroKpi
                label="Dentro do SLA"
                value={overview.slaCompliancePercent ?? "—"}
                suffix={
                  overview.slaCompliancePercent !== null ? "%" : undefined
                }
                trend={overview.slaTrend}
                trendDirection="higher-is-better"
                accent="var(--bq-ok)"
                sparkline={sparklines?.sla}
                sparklineSuffix="%"
                footer={
                  overview.slaCompliancePercent === null ? (
                    <span className="text-[var(--bq-warn)]">
                      SLA do depto. não configurado
                    </span>
                  ) : (
                    <span>% conversas dentro do SLA</span>
                  )
                }
              />
              <HeroKpi
                label="Taxa de resolução"
                value={overview.resolutionRatePercent ?? "—"}
                suffix={
                  overview.resolutionRatePercent !== null ? "%" : undefined
                }
                trend={overview.resolutionTrend}
                trendDirection="higher-is-better"
                accent="var(--bq-agent)"
                sparkline={sparklines?.resolution}
                sparklineSuffix="%"
                footer={<span>Fechadas / abertas no período</span>}
              />
            </>
          ) : (
            <p className="text-xs text-[var(--bq-t3)]">
              Indicadores ainda não disponíveis.
            </p>
          )}

          {/* Quality KPIs remain alongside the four operational indicators. */}
          {overview && (
            <>
              <HeroKpi
                label="CSAT"
                value={overview.csatScore ?? "—"}
                suffix={overview.csatScore !== null ? "/5" : undefined}
                trendContent={
                  <CsatTrendBadge
                    value={overview.csatScore !== null ? overview.csatTrend : 0}
                  />
                }
                accent="var(--bq-warn)"
                footer={
                  overview.csatResponses === 0 ? (
                    <span className="text-[var(--bq-t3)]">
                      Aguardando primeiras avaliações
                    </span>
                  ) : (
                    <span>
                      {overview.csatResponses} resposta
                      {overview.csatResponses === 1 ? "" : "s"} no período
                    </span>
                  )
                }
              />
              <HeroKpi
                label="FCR (sem reabertura)"
                value={overview.fcrPercent ?? "—"}
                suffix={overview.fcrPercent !== null ? "%" : undefined}
                accent="var(--bq-info)"
                footer={<span>% das fechadas que não foram reabertas</span>}
              />
              <HeroKpi
                label="Taxa de reabertura"
                value={reopens?.reopenRate ?? "—"}
                suffix={
                  reopens?.reopenRate !== null &&
                  reopens?.reopenRate !== undefined
                    ? "%"
                    : undefined
                }
                accent="var(--bq-err)"
                footer={
                  reopens ? (
                    <span>
                      {reopens.uniqueConversationsReopened} conversa
                      {reopens.uniqueConversationsReopened === 1
                        ? ""
                        : "s"}{" "}
                      reaberta
                      {reopens.uniqueConversationsReopened === 1
                        ? ""
                        : "s"} · {reopens.totalReopens} total
                    </span>
                  ) : (
                    <span>Carregando…</span>
                  )
                }
              />
            </>
          )}
        </div>

        {/* ROW 1 — fluxo + heatmap */}
        <div className="mt-[14px] grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ChartCard
            title="Volume × resolução"
            legend={
              <div className="flex flex-wrap gap-3 text-[11.5px] text-[var(--bq-t2)]">
                <span>
                  <i className="mr-1 inline-block size-2.5 rounded-sm border border-[var(--bq-hair-strong)] bg-[var(--bq-raised-2)]" />
                  Criadas
                </span>
                <span>
                  <i className="mr-1 inline-block size-2.5 rounded-sm bg-[var(--bq-agent)]" />
                  Fechadas
                </span>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={volumeFlow || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--bq-hair)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(d) => (typeof d === "string" ? d : "")}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="created"
                  name="Criadas"
                  fill="var(--bq-raised-2)"
                  stroke="var(--bq-hair-strong)"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  isAnimationActive={false}
                  type="linear"
                  dataKey="closed"
                  name="Fechadas"
                  stroke="var(--bq-agent)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="min-w-0 rounded-[14px] border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-[14px]">
            <h2 className="mb-3 text-sm font-semibold">Incoming</h2>
            <div className="grid grid-cols-3 gap-2">
              {["Chegou", "Agendado", "Resolvido"].map((label) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-raised)] p-2"
                >
                  <b className="text-[22px] font-medium">—</b>
                  <p className="text-[11px] text-[var(--bq-t3)]">{label}</p>
                </div>
              ))}
            </div>
            <p className="my-3 text-xs text-[var(--bq-t3)]">
              Resumo ainda não disponível.
            </p>
            <h2 className="mb-2 text-sm font-semibold">Performance do bot</h2>
            {botPerf ? (
              <BotPerformancePanel data={botPerf} />
            ) : (
              <p className="text-xs text-[var(--bq-t3)]">
                Dados ainda não disponíveis.
              </p>
            )}
          </div>
        </div>

        <div
          className="mt-3 grid gap-3 lg:grid-cols-2"
          data-dashboard-row="channels"
        >
          <ChartCard
            title="Picos de horário"
            icon={CalendarClock}
            subtitle="Dia da semana × hora (UTC)"
            height=""
          >
            {peakHours ? (
              <Heatmap
                matrix={peakHours.matrix}
                max={peakHours.max}
                accent="var(--bq-agent)"
              />
            ) : (
              <p className="py-6 text-xs text-[var(--bq-t3)]">
                Dados ainda não disponíveis.
              </p>
            )}
          </ChartCard>
          <div className="min-w-0 rounded-[14px] border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-[14px]">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--bq-t2)]">
              <MessageCircle size={14} />
              Mensagens por canal
            </h3>
            <ChannelMessages data={channelPremises} />
            <h3 className="mb-3 mt-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--bq-t2)]">
              <TagIcon size={14} />
              Top motivos
            </h3>
            {topTags ? (
              <TopTagsPanel tags={topTags} />
            ) : (
              <p className="text-xs text-[var(--bq-t3)]">
                Dados ainda não disponíveis.
              </p>
            )}
          </div>
        </div>
        {/* ROW 5 — agentes (full width) */}
        <div className="mt-3">
          <ChartCard
            title="Performance dos agentes"
            subtitle="Carga atual + métricas no período"
            height=""
          >
            <AgentList agents={agents || []} />
          </ChartCard>
        </div>
        <h2 className="mt-5 text-sm font-medium text-[var(--bq-t2)]">
          Detalhes operacionais
        </h2>
        {/* ROW 2 — mensagens + canal */}
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ChartCard
            title="Mensagens"
            icon={MessageCircle}
            subtitle="Recebidas vs enviadas"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={messagesFlow || []}>
                <defs>
                  <linearGradient id="grad-in" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--bq-info)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--bq-info)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="grad-out" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--bq-agent)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--bq-agent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--bq-hair)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(d) => (typeof d === "string" ? d : "")}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  name="Recebidas"
                  stroke="var(--bq-info)"
                  fill="url(#grad-in)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  name="Enviadas"
                  stroke="var(--bq-agent)"
                  fill="url(#grad-out)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Por canal" subtitle="Volume de conversas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByChannel || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--bq-hair)"
                  vertical={false}
                />
                <XAxis dataKey="channelName" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--bq-raised)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(volumeByChannel || []).map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Premissas por canal — ADR-004 W4 */}
        <div className="mt-3">
          <h2 className="mb-3 text-sm font-semibold text-[var(--bq-t1)] ">
            Premissas · WhatsApp · Instagram · E-mail
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                {
                  key: "whatsapp",
                  title: "WhatsApp",
                  icon: Phone,
                  accent: "var(--bq-ok)",
                  data: channelPremises?.whatsapp,
                },
                {
                  key: "instagram",
                  title: "Instagram DM",
                  icon: Instagram,
                  accent: "var(--bq-agent)",
                  data: channelPremises?.instagram,
                },
                {
                  key: "email",
                  title: "E-mail",
                  icon: Mail,
                  accent: "var(--bq-info)",
                  data: channelPremises?.email,
                },
              ] as const
            ).map((card) => {
              const Icon = card.icon;
              const d = card.data;
              return (
                <div
                  key={card.key}
                  className="min-w-0 rounded-xl border border-[var(--bq-hair)] bg-[var(--bq-surface)] p-4   "
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${card.accent} 12%, transparent)`,
                        color: card.accent,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--bq-t1)] ">
                        {card.title}
                      </p>
                      <p className="truncate text-[11px] text-[var(--bq-t3)]">
                        {d?.connected
                          ? d.channelNames.join(", ") || "Conectado"
                          : d
                            ? "Não conectado"
                            : "Estado ainda não disponível"}
                      </p>
                    </div>
                  </div>
                  {d?.connected ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <dt className="text-[var(--bq-t3)]">
                          Conversas ({period}d)
                        </dt>
                        <dd className="text-base font-semibold tabular-nums text-[var(--bq-t1)] ">
                          {d.conversationsInPeriod}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--bq-t3)]">Abertas</dt>
                        <dd className="text-base font-semibold tabular-nums text-[var(--bq-t1)] ">
                          {d.open}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--bq-t3)]">Inbound</dt>
                        <dd className="tabular-nums text-[var(--bq-t2)] ">
                          {d.inboundMessages}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--bq-t3)]">Outbound</dt>
                        <dd className="tabular-nums text-[var(--bq-t2)] ">
                          {d.outboundMessages}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[var(--bq-t3)]">
                          1ª resposta (média)
                        </dt>
                        <dd className="tabular-nums text-[var(--bq-t2)] ">
                          {d.avgFirstResponseMinutes != null
                            ? `${d.avgFirstResponseMinutes} min`
                            : "—"}
                        </dd>
                      </div>
                      {card.key === "instagram" && d.inboundLast24h != null && (
                        <div className="col-span-2">
                          <dt className="text-[var(--bq-t3)]">
                            Inbound (últimas 24h)
                          </dt>
                          <dd className="tabular-nums text-[var(--bq-t2)] ">
                            {d.inboundLast24h}
                            <span className="ml-1 text-[10px] text-[var(--bq-t3)]">
                              janela Meta
                            </span>
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--bq-t3)]">
                      {d
                        ? "Conecte o canal em Configurações → Canais."
                        : "Não foi possível obter os dados deste canal."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ROW 4 — CSAT + reaberturas */}
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ChartCard
            title="CSAT detalhado"
            icon={Star}
            subtitle="Distribuição + comentários recentes"
            height=""
          >
            {csat ? (
              <CsatPanel data={csat} />
            ) : (
              <p className="py-6 text-xs text-[var(--bq-t3)]">
                Dados ainda não disponíveis.
              </p>
            )}
          </ChartCard>

          <ChartCard
            title="Reaberturas"
            icon={RotateCcw}
            subtitle="Conversas que voltaram após fechamento"
            height=""
          >
            {reopens ? (
              <ReopensPanel data={reopens} />
            ) : (
              <p className="py-6 text-xs text-[var(--bq-t3)]">
                Dados ainda não disponíveis.
              </p>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function BotPerformancePanel({
  data,
}: {
  data: NonNullable<
    Awaited<ReturnType<typeof dashboardService.getBotPerformance>>
  >;
}) {
  if (data.total === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--bq-t3)]">
        Sem conversas no período
      </p>
    );
  }

  const segments = [
    {
      label: "Bot resolveu",
      value: data.botResolved,
      rate: data.botResolutionRate,
      color: "var(--bq-ok)",
    },
    {
      label: "Encaminhada",
      value: data.humanHandled,
      rate: data.escalationRate,
      color: "var(--bq-agent)",
    },
    {
      label: "Em andamento",
      value: data.inFlight,
      rate: Math.round((data.inFlight / data.total) * 100),
      color: "var(--bq-warn)",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--bq-raised)] ">
          {segments.map((s) => (
            <div
              key={s.label}
              style={{
                backgroundColor: s.color,
                width: `${(s.value / data.total) * 100}%`,
              }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--bq-t3)]">
          {segments.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}{" "}
              <span
                title={`${s.value} conversas`}
                className="tabular-nums text-[var(--bq-t3)]"
              >
                {s.rate === null ? "—" : `${s.rate}%`}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--bq-surface)] px-3 py-2.5 ">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--bq-t3)]">
        {label}
      </p>
      <p
        className="mt-1 text-xl font-bold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-[var(--bq-t3)]">{hint}</p>}
    </div>
  );
}

function CsatPanel({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof dashboardService.getCsat>>>;
}) {
  if (data.totalResponses === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--bq-t3)]">
        Nenhuma avaliação respondida ainda
      </p>
    );
  }
  const max = Math.max(...Object.values(data.distribution));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Score médio"
          value={data.avgScore !== null ? `${data.avgScore}/5` : "—"}
          accent="var(--bq-warn)"
        />
        <Stat
          label="Respostas"
          value={String(data.totalResponses)}
          accent="var(--bq-info)"
          hint={`de ${data.totalRequested} pedidas`}
        />
        <Stat
          label="Taxa de resposta"
          value={data.responseRate !== null ? `${data.responseRate}%` : "—"}
          accent="var(--bq-ok)"
        />
      </div>

      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((s) => {
          const count = data.distribution[s] ?? 0;
          return (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right tabular-nums text-[var(--bq-t3)]">
                {s}
              </span>
              <Star className="h-3 w-3 fill-[var(--bq-warn)] text-[var(--bq-warn)]" />
              <div className="relative h-3 flex-1 overflow-hidden rounded bg-[var(--bq-raised)] ">
                <div
                  className="h-full rounded"
                  style={{
                    width: max > 0 ? `${(count / max) * 100}%` : "0%",
                    backgroundColor:
                      s >= 4
                        ? "var(--bq-ok)"
                        : s === 3
                          ? "var(--bq-warn)"
                          : "var(--bq-err)",
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-[var(--bq-t3)]">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {data.recentComments.length > 0 && (
        <div className="space-y-2 border-t border-[var(--bq-hair)] pt-3 ">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--bq-t3)]">
            Comentários recentes
          </p>
          {data.recentComments.map((c) => (
            <div
              key={c.id}
              className="rounded-lg bg-[var(--bq-surface)] px-3 py-2 "
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--bq-t2)] ">
                  {c.contactName}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--bq-t3)]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-2.5 w-2.5 ${i < c.score ? "fill-[var(--bq-warn)] text-[var(--bq-warn)]" : "text-[var(--bq-t3)] "}`}
                    />
                  ))}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-[var(--bq-t2)] ">
                {c.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReopensPanel({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof dashboardService.getReopens>>>;
}) {
  if (data.totalReopens === 0 && data.uniqueConversationsReopened === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--bq-t3)]">
        Nenhuma reabertura no período
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Total reaberturas"
          value={String(data.totalReopens)}
          accent="var(--bq-err)"
        />
        <Stat
          label="Conversas únicas"
          value={String(data.uniqueConversationsReopened)}
          accent="var(--bq-warn)"
        />
        <Stat
          label="Taxa"
          value={data.reopenRate !== null ? `${data.reopenRate}%` : "—"}
          accent="var(--bq-agent)"
        />
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.series}>
            <defs>
              <linearGradient id="grad-reopen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--bq-err)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--bq-err)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(d) => (typeof d === "string" ? d : "")}
              formatter={(v) => [v, "reaberturas"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--bq-err)"
              fill="url(#grad-reopen)"
              strokeWidth={1.75}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.worstOffenders.length > 0 && (
        <div className="space-y-1.5 border-t border-[var(--bq-hair)] pt-3 ">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--bq-t3)]">
            Mais reabertas
          </p>
          {data.worstOffenders.map((o) => (
            <div
              key={o.conversationId}
              className="flex items-center justify-between rounded bg-[var(--bq-surface)] px-3 py-1.5 "
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--bq-t2)] ">
                  {o.contactName}
                </p>
                <p className="text-[10px] text-[var(--bq-t3)]">
                  {o.agentName ?? "sem responsável"}
                </p>
              </div>
              <span className="rounded bg-[var(--bq-err-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bq-err)]  ">
                {o.reopenedCount}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopTagsPanel({
  tags,
}: {
  tags: Array<{ id: string; name: string; color: string; count: number }>;
}) {
  if (tags.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--bq-t3)]">
        Nenhuma tag aplicada no período
      </p>
    );
  }
  const max = Math.max(...tags.map((t) => t.count));

  return (
    <div className="space-y-2.5">
      {tags.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <div className="flex w-[92px] shrink-0 items-center gap-2 min-w-0">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="truncate text-xs font-medium text-[var(--bq-t2)] ">
              {t.name}
            </span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="relative h-2 flex-1 overflow-hidden rounded bg-[var(--bq-raised)] ">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(t.count / max) * 100}%`,
                  backgroundColor: t.color,
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="w-10 text-right text-xs font-semibold tabular-nums text-[var(--bq-t2)] ">
              {t.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelMessages({
  data,
}: {
  data:
    | Awaited<ReturnType<typeof dashboardService.getChannelPremises>>
    | undefined;
}) {
  const channels = [
    { name: "WhatsApp", value: data?.whatsapp, color: "var(--bq-wa)" },
    { name: "E-mail", value: data?.email, color: "var(--bq-mail)" },
    { name: "Instagram", value: data?.instagram, color: "var(--bq-ig)" },
  ].filter((channel) => channel.value?.connected);
  const total = channels.reduce(
    (sum, channel) =>
      sum + channel.value!.inboundMessages + channel.value!.outboundMessages,
    0,
  );
  if (!total)
    return (
      <p className="py-3 text-xs text-[var(--bq-t3)]">
        {data ? "Sem mensagens no período." : "Dados ainda não disponíveis."}
      </p>
    );
  return (
    <div className="space-y-[7px]">
      {channels.map((channel) => {
        const count =
          channel.value!.inboundMessages + channel.value!.outboundMessages;
        const percent = Math.round((count / total) * 100);
        return (
          <div
            key={channel.name}
            className="grid grid-cols-[92px_minmax(0,1fr)_44px] items-center gap-2.5 text-xs text-[var(--bq-t2)]"
            title={`${count} mensagens recebidas e enviadas`}
          >
            <span>{channel.name}</span>
            <span className="h-2 overflow-hidden rounded bg-[var(--bq-raised-2)]">
              <span
                className="block h-full rounded"
                style={{ width: `${percent}%`, background: channel.color }}
              />
            </span>
            <span className="text-right font-mono text-[11px]">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

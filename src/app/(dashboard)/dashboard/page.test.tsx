import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";

vi.mock("@/hooks/use-org-query-key", () => ({ useOrgId: () => "test" }));
vi.mock("@/features/dashboard/services/dashboard.service", () => {
  const channel = {
    connected: true,
    channelIds: ["test"],
    channelNames: ["Teste"],
    conversationsInPeriod: 12,
    open: 2,
    unreadApprox: 0,
    inboundMessages: 20,
    outboundMessages: 10,
    avgFirstResponseMinutes: 3,
  };
  return {
    dashboardService: {
      getOverview: vi.fn(async () => null),
      getKpiSparklines: vi.fn(async () => null),
      getVolumeFlow: vi.fn(async () => []),
      getMessagesFlow: vi.fn(async () => []),
      getPeakHours: vi.fn(async () => null),
      getVolumeByChannel: vi.fn(async () => []),
      getChannelPremises: vi.fn(async () => ({
        whatsapp: { ...channel, kind: "WHATSAPP" },
        instagram: { ...channel, kind: "INSTAGRAM" },
        email: { ...channel, kind: "GMAIL" },
      })),
      getBotPerformance: vi.fn(async () => null),
      getTopTags: vi.fn(async () => []),
      getAgentPerformance: vi.fn(async () => []),
      getCsat: vi.fn(async () => null),
      getReopens: vi.fn(async () => null),
    },
  };
});

it("mantém as legendas dos três canais na janela consultada ao trocar o período", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
  expect(await screen.findAllByText("Conversas (30d)")).toHaveLength(3);

  for (const period of [7, 90, 30]) {
    await userEvent.click(
      screen.getByRole("button", { name: `${period} dias`, exact: true }),
    );
    expect(await screen.findAllByText(`Conversas (${period}d)`)).toHaveLength(
      3,
    );
    for (const other of [7, 30, 90].filter((value) => value !== period)) {
      expect(
        screen.queryByText(`Conversas (${other}d)`),
      ).not.toBeInTheDocument();
    }
    await waitFor(() => {
      const [from, to] = vi
        .mocked(dashboardService.getChannelPremises)
        .mock.calls.at(-1)!;
      const expected = new Date(to!);
      expected.setDate(expected.getDate() - period);
      expect(from).toBe(expected.toISOString());
    });
  }
});

it("preserva detalhes, link de presas e exportação após reorganizar os painéis", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(dashboardService.getOverview).mockResolvedValue({
    activeConversations: 5,
    activeBreakdown: { pending: 1, open: 2, waiting: 1, bot: 1 },
    stuckConversations: 2,
    avgFirstResponseMinutes: 3,
    avgFirstResponseTrend: -2,
    slaCompliancePercent: 90,
    slaTrend: 1,
    resolutionRatePercent: 80,
    resolutionTrend: 2,
    fcrPercent: 80,
    csatScore: 4,
    csatResponses: 2,
    csatTrend: 0.1,
    totalConversations: 10,
    conversationsTrend: 1,
    openConversations: 2,
    pendingConversations: 1,
    totalMessages: 30,
    messagesTrend: 1,
    avgResolutionMinutes: 10,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
  const summary = await screen.findByText("Conversas ativas", {
    selector: "summary",
  });
  await userEvent.click(summary);
  expect(screen.getByRole("link", { name: "2 presas" })).toHaveAttribute(
    "href",
    "/inbox?stuck=true",
  );
  const headings = screen
    .getAllByRole("heading")
    .map((node) => node.textContent);
  const order = [
    "Volume × resolução",
    "Picos de horário",
    "Mensagens por canal",
    "Top motivos",
    "Performance dos agentes",
    "Detalhes operacionais",
    "Premissas · WhatsApp · Instagram · E-mail",
    "CSAT detalhado",
    "Reaberturas",
  ];
  for (let index = 1; index < order.length; index++)
    expect(headings.indexOf(order[index])).toBeGreaterThan(
      headings.indexOf(order[index - 1]),
    );
  expect(
    await screen.findAllByTitle("30 mensagens recebidas e enviadas"),
  ).toHaveLength(3);
  const createUrl = vi.fn(() => "blob:dashboard");
  const revokeUrl = vi.fn();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: createUrl,
      revokeObjectURL: revokeUrl,
    }),
  );
  const download = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  await userEvent.click(screen.getByRole("button", { name: "Exportar" }));
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "Baixar indicadores (CSV)" }),
  );
  expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
  expect(download).toHaveBeenCalledOnce();
  expect(download.mock.instances[0]).toHaveAttribute(
    "download",
    "bullq-dashboard-30d.csv",
  );
  expect(revokeUrl).toHaveBeenCalledWith("blob:dashboard");
  download.mockRestore();
  vi.unstubAllGlobals();
});

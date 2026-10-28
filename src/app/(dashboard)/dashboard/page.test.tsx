import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";

vi.mock("@/hooks/use-org-query-key", () => ({ useOrgId: () => "test" }));
vi.mock("@/features/dashboard/services/dashboard.service", () => {
  const channel = {
    connected: true, channelIds: ["test"], channelNames: ["Teste"],
    conversationsInPeriod: 12, open: 2, unreadApprox: 0,
    inboundMessages: 20, outboundMessages: 10, avgFirstResponseMinutes: 3,
  };
  return { dashboardService: {
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
  } };
});

it("mantém as legendas dos três canais na janela consultada ao trocar o período", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><DashboardPage /></QueryClientProvider>);
  expect(await screen.findAllByText("Conversas (30d)")).toHaveLength(3);

  for (const period of [7, 90, 30]) {
    await userEvent.click(screen.getByRole("button", { name: `${period} dias`, exact: true }));
    expect(await screen.findAllByText(`Conversas (${period}d)`)).toHaveLength(3);
    for (const other of [7, 30, 90].filter(value => value !== period)) {
      expect(screen.queryByText(`Conversas (${other}d)`)).not.toBeInTheDocument();
    }
    await waitFor(() => {
      const [from, to] = vi.mocked(dashboardService.getChannelPremises).mock.calls.at(-1)!;
      const expected = new Date(to!);
      expected.setDate(expected.getDate() - period);
      expect(from).toBe(expected.toISOString());
    });
  }
});

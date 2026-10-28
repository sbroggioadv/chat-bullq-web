import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarWorkspace } from "@/features/calendar/components/calendar-workspace";
import { calendarService } from "@/features/calendar/services/calendar.service";

vi.mock("@/features/inbox/services/inbox.service", () => ({
  inboxService: {
    getConversations: vi.fn(async () => ({
      conversations: [],
      pagination: {},
    })),
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/calendar/services/calendar.service", () => ({
  calendarService: {
    status: vi.fn(),
    calendars: vi.fn(),
    events: vi.fn(),
    create: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(calendarService.status).mockResolvedValue({
    connected: true,
    calendarAuthorized: true,
    channelId: "google",
    email: "teste@example.com",
    scopes: [],
    needsReauthForCalendar: false,
  });
  vi.mocked(calendarService.calendars).mockResolvedValue({
    channelId: "google",
    calendars: [],
  });
  vi.mocked(calendarService.events).mockResolvedValue({
    channelId: "google",
    events: [],
  });
});

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CalendarWorkspace />
    </QueryClientProvider>,
  );
}

it("alterna semana/mês consultando o período correto e mantém criação acessível", async () => {
  mount();
  const month = await screen.findByRole("button", { name: "Mês", exact: true });
  await userEvent.click(month);
  expect(month).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(calendarService.events).toHaveBeenCalledTimes(2));
  const request = vi.mocked(calendarService.events).mock.calls.at(-1)?.[0];
  expect(
    (new Date(request!.to!).getTime() - new Date(request!.from!).getTime()) /
      86400000,
  ).toBeGreaterThan(40);
  await userEvent.click(
    screen.getByRole("button", { name: "Evento", exact: true }),
  );
  expect(
    screen.getByRole("textbox", { name: "Título do evento" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Criar no Google" })).toBeVisible();
});

it("distingue falha de conexão de uma conta desconectada", async () => {
  vi.mocked(calendarService.status).mockRejectedValue(new Error("offline"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível verificar a Agenda",
  );
  expect(
    screen.queryByText("Conecte o Google para usar a Agenda."),
  ).not.toBeInTheDocument();
});

it("preserva as 24 horas e a edição dos eventos fora de 08h–20h", async () => {
  const day = new Date();
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const events = [6, 22].map((hour) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    return {
      id: `event-${hour}`,
      summary: `Evento às ${hour}h`,
      description: "",
      htmlLink: null,
      meetLink: null,
      allDay: false,
      attendees: [],
      start: start.toISOString(),
      end: new Date(start.getTime() + 3600000).toISOString(),
    };
  });
  vi.mocked(calendarService.events).mockResolvedValue({
    channelId: "google",
    events,
  });
  mount();
  const grid = await screen.findByRole("region", { name: "Grade da agenda" });
  expect(
    within(grid).getAllByRole("button", { name: /Criar evento em/ }),
  ).toHaveLength(7 * 24);
  for (const event of events) {
    await userEvent.click(await within(grid).findByTitle(event.summary));
    expect(
      screen.getByRole("textbox", { name: "Título do evento" }),
    ).toHaveValue(event.summary);
    await userEvent.click(
      screen.getByRole("button", { name: "Fechar edição de evento" }),
    );
  }
  await userEvent.click(
    screen.getByRole("button", { name: "Mês", exact: true }),
  );
  for (const event of events)
    expect(within(grid).getByTitle(event.summary)).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Semana", exact: true }),
  );
  expect(
    within(grid).getAllByRole("button", { name: /Criar evento em/ }),
  ).toHaveLength(7 * 24);
});

it("usa régua única e mantém atualizar, navegação e criar pelo horário", async () => {
  mount();
  const grid = await screen.findByRole("region", { name: "Grade da agenda" });
  await waitFor(() => expect(calendarService.events).toHaveBeenCalled());
  expect(within(grid).getAllByText("08:00")).toHaveLength(1);
  expect(within(grid).getAllByText("22:00")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Próximos" })).toBeVisible();
  const initialFrom = vi.mocked(calendarService.events).mock.calls.at(-1)![0]
    .from!;
  await userEvent.click(
    screen.getByRole("button", { name: "Próximo período" }),
  );
  await waitFor(() => expect(calendarService.events).toHaveBeenCalledTimes(2));
  expect(
    new Date(
      vi.mocked(calendarService.events).mock.calls.at(-1)![0].from!,
    ).getTime() - new Date(initialFrom).getTime(),
  ).toBe(7 * 86400000);
  await userEvent.click(
    screen.getByRole("button", { name: "Hoje", exact: true }),
  );
  await waitFor(() => expect(calendarService.events).toHaveBeenCalledTimes(3));
  expect(vi.mocked(calendarService.events).mock.calls.at(-1)![0].from).toBe(
    initialFrom,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Atualizar agenda" }),
  );
  await waitFor(() => expect(calendarService.events).toHaveBeenCalledTimes(4));
  await userEvent.click(
    within(grid).getAllByRole("button", { name: /às 6 horas/ })[0],
  );
  expect(screen.getByRole("button", { name: "Criar no Google" })).toBeVisible();
  expect(
    document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!
      .value,
  ).toContain("T06:00");
});

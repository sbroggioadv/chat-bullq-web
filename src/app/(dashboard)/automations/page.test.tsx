import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutomationsPage from "@/app/(dashboard)/automations/page";
import { automationsService } from "@/features/automations/services/automations.service";

const { fixture } = vi.hoisted(() => ({
  fixture: {
    id: "rule",
    name: "Encaminhar contrato",
    description: null,
    trigger: "MESSAGE_RECEIVED",
    enabled: true,
    conditions: {
      match: "AND",
      groups: [
        {
          match: "OR",
          rules: [
            { field: "message.body", op: "contains", value: "contrato" },
            { field: "message.body", op: "contains", value: "minuta" },
          ],
        },
        {
          match: "AND",
          rules: [
            { field: "conversation.status", op: "equals", value: "OPEN" },
          ],
        },
      ],
    },
    actions: [
      { type: "add_tag", params: { tagId: "tag" } },
      {
        type: "assign_user",
        params: { userId: "user" },
        continueOnError: true,
      },
    ],
    runCount: 10,
    successCount: 8,
    failureCount: 2,
    lastRunAt: "2026-10-27T12:00:00.000Z",
    autoPausedAt: null,
  },
}));
vi.mock("@/features/automations/services/automations.service", () => ({
  automationsService: {
    list: vi.fn(async () => [fixture]),
    meta: vi.fn(async () => ({})),
    remove: vi.fn(async () => ({})),
    toggle: vi.fn(async () => ({})),
  },
}));
vi.mock("@/features/automations/components/automation-builder", () => ({
  AutomationBuilder: ({ initial }: { initial: unknown }) => (
    <pre data-testid="builder-input">{JSON.stringify(initial)}</pre>
  ),
}));
vi.mock("@/features/automations/components/automation-runs-panel", () => ({
  AutomationRunsPanel: () => null,
}));
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AutomationsPage />
    </QueryClientProvider>,
  );
}

it("mantém os operadores de cada grupo e a ordem das ações ao abrir a edição", async () => {
  mount();
  await screen.findByText("Encaminhar contrato");
  expect(screen.getByText(/contrato OU/)).toBeVisible();
  expect(screen.getByText(/todos os grupos/i)).toBeVisible();
  expect(screen.getByText(/última:/)).toHaveAttribute(
    "datetime",
    fixture.lastRunAt,
  );
  expect(screen.queryByText(/em 7 dias/)).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Editar", exact: true }),
  );
  expect(JSON.parse(screen.getByTestId("builder-input").textContent!)).toEqual(
    fixture,
  );
});
it("o × preserva a confirmação e só exclui após aceitar", async () => {
  vi.mocked(automationsService.remove).mockClear();
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
  mount();
  const remove = await screen.findByRole("button", {
    name: "Remover Encaminhar contrato",
  });
  await userEvent.click(remove);
  expect(automationsService.remove).not.toHaveBeenCalled();
  confirmation.mockReturnValue(true);
  await userEvent.click(remove);
  await waitFor(() =>
    expect(automationsService.remove).toHaveBeenCalledWith(
      "rule",
      expect.anything(),
    ),
  );
  confirmation.mockRestore();
});

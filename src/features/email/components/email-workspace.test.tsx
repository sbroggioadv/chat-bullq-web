import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailWorkspace } from "@/features/email/components/email-workspace";

const { push, params } = vi.hoisted(() => ({
  push: vi.fn(),
  params: new URLSearchParams("channel=account-2"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}));
vi.mock("@/features/email/services/email.service", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/email/services/email.service")
    >();
  return {
    ...original,
    emailService: {
      status: vi.fn(async () => ({
        connected: true,
        channels: [1, 2].map((i) => ({
          id: `account-${i}`,
          name: `Conta ${i}`,
          email: `conta${i}@example.invalid`,
        })),
      })),
      folders: vi.fn(async () => ({
        folders: [
          { id: "INBOX", name: "Caixa de entrada", kind: "system" },
          { id: "SENT", name: "Enviados", kind: "system" },
          { id: "label-1", name: "Revisão", kind: "user" },
        ],
      })),
      threads: vi.fn(async () => ({ threads: [], nextPageToken: null })),
    },
  };
});

it("navega pastas e contas na coluna interna e no painel móvel preservando a conta da URL", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <EmailWorkspace />
    </QueryClientProvider>,
  );
  const nav = await screen.findByRole("navigation", {
    name: "Pastas e contas",
  });
  await userEvent.click(
    await within(nav).findByRole("button", { name: "Enviados" }),
  );
  expect(
    within(nav).getByText(/Marcadores/, { selector: "summary" }),
  ).toHaveTextContent("Marcadores 1");
  expect(push).toHaveBeenLastCalledWith("/email?folder=sent&channel=account-2");
  await userEvent.click(within(nav).getByRole("button", { name: "Revisão" }));
  expect(push).toHaveBeenLastCalledWith(
    "/email?folder=label%3Alabel-1&channel=account-2",
  );
  await userEvent.selectOptions(
    within(nav).getByRole("combobox", { name: "Conta de e-mail" }),
    "account-1",
  );
  expect(push).toHaveBeenLastCalledWith(
    "/email?folder=inbox&channel=account-1",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Pastas e contas" }),
  );
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(/Marcadores/, { selector: "summary" }),
  ).toHaveTextContent("Marcadores 1");
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Enviados" }),
  );
  expect(push).toHaveBeenLastCalledWith("/email?folder=sent&channel=account-2");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "Escrever" })).toBeVisible();
});

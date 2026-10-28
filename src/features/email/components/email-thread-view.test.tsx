import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailThreadView } from "@/features/email/components/email-thread-view";
import { emailService } from "@/features/email/services/email.service";
import { toast } from "sonner";

vi.mock("@/features/inbox/services/inbox.service", () => ({
  inboxService: { lookupByExternal: async () => ({ id: "conversation" }) },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/email/services/email.service", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/email/services/email.service")
    >();
  return {
    ...original,
    emailService: {
      folders: vi.fn(async () => ({
        folders: [{ id: "label", name: "Revisão", kind: "user" }],
      })),
      archive: vi.fn(async () => ({})),
      modify: vi.fn(async () => ({})),
    },
  };
});

it("mantém as ações do leitor na barra separada do assunto", async () => {
  const back = vi.fn();
  const sent = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <EmailThreadView
        detail={{
          id: "thread",
          externalConversationId: "thread",
          subject: "Documentos para revisão",
          canSend: true,
          myEmail: "equipe@example.invalid",
          labelIds: [],
          messages: [
            {
              id: "message",
              from: { name: "Contato", email: "contato@example.invalid" },
              to: "equipe@example.invalid",
              cc: "copia@example.invalid",
              subject: "Documentos para revisão",
              date: null,
              body: "Segue o documento.",
              snippet: "Segue o documento.",
              unread: false,
              outbound: false,
            },
          ],
        }}
        channelId="account"
        threadSelected
        loading={false}
        error={false}
        onRetry={vi.fn()}
        onBack={back}
        onSent={sent}
      />
    </QueryClientProvider>,
  );
  expect(
    await screen.findByRole("link", { name: "Abrir a conversa" }),
  ).toHaveAttribute("href", "/inbox?conversationId=conversation");
  await userEvent.click(
    screen.getByRole("button", { name: "Responder", exact: true }),
  );
  expect(
    screen.getByText("Responder para contato@example.invalid"),
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Cancelar", exact: true }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Responder a todos", exact: true }),
  );
  expect(screen.getByText(/Cc copia@example.invalid/)).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Cancelar", exact: true }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Encaminhar", exact: true }),
  );
  expect(screen.getByPlaceholderText(/Para: email/)).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Cancelar", exact: true }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Marcador", exact: true }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Revisão", exact: true }),
  );
  await waitFor(() =>
    expect(emailService.modify).toHaveBeenCalledWith({
      channelId: "account",
      threadId: "thread",
      addLabelIds: ["label"],
      removeLabelIds: undefined,
    }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Arquivar", exact: true }),
  );
  await waitFor(() =>
    expect(emailService.archive).toHaveBeenCalledWith({
      channelId: "account",
      threadId: "thread",
    }),
  );
  expect(back).toHaveBeenCalledOnce();
  const options = vi
    .mocked(toast.success)
    .mock.calls.find((call) => call[0] === "Arquivado")?.[1];
  expect(options?.action).toMatchObject({ label: "Desfazer" });
});

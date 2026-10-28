import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailThreadList } from "@/features/email/components/email-thread-list";

it("busca nos dados carregados sem perder paginação nem seleção", async () => {
  const onSelect = vi.fn();
  const onLoadMore = vi.fn();
  render(
    <EmailThreadList
      folderName="Entrada"
      threads={[
        {
          id: "a",
          externalConversationId: "a",
          subject: "Contrato",
          from: { email: "ana@example.com", name: "Ana" },
          snippet: "Documento",
          date: null,
          unread: true,
        },
        {
          id: "b",
          externalConversationId: "b",
          subject: "Reunião",
          from: { email: "bia@example.com" },
          snippet: "Agenda",
          date: null,
          unread: false,
        },
      ]}
      activeThreadId={null}
      onSelect={onSelect}
      loading={false}
      error={false}
      onRetry={vi.fn()}
      hasMore
      loadingMore={false}
      onLoadMore={onLoadMore}
    />,
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "Buscar nos e-mails carregados" }),
    "contrato",
  );
  expect(screen.queryByText("Reunião")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /Ana/ }));
  expect(onSelect).toHaveBeenCalledWith("a");
  await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  expect(onLoadMore).toHaveBeenCalledOnce();
});

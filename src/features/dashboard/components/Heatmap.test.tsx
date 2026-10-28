import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Heatmap } from "@/features/dashboard/components/Heatmap";

it("preserva a consulta dos horários fora da faixa inicial do mockup", async () => {
  render(
    <Heatmap
      matrix={Array.from({ length: 7 }, () => Array(24).fill(2))}
      max={2}
    />,
  );
  expect(screen.getByTitle("Seg 8h: 2 conversas")).toBeVisible();
  expect(screen.queryByTitle("Seg 22h: 2 conversas")).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Ver as 24 horas" }),
  );
  expect(screen.getByTitle("Seg 22h: 2 conversas")).toBeVisible();
  expect(screen.getByTitle("Dom 0h: 2 conversas")).toBeVisible();
});

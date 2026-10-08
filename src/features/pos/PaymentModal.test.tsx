import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const registerPayment = vi.fn();
vi.mock("../../lib/rpc", () => ({ rpc: { registerPayment: (...a: unknown[]) => registerPayment(...a) } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { PaymentModal } from "./PaymentModal";

const order = { id: "o1", folio: "F-1", customerName: "Ana", totalPrice: "1000.00", balanceDue: "600.00" };

function fill(amount: string) {
  fireEvent.change(screen.getByTestId("input-payment-amount"), { target: { value: amount } });
  fireEvent.change(screen.getByTestId("select-payment-method"), { target: { value: "CASH" } });
}

beforeEach(() => registerPayment.mockReset());

it("doble clic produce una sola llamada", async () => {
  let resolve!: (v: unknown) => void;
  registerPayment.mockReturnValue(new Promise((r) => (resolve = r)));
  render(<PaymentModal order={order} onClose={() => {}} onPaid={() => {}} />);
  fill("100");
  const form = screen.getByTestId("input-payment-amount").closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(registerPayment).toHaveBeenCalledTimes(1);
  resolve({ payment_id: "p", balance_due: "500.00", duplicate: false });
  await waitFor(() => expect(registerPayment).toHaveBeenCalledTimes(1));
});

it("reintento tras falla de red reutiliza la misma clave de idempotencia", async () => {
  registerPayment.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  registerPayment.mockResolvedValueOnce({ payment_id: "p", balance_due: "500.00", duplicate: true });
  const onPaid = vi.fn();
  render(<PaymentModal order={order} onClose={() => {}} onPaid={onPaid} />);
  fill("100");
  fireEvent.click(screen.getByTestId("button-submit-payment"));
  await screen.findByText("Reintentar (seguro)");
  fireEvent.click(screen.getByTestId("button-submit-payment"));
  await waitFor(() => expect(onPaid).toHaveBeenCalledWith("500.00"));
  expect(registerPayment).toHaveBeenCalledTimes(2);
  expect(registerPayment.mock.calls[0]![3]).toBe(registerPayment.mock.calls[1]![3]);
  expect(registerPayment.mock.calls[0]![1]).toBe("100.00");
});

it("rechaza un abono mayor al saldo sin llamar a la base", () => {
  render(<PaymentModal order={order} onClose={() => {}} onPaid={() => {}} />);
  fill("600.01");
  fireEvent.click(screen.getByTestId("button-submit-payment"));
  expect(registerPayment).not.toHaveBeenCalled();
  expect(screen.getByText(/excede el saldo/)).toBeInTheDocument();
});

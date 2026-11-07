import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EarthBaseLayer } from "@/components/map/EarthBaseLayer";

vi.mock("react-leaflet", () => ({
  WMSTileLayer: ({
    eventHandlers,
  }: {
    eventHandlers: { tileerror: () => void };
  }) => (
    <button onClick={eventHandlers.tileerror}>Primary satellite failure</button>
  ),
  TileLayer: ({
    eventHandlers,
  }: {
    eventHandlers: { tileerror: () => void };
  }) => (
    <button onClick={eventHandlers.tileerror}>
      Fallback satellite failure
    </button>
  ),
}));
it("falls back to a second satellite provider, then keeps the map usable without imagery", async () => {
  const report = vi.fn();
  render(<EarthBaseLayer year={2026} onSourceChange={report} />);
  fireEvent.click(screen.getByText("Primary satellite failure"));
  fireEvent.click(screen.getByText("Primary satellite failure"));
  await screen.findByText("Fallback satellite failure");
  expect(report).toHaveBeenCalledWith(
    expect.stringContaining("not linked to selected year"),
  );
  fireEvent.click(screen.getByText("Fallback satellite failure"));
  fireEvent.click(screen.getByText("Fallback satellite failure"));
  await waitFor(() =>
    expect(report).toHaveBeenCalledWith(
      "Satellite imagery unavailable; monitoring overlays remain usable.",
    ),
  );
  expect(screen.queryByRole("button")).toBeNull();
});

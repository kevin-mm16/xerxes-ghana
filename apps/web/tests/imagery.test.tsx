import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EarthBaseLayer } from "@/components/map/EarthBaseLayer";

type Handlers = {
  tileload: () => void;
  tileerror: () => void;
  load: () => void;
};
vi.mock("react-leaflet", () => ({
  TileLayer: ({ eventHandlers: h }: { eventHandlers: Handlers }) => (
    <div>
      <button onClick={h.tileload}>Detailed tile loaded</button>
      <button onClick={h.tileerror}>Detailed tile failed</button>
      <button onClick={h.load}>Detailed batch finished</button>
    </div>
  ),
  WMSTileLayer: ({ eventHandlers: h }: { eventHandlers: Handlers }) => (
    <div>
      <button onClick={h.tileerror}>Composite tile failed</button>
      <button onClick={h.load}>Composite batch finished</button>
    </div>
  ),
}));
afterEach(() => vi.useRealTimers());

it("starts with detailed satellite tiles and keeps them when only part of a batch fails", () => {
  const report = vi.fn();
  render(<EarthBaseLayer onStateChange={report} />);
  expect(screen.queryByText("Composite tile failed")).toBeNull();
  fireEvent.click(screen.getByText("Detailed tile failed"));
  fireEvent.click(screen.getByText("Detailed tile failed"));
  fireEvent.click(screen.getByText("Detailed tile loaded"));
  fireEvent.click(screen.getByText("Detailed batch finished"));
  expect(screen.getByText("Detailed tile loaded")).toBeTruthy();
  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "esri", state: "ready" }),
  );
});
it("falls back only for a failed batch, and reports when neither satellite service works", () => {
  const report = vi.fn();
  render(<EarthBaseLayer onStateChange={report} />);
  fireEvent.click(screen.getByText("Detailed tile failed"));
  fireEvent.click(screen.getByText("Detailed batch finished"));
  expect(screen.getByText("Composite tile failed")).toBeTruthy();
  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: "deafrica",
      label: expect.stringContaining("lower detail"),
    }),
  );
  fireEvent.click(screen.getByText("Composite tile failed"));
  fireEvent.click(screen.getByText("Composite batch finished"));
  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({ state: "unavailable" }),
  );
  expect(screen.queryByRole("button")).toBeNull();
});
it("recovers from a satellite source that never produces a usable image", () => {
  vi.useFakeTimers();
  render(<EarthBaseLayer onStateChange={vi.fn()} />);
  act(() => vi.advanceTimersByTime(15001));
  expect(screen.getByText("Composite tile failed")).toBeTruthy();
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EarthBaseLayer } from "@/components/map/EarthBaseLayer";

type Handlers = {
  tileload: (event?: { tile?: HTMLElement }) => void;
  tileerror: (event?: { tile?: HTMLElement }) => void;
  load: () => void;
};
vi.mock("react-leaflet", () => ({
  TileLayer: ({ eventHandlers: h }: { eventHandlers: Handlers }) => (
    <div>
      <img data-testid="detailed-tile" alt="" />
      <button
        onClick={() =>
          h.tileload({
            tile: document.querySelector(
              '[data-testid="detailed-tile"]',
            ) as HTMLImageElement,
          })
        }
      >
        Detailed tile loaded
      </button>
      <button
        onClick={() =>
          h.tileerror({
            tile: document.querySelector(
              '[data-testid="detailed-tile"]',
            ) as HTMLImageElement,
          })
        }
      >
        Detailed tile failed
      </button>
      <button onClick={h.load}>Detailed batch finished</button>
    </div>
  ),
  WMSTileLayer: ({ eventHandlers: h }: { eventHandlers: Handlers }) => (
    <div>
      <button onClick={() => h.tileerror()}>Composite tile failed</button>
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

it("reports readiness once for a tile batch instead of rerendering on every tile", () => {
  const report = vi.fn();
  render(<EarthBaseLayer onStateChange={report} />);
  for (let tile = 0; tile < 25; tile++)
    fireEvent.click(screen.getByText("Detailed tile loaded"));
  expect(
    report.mock.calls.filter(([state]) => state.state === "ready"),
  ).toHaveLength(1);
});

it("retries transient holes twice without discarding usable imagery, and clears the degraded state on recovery", () => {
  vi.useFakeTimers();
  const report = vi.fn();
  render(<EarthBaseLayer onStateChange={report} />);
  const tile = screen.getByTestId("detailed-tile") as HTMLImageElement;
  const source = vi.spyOn(tile, "src", "set");
  fireEvent.click(screen.getByText("Detailed tile loaded"));
  for (let attempt = 0; attempt < 3; attempt++) {
    fireEvent.click(screen.getByText("Detailed tile failed"));
    fireEvent.click(screen.getByText("Detailed batch finished"));
    act(() => vi.advanceTimersByTime(5000));
  }
  expect(source).toHaveBeenCalledTimes(2);
  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "esri", degraded: true }),
  );
  fireEvent.click(screen.getByText("Detailed tile loaded"));
  fireEvent.click(screen.getByText("Detailed batch finished"));
  expect(report.mock.lastCall![0]).toEqual(
    expect.objectContaining({ provider: "esri", degraded: false }),
  );
  expect(screen.queryByText("Composite tile failed")).toBeNull();
});

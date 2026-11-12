import { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MapExplorer } from "@/components/map/MapExplorer";
import type { IntelligenceMapProps } from "@/components/map/map-props";
import type { MapViewport } from "@/utils/map-view";

const map = vi.hoisted(() => ({
  props: undefined as IntelligenceMapProps | undefined,
}));
vi.mock("@/components/map/BrowserMaps", () => ({
  HotspotMap: (props: IntelligenceMapProps) => {
    map.props = props;
    useEffect(() => {
      props.onViewportChange?.({ bbox: [-3.5, 4.3, 1.5, 11.3], zoom: 7 });
    }, []);
    return (
      <div data-testid="rendered-public-features">
        {props.features.map((feature) => feature.properties.title).join(",")}
      </div>
    );
  },
}));

const collection = (title?: string) => ({
  type: "FeatureCollection",
  truncated: false,
  features: title
    ? [
        {
          type: "Feature",
          id: title,
          geometry: { type: "Point", coordinates: [-1.6, 6.7] },
          properties: {
            featureType: "citizen_observation",
            layer: "observations",
            title,
            status: "approved",
            source: "Published API",
          },
        },
      ]
    : [],
});
const response = (title?: string) => ({
  ok: true,
  json: async () => collection(title),
});
const view = (bbox: MapViewport["bbox"], zoom = 10) => {
  act(() => map.props?.onViewportChange?.({ bbox, zoom }));
};
async function advance(milliseconds = 250) {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds);
  });
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("does not download districts nationally, then fetches the eligible viewport at zoom9", async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal("fetch", fetch);
  render(<MapExplorer />);
  expect(fetch).not.toHaveBeenCalled();
  await advance();
  expect(fetch).toHaveBeenCalledTimes(1);
  const national = new URL(fetch.mock.calls[0][0], "https://example.test");
  expect(national.searchParams.get("layers")).toBe("observations");
  expect(national.searchParams.get("bbox")).toBe("-3.5,4.3,1.5,11.3");
  view([-2.1, 6.3, -1.1, 7.1], 9);
  await advance();
  expect(fetch).toHaveBeenCalledTimes(2);
  const district = new URL(fetch.mock.calls[1][0], "https://example.test");
  expect(district.searchParams.get("layers")).toBe("boundaries,observations");
  expect(district.searchParams.get("bbox")).toBe("-2.1,6.3,-1.1,7.1");
  view([-2.1, 6.3, -1.1, 7.1], 8);
  await advance();
  expect(
    new URL(fetch.mock.calls[2][0], "https://example.test").searchParams.get(
      "layers",
    ),
  ).toBe("observations");
});

it("coalesces rapid settled pan events into one request for the final bbox", async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal("fetch", fetch);
  render(<MapExplorer />);
  await advance();
  view([-2.2, 6.1, -1.8, 6.5]);
  await advance(100);
  view([-2.1, 6.2, -1.7, 6.6]);
  await advance(100);
  view([-2, 6.3, -1.6, 6.7]);
  await advance(249);
  expect(fetch).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(
    new URL(fetch.mock.calls[1][0], "https://example.test").searchParams.get(
      "bbox",
    ),
  ).toBe("-2,6.3,-1.6,6.7");
});

it("aborts superseded reads and ignores late responses even if fetch ignores cancellation", async () => {
  const resolve: Array<(value: ReturnType<typeof response>) => void> = [];
  const fetch = vi.fn(
    (_input: RequestInfo | URL, _options?: RequestInit) =>
      new Promise<ReturnType<typeof response>>((done) => resolve.push(done)),
  );
  vi.stubGlobal("fetch", fetch);
  render(<MapExplorer />);
  await advance();
  const staleSignal = fetch.mock.calls[0][1]?.signal as AbortSignal;
  view([-2.1, 6.3, -1.1, 7.1]);
  expect(staleSignal.aborted).toBe(true);
  await advance();
  await act(async () => resolve[1](response("Current public record")));
  expect(screen.getByTestId("rendered-public-features").textContent).toBe(
    "Current public record",
  );
  await act(async () => resolve[0](response("Obsolete public record")));
  expect(screen.getByTestId("rendered-public-features").textContent).toBe(
    "Current public record",
  );
});

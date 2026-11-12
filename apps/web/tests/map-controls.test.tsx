import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MapExplorer } from "@/components/map/MapExplorer";
import { MapLayerControl } from "@/components/map/MapLayerControl";
import type { IntelligenceMapProps } from "@/components/map/map-props";
import type { IntelligenceFeature } from "@/types/intelligence";

const mocks = vi.hoisted(() => ({ mounted: vi.fn(), props: vi.fn() }));
const features: IntelligenceFeature[] = [
  {
    id: "kumasi",
    type: "administrative_boundary",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-1.7, 6.6],
          [-1.5, 6.6],
          [-1.5, 6.8],
          [-1.7, 6.6],
        ],
      ],
    },
    properties: {
      title: "Kumasi Metro",
      layer: "boundaries",
      source: "GSS",
      region: "Ashanti",
    },
  },
  {
    id: "river",
    type: "citizen_observation",
    observedAt: "2025-07-01",
    geometry: { type: "Point", coordinates: [-2, 5] },
    properties: {
      title: "River record",
      layer: "observations",
      source: "Public API",
      publicLabel: "Approximate area",
      observationId: "public-river",
    },
  },
];
vi.mock("@/hooks/useMapFeatures", () => ({
  useMapFeatures: () => ({
    features,
    loading: false,
    error: "",
    truncated: false,
    retry: vi.fn(),
  }),
}));
vi.mock("@/components/map/BrowserMaps", () => ({
  HotspotMap: (props: IntelligenceMapProps) => {
    mocks.props(props);
    useEffect(() => {
      mocks.mounted();
    }, []);
    return <div data-testid="map-surface" />;
  },
}));

it("opens a loaded public search result without remounting imagery or fabricating media", async () => {
  const user = userEvent.setup();
  render(<MapExplorer />);
  await user.click(screen.getByRole("button", { name: "Filters" }));
  await user.selectOptions(
    screen.getByLabelText("Observation period"),
    "Last 7 days",
  );
  await user.keyboard("{Escape}");
  await user.type(
    screen.getByRole("searchbox", { name: "Search public map features" }),
    "River",
  );
  await user.click(
    screen.getByRole("button", { name: /River record Public map feature/ }),
  );
  expect(mocks.props.mock.lastCall![0]).toEqual(
    expect.objectContaining({
      selectedFeatureId: "river",
      focusFeature: expect.objectContaining({ id: "river" }),
    }),
  );
  expect(mocks.props.mock.lastCall![0].features).toContain(features[1]);
  expect(screen.getByRole("region", { name: "River record" })).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: /Open evidence record/ })
      .getAttribute("href"),
  ).toBe("/reports/public-river");
  expect(document.querySelector("video, img")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Close details" }));
  expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  expect(mocks.mounted).toHaveBeenCalledTimes(1);
});

it("supports keyboard layer panels and restores the toolbar trigger on Escape", async () => {
  const user = userEvent.setup();
  render(<MapExplorer />);
  const trigger = screen.getByRole("button", { name: "Layers" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "Map layers" })).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: /AI candidates/ }),
  ).toHaveProperty("disabled", true);
  await user.keyboard("{Tab}");
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Close map layers" }),
  );
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(mocks.mounted).toHaveBeenCalledTimes(1);
});

it("distinguishes pending or unavailable geography from an empty successful response", () => {
  const props = {
    layers: {
      coverage: false,
      observations: false,
      ai: false,
      satellite: false,
      boundaries: false,
    },
    counts: {
      coverage: 0,
      observations: 0,
      ai: 0,
      satellite: 0,
      boundaries: 0,
    },
    onChange: vi.fn(),
    showLabels: false,
    onLabelsChange: vi.fn(),
  };
  const view = render(<MapLayerControl {...props} loading />);
  expect(screen.getAllByText("Loading public geography…")).toHaveLength(5);
  expect(screen.queryByText("No model results available")).toBeNull();
  view.rerender(<MapLayerControl {...props} unavailable />);
  expect(screen.getAllByText("Public data unavailable")).toHaveLength(5);
  view.rerender(<MapLayerControl {...props} />);
  expect(screen.getByText("No model results available")).toBeTruthy();
});

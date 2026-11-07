import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GoogleIntelligenceMap } from "@/components/map/GoogleIntelligenceMap";
import type { IntelligenceFeature } from "@/types/intelligence";

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  setType: vi.fn(),
  addGeoJson: vi.fn(),
  style: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/services/google-maps", () => ({
  onGoogleMapsAuthFailure: () => mocks.unsubscribe,
  loadGoogleMaps: async () => ({
    Map: class {
      constructor(element: Element, options: unknown) {
        mocks.construct(element, options);
      }
      setMapTypeId = mocks.setType;
      data = {
        forEach: vi.fn(),
        remove: vi.fn(),
        addGeoJson: mocks.addGeoJson,
        setStyle: mocks.style,
        addListener: () => ({ remove: vi.fn() }),
      };
    },
    InfoWindow: class {
      close() {}
    },
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("keeps one Google map while updating labels and public GeoJSON overlays", async () => {
  vi.stubGlobal("google", {
    maps: {
      ControlPosition: { RIGHT_BOTTOM: 9 },
      SymbolPath: { CIRCLE: 0 },
      event: { addListenerOnce: () => ({ remove: vi.fn() }) },
    },
  });
  const feature: IntelligenceFeature = {
    id: "public-district",
    type: "administrative_boundary",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-2, 5],
          [-1, 5],
          [-1, 6],
          [-2, 5],
        ],
      ],
    },
    properties: { title: "District", layer: "boundaries", source: "GSS" },
  };
  const props = {
    apiKey: "browser-test-key",
    onUnavailable: vi.fn(),
    onSelectFeature: vi.fn(),
  };
  const view = render(
    <GoogleIntelligenceMap {...props} showLabels features={[]} />,
  );
  await waitFor(() => expect(mocks.setType).toHaveBeenCalledWith("hybrid"));
  expect(mocks.construct.mock.calls[0][1]).toEqual(
    expect.objectContaining({ mapTypeId: "hybrid", zoom: 11 }),
  );
  view.rerender(
    <GoogleIntelligenceMap
      {...props}
      showLabels={false}
      features={[feature]}
    />,
  );
  await waitFor(() => expect(mocks.setType).toHaveBeenCalledWith("satellite"));
  expect(mocks.construct).toHaveBeenCalledTimes(1);
  expect(mocks.addGeoJson).toHaveBeenCalledWith(
    expect.objectContaining({ id: feature.id, geometry: feature.geometry }),
  );
  view.unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
});

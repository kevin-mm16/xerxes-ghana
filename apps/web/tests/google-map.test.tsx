import { act, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GoogleIntelligenceMap } from "@/components/map/GoogleIntelligenceMap";
import type { IntelligenceFeature } from "@/types/intelligence";
import { ghanaCountryBounds } from "@/utils/map-view";

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  setType: vi.fn(),
  fitBounds: vi.fn(),
  addGeoJson: vi.fn((feature: { id: string }) => [{ getId: () => feature.id }]),
  style: vi.fn(),
  unsubscribe: vi.fn(),
  zoom: 6,
  idle: undefined as undefined | (() => void),
}));
vi.mock("@/services/google-maps", () => ({
  onGoogleMapsAuthFailure: () => mocks.unsubscribe,
  loadGoogleMaps: async () => ({
    Map: class {
      constructor(element: Element, options: unknown) {
        mocks.construct(element, options);
      }
      setMapTypeId = mocks.setType;
      fitBounds = mocks.fitBounds;
      getZoom = () => mocks.zoom;
      getCenter = () => ({ lat: () => 9.2, lng: () => -1.4 });
      addListener = (name: string, listener: () => void) => {
        if (name === "idle") mocks.idle = listener;
        return { remove: vi.fn() };
      };
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
  mocks.zoom = 6;
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
function google() {
  vi.stubGlobal("google", {
    maps: {
      ControlPosition: { RIGHT_BOTTOM: 9 },
      SymbolPath: { CIRCLE: 0 },
      event: { addListenerOnce: () => ({ remove: vi.fn() }) },
    },
  });
}
it("keeps one Google map and existing geometry while changing labels and selection", async () => {
  google();
  const props = {
    apiKey: "browser-test-key",
    onUnavailable: vi.fn(),
    onSelectFeature: vi.fn(),
  };
  const view = render(
    <GoogleIntelligenceMap {...props} showLabels features={[feature]} />,
  );
  await waitFor(() => expect(mocks.setType).toHaveBeenCalledWith("hybrid"));
  expect(mocks.construct.mock.calls[0][1]).toEqual(
    expect.objectContaining({ zoom: 6 }),
  );
  expect(mocks.fitBounds).toHaveBeenCalledWith(
    {
      south: ghanaCountryBounds[0][0],
      west: ghanaCountryBounds[0][1],
      north: ghanaCountryBounds[1][0],
      east: ghanaCountryBounds[1][1],
    },
    expect.any(Object),
  );
  expect(mocks.addGeoJson).toHaveBeenCalledWith(
    expect.objectContaining({ id: feature.id, geometry: feature.geometry }),
  );
  const additions = mocks.addGeoJson.mock.calls.length;
  view.rerender(
    <GoogleIntelligenceMap
      {...props}
      showLabels={false}
      features={[feature]}
      selectedFeatureId={feature.id}
    />,
  );
  await waitFor(() => expect(mocks.setType).toHaveBeenCalledWith("satellite"));
  expect(mocks.construct).toHaveBeenCalledTimes(1);
  expect(mocks.addGeoJson).toHaveBeenCalledTimes(additions);
  const currentStyle = mocks.style.mock.lastCall![0];
  const data = { getId: () => feature.id, getProperty: () => feature.type };
  expect(currentStyle(data).visible).toBe(false);
  act(() => {
    mocks.zoom = 11;
    mocks.idle?.();
  });
  expect(mocks.style.mock.lastCall![0](data)).toEqual(
    expect.objectContaining({
      visible: true,
      strokeColor: "#c7b998",
      fillOpacity: 0.035,
    }),
  );
  view.unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
});
it("restores a retained camera without fitting the national overview", async () => {
  google();
  const changed = vi.fn();
  render(
    <GoogleIntelligenceMap
      apiKey="key"
      onUnavailable={vi.fn()}
      onSelectFeature={vi.fn()}
      features={[]}
      initialCamera={{ center: [9.2, -1.4], zoom: 13 }}
      onCameraChange={changed}
    />,
  );
  await waitFor(() => expect(mocks.construct).toHaveBeenCalled());
  expect(mocks.fitBounds).not.toHaveBeenCalled();
  expect(mocks.construct.mock.calls[0][1]).toEqual(
    expect.objectContaining({ center: { lat: 9.2, lng: -1.4 }, zoom: 13 }),
  );
  act(() => {
    mocks.zoom = 13;
    mocks.idle?.();
  });
  expect(changed).toHaveBeenCalledWith({ center: [9.2, -1.4], zoom: 13 });
});

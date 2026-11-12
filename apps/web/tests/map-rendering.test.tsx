import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { MapFeatureLayers } from "@/components/map/MapFeatureLayers";
import {
  districtZoomTier,
  ghanaFocusGeometry,
  ghanaOutline,
  overlayStyle,
} from "@/utils/map-geometry";
import type { IntelligenceFeature } from "@/types/intelligence";

const mocks = vi.hoisted(() => ({
  zoom: 6,
  zoomEnd: undefined as undefined | (() => void),
  polygon: vi.fn(),
}));
vi.mock("react-leaflet", () => ({
  useMap: () => ({ getZoom: () => mocks.zoom }),
  useMapEvents: (handlers: { zoomend: () => void }) => {
    mocks.zoomEnd = handlers.zoomend;
  },
  Pane: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Polygon: (props: {
    children?: ReactNode;
    positions: unknown;
    interactive?: boolean;
  }) => {
    mocks.polygon(props);
    return <div>{props.children}</div>;
  },
  CircleMarker: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
afterEach(() => {
  mocks.zoom = 6;
  vi.clearAllMocks();
});
const district: IntelligenceFeature = {
  id: "district",
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
  properties: {
    title: "Reference district",
    layer: "boundaries",
    source: "GSS",
  },
};
it("keeps national imagery clear, reveals restrained districts by zoom, and labels them only at detail scale", () => {
  const view = render(
    <MapFeatureLayers features={[district]} onSelectFeature={vi.fn()} />,
  );
  expect(view.queryByText("Reference district")).toBeNull();
  expect(
    mocks.polygon.mock.calls.filter(([p]) => p.interactive !== false),
  ).toHaveLength(0);
  act(() => {
    mocks.zoom = 9;
    mocks.zoomEnd?.();
  });
  expect(
    mocks.polygon.mock.calls.filter(([p]) => p.interactive !== false),
  ).toHaveLength(1);
  expect(view.queryByText("Reference district")).toBeNull();
  act(() => {
    mocks.zoom = 13;
    mocks.zoomEnd?.();
  });
  expect(view.getByText("Reference district")).toBeTruthy();
  expect(
    overlayStyle("administrative_boundary", false, districtZoomTier(11)),
  ).toEqual(expect.objectContaining({ weight: 0.85, fillOpacity: 0 }));
});
it("retains vector positions through unrelated renders and selection changes", () => {
  mocks.zoom = 11;
  const features = [district];
  const select = vi.fn();
  const view = render(
    <MapFeatureLayers features={features} onSelectFeature={select} />,
  );
  const first = mocks.polygon.mock.calls.find(
    ([p]) => p.interactive !== false,
  )![0].positions;
  const calls = mocks.polygon.mock.calls.length;
  view.rerender(
    <MapFeatureLayers features={features} onSelectFeature={select} />,
  );
  expect(mocks.polygon).toHaveBeenCalledTimes(calls);
  view.rerender(
    <MapFeatureLayers
      features={features}
      onSelectFeature={select}
      selectedFeatureId={district.id}
    />,
  );
  expect(
    mocks.polygon.mock.calls.filter(([p]) => p.interactive !== false).at(-1)![0]
      .positions,
  ).toBe(first);
});
it("uses one closed full national ring as an inverse-mask hole", () => {
  const ring = ghanaOutline[0];
  expect(ring).toHaveLength(1898);
  expect(ring[0]).toEqual(ring.at(-1));
  expect(ghanaFocusGeometry.coordinates).toHaveLength(2);
  function inside(lng: number, lat: number) {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i];
      const [px, py] = ring[j];
      if (y > lat !== py > lat && lng < ((px - x) * (lat - y)) / (py - y) + x)
        result = !result;
    }
    return result;
  }
  expect(inside(-1.62, 6.69)).toBe(true); // Kumasi
  expect(inside(-0.84, 9.4)).toBe(true); // Tamale
  expect(inside(-1.52, 12.37)).toBe(false); // Ouagadougou
  expect(inside(-4.03, 5.33)).toBe(false); // Abidjan
});

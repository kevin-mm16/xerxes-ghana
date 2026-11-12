import { useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { IntelligenceFeature } from "@/types/intelligence";
import { MapExplorer } from "@/components/map/MapExplorer";

const mounted = vi.hoisted(() => vi.fn());
vi.mock("@/components/map/BrowserMaps", () => ({
  HotspotMap: ({ features }: { features: IntelligenceFeature[] }) => {
    useEffect(() => {
      mounted();
    }, []);
    return (
      <div data-testid="features">{features.length} public observations</div>
    );
  },
}));
vi.mock("@/hooks/useMapFeatures", () => ({
  useMapFeatures: () => ({
    loading: false,
    error: "",
    truncated: false,
    retry: vi.fn(),
    features: [2025, 2026].map((year) => ({
      id: String(year),
      type: "citizen_observation",
      geometry: { type: "Point", coordinates: [-2, 5] },
      observedAt: `${year}-07-01`,
      properties: {
        layer: "observations",
        title: "Reviewed test observation",
        source: "Public API",
      },
    })),
  }),
}));

it("shows dates only for enabled reviewed observations and never remounts imagery when filtering them", () => {
  render(<MapExplorer />);
  expect(screen.getByRole("button", { name: "2025" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Layers" }));
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Reviewed observations/ }),
  );
  expect(screen.queryByRole("button", { name: "2025" })).toBeNull();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Reviewed observations/ }),
  );
  expect(screen.getByTestId("features").textContent).toBe(
    "2 public observations",
  );
  fireEvent.click(screen.getByRole("button", { name: "2025" }));
  expect(screen.getByTestId("features").textContent).toBe(
    "1 public observations",
  );
  expect(mounted).toHaveBeenCalledTimes(1);
});

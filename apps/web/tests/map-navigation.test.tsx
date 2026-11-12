import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MapNavigation } from "@/components/map/MapNavigation";
import { ghanaViewBounds, parseMapCoordinates } from "@/utils/map-view";

const map = vi.hoisted(() => ({ fitBounds: vi.fn(), setView: vi.fn() }));
vi.mock("react-leaflet", () => ({ useMap: () => map }));

it("navigates to coordinates in latitude/longitude order without creating an observation", () => {
  render(<MapNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Coordinates" }));
  fireEvent.change(screen.getByLabelText("Latitude"), {
    target: { value: "5.43" },
  });
  fireEvent.change(screen.getByLabelText("Longitude"), {
    target: { value: "-2.15" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Go to coordinates" }));
  expect(map.setView).toHaveBeenCalledWith([5.43, -2.15], 16);
  fireEvent.click(screen.getByRole("button", { name: "Show Ghana overview" }));
  expect(map.fitBounds).toHaveBeenCalledWith(ghanaViewBounds, {
    padding: [24, 24],
  });
});
it("rejects blank, nonfinite, and swapped/out-of-workspace coordinates", () => {
  for (const [lat, lng] of [
    ["", "-2"],
    ["NaN", "-2"],
    ["-2.15", "5.43"],
    ["6", "200"],
  ]) {
    expect(() => parseMapCoordinates(lat, lng)).toThrow();
  }
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoverageStatus } from "@/components/forms/CoverageStatus";
import { ReportSubmissionForm } from "@/components/forms/ReportSubmissionForm";
import { MapLayerControl } from "@/components/map/MapLayerControl";
import { checkCoverage, submitObservation } from "@/services/api";

vi.mock("@/services/api", () => ({
  checkCoverage: vi.fn(),
  submitObservation: vi.fn(),
}));
const region = {
  id: "region",
  code: "GHA-XER-W001",
  name: "Ankobra",
  version: 1,
  isDemo: true,
};

describe("coverage result", () => {
  it("treats an overlapping accuracy disk as uncertain even when its centre is inside", () => {
    render(
      <CoverageStatus
        result={{
          insideCoverage: true,
          state: "uncertain",
          boundaryAmbiguous: true,
          matchedRegions: [region],
          nearbyRegions: [],
        }}
      />,
    );
    expect(screen.getByText(/Near a coverage boundary/)).toBeTruthy();
    expect(screen.queryByText("Inside XERSXES coverage area")).toBeNull();
  });
});
describe("contribution", () => {
  it("does not request GPS on mount, validates location, then requires consent", async () => {
    const gps = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: gps },
    });
    render(<ReportSubmissionForm />);
    expect(gps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Choose a location or describe an approximate area.",
    );
    fireEvent.change(screen.getByLabelText("Approximate area or landmark"), {
      target: { value: "Near a public landmark" },
    });
    fireEvent.change(screen.getByLabelText("What did you observe?"), {
      target: { value: "Synthetic context" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Agree to private storage and review before submitting.",
    );
    expect(submitObservation).not.toHaveBeenCalled();
  });
  it("sends accuracy, capture timestamp, and source to the server before saving metadata", async () => {
    const user = userEvent.setup();
    const timestamp = Date.now();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({
            coords: { latitude: 5.4, longitude: -2.1, accuracy: 12 },
            timestamp,
          }),
        ),
      },
    });
    vi.mocked(checkCoverage).mockResolvedValue({
      insideCoverage: true,
      state: "inside",
      boundaryAmbiguous: false,
      matchedRegions: [region],
      nearbyRegions: [],
    });
    vi.mocked(submitObservation).mockResolvedValue({
      id: "receipt",
      status: "pending",
      coverageState: "inside",
      submittedAt: new Date().toISOString(),
    });
    render(<ReportSubmissionForm />);
    await user.click(screen.getByRole("button", { name: /Use my location/ }));
    await screen.findByText("Inside XERSXES coverage area");
    expect(checkCoverage).toHaveBeenCalledWith({
      latitude: 5.4,
      longitude: -2.1,
      accuracyMeters: 12,
      capturedAt: new Date(timestamp).toISOString(),
      source: "browser-geolocation",
    });
    await user.type(
      screen.getByLabelText("What did you observe?"),
      "Synthetic observation",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Submit observation" }),
    );
    await screen.findByText("Saved for private review");
    await waitFor(() =>
      expect(submitObservation).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaType: "none",
          consent: true,
          captureLocation: expect.objectContaining({ accuracyMeters: 12 }),
        }),
      ),
    );
  });
});
describe("monitoring layers", () => {
  it("keeps satellite as the only base view and disables layers with no real results", () => {
    const change = vi.fn();
    render(
      <MapLayerControl
        layers={{
          coverage: false,
          observations: false,
          ai: false,
          satellite: false,
          boundaries: false,
        }}
        onChange={change}
        counts={{
          coverage: 3,
          observations: 0,
          ai: 0,
          satellite: 0,
          boundaries: 0,
        }}
        showLabels={true}
        onLabelsChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("radio")).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: /AI candidates/ }),
    ).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Monitoring areas/ }));
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ coverage: true }),
    );
  });
});

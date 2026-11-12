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
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Choose a location or describe an approximate area.",
    );
    fireEvent.change(screen.getByLabelText("Approximate area or landmark"), {
      target: { value: "Near a public landmark" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to details" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "What did you observe?" }),
      {
        target: { value: "Synthetic context" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit observation" }));
    expect(
      await screen.findByText(
        "Agree to private storage and review before submitting.",
      ),
    ).toBeTruthy();
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
    await user.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to details" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "What did you observe?" }),
      "Synthetic observation",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to review" }),
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

  it("preserves location and details while moving back through the guided steps", async () => {
    const user = userEvent.setup();
    render(<ReportSubmissionForm />);
    fireEvent.change(screen.getByLabelText("Approximate area or landmark"), {
      target: { value: "Near a public landmark" },
    });
    await user.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(
      screen.getByRole("heading", { name: "Add supporting evidence" }),
    ).toBe(document.activeElement);
    await user.click(
      screen.getByRole("button", { name: "Continue to details" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "What did you observe?" }),
      "A change in the river colour",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to review" }),
    );
    expect(screen.getByText("Near a public landmark")).toBeTruthy();
    expect(screen.getByText("A change in the river colour")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit location" }));
    expect(
      screen.getByLabelText("Approximate area or landmark"),
    ).toHaveProperty("value", "Near a public landmark");
    await user.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to details" }),
    );
    expect(
      screen.getByRole("textbox", { name: "What did you observe?" }),
    ).toHaveProperty("value", "A change in the river colour");
    expect(submitObservation).not.toHaveBeenCalled();
  });

  it("offers a manual fallback when location permission is denied", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success, failure) => failure({ code: 1 })),
      },
    });
    render(<ReportSubmissionForm />);
    fireEvent.click(screen.getByRole("button", { name: /Use my location/ }));
    await screen.findByText(
      "Location could not be obtained. Retry or use a manual location.",
    );
    fireEvent.change(screen.getByLabelText("Approximate area or landmark"), {
      target: { value: "Near a river crossing" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(
      screen.getByRole("heading", { name: "Add supporting evidence" }),
    ).toBeTruthy();
    expect(checkCoverage).not.toHaveBeenCalled();
  });

  it("allows an outside-coverage observation to continue for private review", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({
            coords: { latitude: 9.4, longitude: -0.8, accuracy: 30 },
            timestamp: Date.now(),
          }),
        ),
      },
    });
    vi.mocked(checkCoverage).mockResolvedValue({
      insideCoverage: false,
      state: "outside",
      boundaryAmbiguous: false,
      matchedRegions: [],
      nearbyRegions: [],
    });
    render(<ReportSubmissionForm />);
    fireEvent.click(screen.getByRole("button", { name: /Use my location/ }));
    await screen.findByText("Outside current XERSXES monitoring coverage");
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to evidence" }),
    );
    expect(
      screen.getByRole("heading", { name: "Add supporting evidence" }),
    ).toBeTruthy();
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

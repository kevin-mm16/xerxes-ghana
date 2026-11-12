import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HotspotMap } from "@/components/map/BrowserMaps";
import { GET } from "../app/api/map-config/route";

vi.mock("next/dynamic", async () => {
  const { lazy, Suspense } = await import("react");
  return {
    default: (load: () => Promise<React.ComponentType>) => {
      const Component = lazy(async () => ({ default: await load() }));
      return (props: Record<string, unknown>) => (
        <Suspense fallback={null}>
          <Component {...props} />
        </Suspense>
      );
    },
  };
});
vi.mock("@/components/map/HotspotMap", () => ({
  HotspotMap: () => <div data-testid="satellite">Satellite fallback</div>,
}));
vi.mock("@/components/map/GoogleIntelligenceMap", () => ({
  GoogleIntelligenceMap: ({ onUnavailable }: { onUnavailable: () => void }) => (
    <button onClick={onUnavailable}>Google authentication failed</button>
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("uses satellite fallback when no browser key is configured", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ googleMapsApiKey: null }),
      }),
  );
  render(<HotspotMap features={[]} onSelectFeature={vi.fn()} />);
  await screen.findByTestId("satellite");
  expect(screen.queryByRole("button", { name: /Google/ })).toBeNull();
});

it("falls back when configuration cannot be loaded", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
  render(<HotspotMap features={[]} onSelectFeature={vi.fn()} />);
  await screen.findByTestId("satellite");
});

it("uses Google with a key and falls back on an authentication failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ googleMapsApiKey: "browser-test-key" }),
      }),
  );
  render(<HotspotMap features={[]} onSelectFeature={vi.fn()} />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Google authentication failed/ }),
  );
  await waitFor(() => expect(screen.getByTestId("satellite")).toBeTruthy());
});

it("exposes only the explicitly configured public browser key at runtime", async () => {
  vi.stubEnv("GOOGLE_MAPS_BROWSER_KEY", "restricted-browser-key");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "alternate-browser-key");
  vi.stubEnv("DATABASE_URL", "private-connection-string");
  const response = GET();
  expect(await response.json()).toEqual({
    googleMapsApiKey: "restricted-browser-key",
  });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

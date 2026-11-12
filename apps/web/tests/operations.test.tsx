import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeratorDashboard } from "@/components/admin/ModeratorDashboard";
import { ModeratorLoginForm } from "@/components/admin/ModeratorLoginForm";
import { ModeratorLayout } from "@/components/layout/ModeratorLayout";

vi.mock("@/components/map/BrowserMaps", () => ({
  CoordinateMapPreview: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe("operations preview", () => {
  it("offers explicit demo access without collecting credentials", () => {
    const { container } = render(<ModeratorLoginForm />);
    expect(
      screen
        .getByRole("link", { name: /Open demo console/ })
        .getAttribute("href"),
    ).toBe("/moderator/dashboard");
    expect(
      screen.getByText(
        "No sign-in is performed. No credentials are requested.",
      ),
    ).toBeTruthy();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });

  it("filters synthetic observations by review status and area", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    const queue = screen.getByRole("region", { name: "Review queue" });
    expect(
      within(queue).getByRole("list", { name: "Sample observations" }).children
        .length,
    ).toBe(8);
    await user.click(
      within(queue).getByRole("button", { name: "Needs review" }),
    );
    expect(
      within(queue).getByRole("list", { name: "Sample observations" }).children
        .length,
    ).toBe(4);
    await user.type(
      within(queue).getByRole("searchbox", { name: "Search sample reports" }),
      "Western North",
    );
    expect(
      within(queue).getByRole("list", { name: "Sample observations" }).children
        .length,
    ).toBe(1);
    expect(
      within(queue).getByRole("button", {
        name: /Turbid tributary of the Pra/,
      }),
    ).toBeTruthy();
    await user.clear(within(queue).getByRole("searchbox"));
    await user.type(within(queue).getByRole("searchbox"), "No such area");
    expect(within(queue).getByText("No matching samples")).toBeTruthy();
    await user.click(
      within(queue).getByRole("button", { name: "Clear filters" }),
    );
    expect(
      within(queue).getByRole("list", { name: "Sample observations" }).children
        .length,
    ).toBe(8);
  });

  it("opens a selected sample and moves focus to its review heading", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    const selection = screen.getByRole("button", {
      name: /River dredging platforms near Prestea/,
    });
    await user.click(selection);
    const review = screen.getByRole("region", {
      name: "River dredging platforms near Prestea",
    });
    expect(
      within(review).getByRole("heading", {
        name: "River dredging platforms near Prestea",
      }),
    ).toBe(document.activeElement);
    expect(selection.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Review sample" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Back to queue" }));
    expect(
      screen
        .getByRole("button", { name: "Queue (8)" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("heading", { name: "Review queue" })).toBe(
      document.activeElement,
    );
  });

  it("updates only demo state and derived counts when making a decision", async () => {
    const user = userEvent.setup();
    const network = vi.spyOn(globalThis, "fetch");
    render(<ModeratorDashboard />);
    await user.click(
      screen.getByRole("button", {
        name: /River dredging platforms near Prestea/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Mark verified" }));
    expect(screen.getByRole("status").textContent).toContain(
      "nothing was published or sent",
    );
    expect(screen.getByRole("status").textContent).toContain("Verified");
    expect(document.activeElement).toBe(screen.getByRole("status"));
    expect(
      screen.getByText("Verified / demo", { selector: "dt" }).parentElement
        ?.textContent,
    ).toContain("4");
    expect(
      screen
        .getByRole("button", { name: "Mark verified" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByText("rpt-001: Under Review to Verified (demo)."),
    ).toBeTruthy();
    expect(network).not.toHaveBeenCalled();
  });

  it("never carries checklist checks from one sample to another", async () => {
    const user = userEvent.setup();
    render(<ModeratorDashboard />);
    const mediaCheck = screen.getByRole("checkbox", {
      name: "Media reviewed",
    }) as HTMLInputElement;
    expect(mediaCheck.checked).toBe(false);
    await user.click(mediaCheck);
    expect(mediaCheck.checked).toBe(true);
    await user.click(
      screen.getByRole("button", {
        name: /River dredging platforms near Prestea/,
      }),
    );
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Media reviewed",
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("labels fixture locations and unavailable live media without fabricating evidence", () => {
    const { container } = render(<ModeratorDashboard />);
    expect(screen.getByText("Synthetic sample point")).toBeTruthy();
    expect(
      screen.getByText(
        "Fixture coordinates only. Live capture locations remain private and are not loaded here.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("No live media in this workspace")).toBeTruthy();
    expect(container.querySelector("video, img")).toBeNull();
  });

  it("provides working console anchors instead of dead navigation", () => {
    render(
      <ModeratorLayout>
        <ModeratorDashboard />
      </ModeratorLayout>,
    );
    const navigation = screen.getByRole("navigation", { name: "Operations" });
    for (const link of within(navigation).getAllByRole("link")) {
      const href = link.getAttribute("href");
      expect(href).not.toBe("#");
      expect(document.getElementById(href!.slice(1))).toBeTruthy();
    }
  });
});

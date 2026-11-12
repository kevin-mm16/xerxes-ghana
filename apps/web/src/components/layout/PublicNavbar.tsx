"use client";

import AppLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, LinkButton } from "@/components/ui";

const navItems = [
  { href: "/map", label: "Explore" },
  { href: "/evidence", label: "Evidence" },
  { href: "/about", label: "Methodology" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header className="application-header sticky top-0 z-[800]">
      <nav
        aria-label="Main navigation"
        className="relative mx-auto flex h-full max-w-[1600px] items-center gap-4 px-5 sm:px-8"
      >
        <AppLink
          href="/"
          aria-label="XERSXES Ghana home"
          className="flex min-w-0 items-center gap-3"
        >
          <span className="application-wordmark text-[#f3f2e8]">XERSXES</span>
          <span className="hidden border-l border-[#4a574c] pl-3 text-[9px] leading-[1.6] tracking-[.07em] text-[#a3b0a4] sm:block">
            Environmental Intelligence
            <span className="block text-[8px] tracking-[.22em]">GHANA</span>
          </span>
        </AppLink>
        <span
          className="application-environment"
          title="Development instance. Satellite analysis is not operational; reviewer access requires authentication."
        >
          DEMO
        </span>
        <div className="ml-auto hidden h-full items-center md:flex">
          {navItems.map((item) => (
            <AppLink
              key={item.href}
              href={item.href}
              className="application-nav-link"
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              {item.label}
            </AppLink>
          ))}
          <LinkButton
            href="/report"
            size="sm"
            variant="secondary"
            aria-current={pathname === "/report" ? "page" : undefined}
            className="ml-5 border-[#64735e] bg-[#dce4d2] text-[#24392a] hover:bg-[#edf1e6]"
          >
            Contribute
            <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
          </LinkButton>
        </div>
        <button
          ref={menuButton}
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded border border-[#465647] md:hidden"
        >
          <Icon name={open ? "x" : "menu"} />
        </button>
        {open && (
          <div
            ref={menu}
            id="mobile-navigation"
            className="application-menu md:hidden"
          >
            {[...navItems, { href: "/report", label: "Contribute" }].map(
              (item) => (
                <AppLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={
                    pathname.startsWith(item.href) ? "page" : undefined
                  }
                  className="block rounded px-3 py-3 text-sm hover:bg-white/10 aria-[current=page]:text-white"
                >
                  {item.label}
                </AppLink>
              ),
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

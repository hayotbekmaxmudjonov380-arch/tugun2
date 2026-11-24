import React, { useEffect, useState } from "react";
import {
  LiquidNavbar,
  NimbusIcons,
  type LiquidNavItem,
} from "@/components/ui/liquid-glass-navbar";
import { getActiveNavIndex, resolveNavTone } from "@/components/ui/nav-utils";

const I = (d: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.85"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const TUGUN_ITEMS: LiquidNavItem[] = [
  {
    label: "Tuzilma",
    href: "#tuzilma",
    navKey: "tuzilma",
    icon: NimbusIcons.home,
    fx: "glow",
  },
  {
    label: "Dashboard",
    href: "#dashboard",
    navKey: "dashboard",
    icon: I(
      <>
        <rect x="3.5" y="12.5" width="4" height="7.5" rx="1" />
        <rect x="10" y="7.5" width="4" height="12.5" rx="1" />
        <rect x="16.5" y="4" width="4" height="16" rx="1" />
      </>
    ),
    fx: "pop",
  },
  {
    label: "Tasklar",
    href: "#tasklar",
    navKey: "tasklar",
    icon: NimbusIcons.plane,
    fx: "plane",
  },
  {
    label: "Davomat",
    href: "#davomat",
    navKey: "davomat",
    icon: NimbusIcons.drop,
    fx: "drop",
  },
  {
    label: "Nizom",
    href: "#nizom",
    navKey: "nizom",
    icon: I(
      <>
        <path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V4.5Z" />
        <path d="M8.5 9h6M8.5 13h6" />
      </>
    ),
    fx: "wave",
  },
  {
    label: "Sozlamalar",
    href: "#sozlamalar",
    navKey: "sozlamalar",
    icon: NimbusIcons.globe,
    fx: "spin",
  },
  {
    label: "Qo'llanma",
    href: "#qollanma",
    navKey: "qollanma",
    icon: I(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.6 9.5a2.4 2.4 0 0 1 4.6.8c0 1.6-2.2 2.1-2.2 3.4" />
        <circle cx="12" cy="16.8" r=".6" fill="currentColor" stroke="none" />
      </>
    ),
    fx: "pop",
  },
  {
    label: "Kirish",
    href: "#login",
    navKey: "login",
    icon: NimbusIcons.user,
    fx: "wave",
  },
];

function readCurrentTone(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return resolveNavTone(
    root.getAttribute("data-mode"),
    root.getAttribute("data-theme"),
    prefersDark
  );
}

export default function TopNav() {
  const [activeIdx, setActiveIdx] = useState(() =>
    typeof window === "undefined" ? 0 : getActiveNavIndex(window.location.hash)
  );
  const [tone, setTone] = useState<"light" | "dark">(readCurrentTone);

  useEffect(() => {
    const syncRoute = () => {
      setActiveIdx(getActiveNavIndex(window.location.hash));
    };
    window.addEventListener("hashchange", syncRoute);

    const syncTone = () => setTone(readCurrentTone());
    const observer = new MutationObserver(syncTone);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "data-theme"],
    });

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", syncTone);

    return () => {
      window.removeEventListener("hashchange", syncRoute);
      observer.disconnect();
      mq?.removeEventListener?.("change", syncTone);
    };
  }, []);

  return (
    <LiquidNavbar
      items={TUGUN_ITEMS}
      active={activeIdx}
      onChange={(idx, item) => {
        setActiveIdx(idx);
        if (item.href && window.location.hash !== item.href) {
          window.location.hash = item.href;
        }
      }}
      tone={tone}
      sound={false}
      ariaLabel="Asosiy bo'limlar"
      className="tugun-liquid-nav"
    />
  );
}

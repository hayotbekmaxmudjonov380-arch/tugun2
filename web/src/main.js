import "./styles/tailwind.css";
import "./styles/style.css";
import "./styles/tugun.css";
import "virtual:tugun-app";

import React from "react";
import ReactDOM from "react-dom/client";
import DemoOne from "@/components/ui/demo";
import TopNav from "@/components/TopNav";
import DashAccordion from "@/components/DashAccordion";
import { initGlobalWaterline } from "@/components/ui/waterline-global";

// Activate global Waterline animations across pills, buttons, cards, and views
initGlobalWaterline();

// Mount Liquid Glass Navbar into topbar without altering legacy app structure
const navContainer = document.getElementById("tugun-nav-root");
if (navContainer) {
  ReactDOM.createRoot(navContainer).render(React.createElement(TopNav));
}

// Mount/unmount Liquid Glass Accordion inside #dashboard without breaking legacy render()
let dashAccRoot = null;
let dashAccContainer = null;
window.__tugunDashAcc = {
  mount(container, payload, savedOpen, onOpenChange) {
    if (!container || !payload) return;
    if (dashAccRoot && dashAccContainer !== container) {
      dashAccRoot.unmount();
      dashAccRoot = null;
      dashAccContainer = null;
    }
    if (!dashAccRoot) {
      dashAccRoot = ReactDOM.createRoot(container);
      dashAccContainer = container;
    }
    dashAccRoot.render(
      React.createElement(DashAccordion, { payload, savedOpen, onOpenChange })
    );
  },
  unmount() {
    if (dashAccRoot) {
      dashAccRoot.unmount();
      dashAccRoot = null;
      dashAccContainer = null;
    }
  },
};
if (window.__tugunDashSync) window.__tugunDashSync();

// Handle #login route for React Login Form
let authRoot = null;
function checkAuthRoute() {
  const isLogin = window.location.hash === "#login";
  let container = document.getElementById("auth-root");
  
  if (isLogin) {
    if (!container) {
      container = document.createElement("div");
      container.id = "auth-root";
      container.style.position = "fixed";
      container.style.inset = "0";
      container.style.zIndex = "99999";
      document.body.appendChild(container);
    }
    container.style.display = "block";
    if (!authRoot) {
      authRoot = ReactDOM.createRoot(container);
    }
    authRoot.render(React.createElement(DemoOne));
  } else if (container) {
    container.style.display = "none";
  }
}

window.addEventListener("hashchange", checkAuthRoute);
window.addEventListener("DOMContentLoaded", checkAuthRoute);
checkAuthRoute();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}

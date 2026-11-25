import "./styles/tailwind.css";
import "./styles/style.css";
import "./styles/tugun.css";
import "virtual:tugun-app";

import React from "react";
import ReactDOM from "react-dom/client";
import DemoOne from "@/components/ui/demo";
import { sb } from "./supabase";

// Handle #login route for React Login Form
let authRoot = null;
let authSession = null;
let authChecked = !sb;
let pageLoaded = document.readyState === "complete";

function tryDismissPreloader() {
  if (!pageLoaded || !authChecked) return;
  const el = document.getElementById("tugun-preloader");
  if (!el || el.dataset.dismissing) return;
  el.dataset.dismissing = "1";
  const startedAt = window["__tgPreloadStart"] || Date.now();
  const wait = Math.max(0, 1350 - (Date.now() - startedAt));
  setTimeout(() => {
    document.documentElement.classList.remove("tugun-preloading");
    el.classList.add("is-done");
    setTimeout(() => {
      el.remove();
      document.getElementById("tugun-preload-style")?.remove();
    }, 320);
  }, wait);
}

function checkAuthRoute() {
  if (!authChecked) return;
  const mustLogin = Boolean(sb && !authSession);
  const isLogin = mustLogin || window.location.hash === "#login";

  if (mustLogin && window.location.hash !== "#login") {
    window.history.replaceState(null, "", "#login");
  }

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

if (sb) {
  sb.auth.getSession()
    .then(({ data }) => {
      authSession = data?.session || null;
    })
    .catch(() => {
      authSession = null;
    })
    .finally(() => {
      authChecked = true;
      checkAuthRoute();
      requestAnimationFrame(tryDismissPreloader);
    });

  sb.auth.onAuthStateChange((_event, session) => {
    authSession = session || null;
    authChecked = true;
    checkAuthRoute();
  });
} else {
  checkAuthRoute();
}

if (pageLoaded) {
  requestAnimationFrame(tryDismissPreloader);
} else {
  window.addEventListener("load", () => {
    pageLoaded = true;
    requestAnimationFrame(tryDismissPreloader);
  }, { once: true });
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}

import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";
import { checkTelegramLaunch, linkTelegramIdentity, type TelegramAuthResult } from "@/lib/telegram/api";

const RESULT_KEY = "bultum-tg-result";

/* ─── Brand tokens ─────────────────────────────────────────────── */
const BRAND = {
  headerDark: "#12110e",
  bgLight: "#f4efe6",
  bgDark: "#0f0e0c",
  textLight: "#12110e",
  textDark: "#f4efe6",
  accent: "#FFD33D",       // construction yellow
  buttonText: "#12110e",
  buttonColor: "#FFD33D",
} as const;

type WebApp = NonNullable<NonNullable<Window["Telegram"]>["WebApp"]>;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          start_param?: string;
          user?: { id?: number; username?: string; first_name?: string };
        };
        colorScheme?: "light" | "dark";
        themeParams?: Record<string, string>;
        ready: () => void;
        expand?: () => void;
        close?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        enableClosingConfirmation?: () => void;
        disableVerticalSwipes?: () => void;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        BackButton?: {
          isVisible?: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick?: (cb: () => void) => void;
        };
        MainButton?: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick?: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }) => void;
        };
        SecondaryButton?: {
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick?: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          setParams: (params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
            position?: "left" | "right" | "top" | "bottom";
          }) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        showAlert?: (message: string, callback?: () => void) => void;
        showConfirm?: (message: string, callback?: (ok: boolean) => void) => void;
        showPopup?: (params: {
          title?: string;
          message: string;
          buttons?: Array<{ id?: string; type?: "default" | "ok" | "close" | "cancel" | "destructive"; text: string }>;
        }, callback?: (id: string) => void) => void;
      };
    };
  }
}

function launchHint() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.has("tgWebAppData") || hash.has("tgWebAppData") || Boolean(window.Telegram?.WebApp);
}

function loadScript() {
  return new Promise<void>((resolve) => {
    if (window.Telegram?.WebApp) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-bultum-tg]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.dataset.bultumTg = "1";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/** Apply BULTUM brand theme + CSS variables for the rest of the app */
function applyTheme(app: WebApp) {
  const isDark = app.colorScheme === "dark";
  const header = BRAND.headerDark;
  const bg = isDark ? BRAND.bgDark : BRAND.bgLight;

  try {
    app.setHeaderColor?.(header);
    app.setBackgroundColor?.(bg);
  } catch {
    /* older clients */
  }

  // Expose Telegram theme + safe areas to CSS
  const root = document.documentElement;
  root.style.setProperty("--tg-bg", bg);
  root.style.setProperty("--tg-header", header);
  root.style.setProperty("--tg-accent", BRAND.accent);
  root.style.setProperty("--tg-text", isDark ? BRAND.textDark : BRAND.textLight);
  root.dataset.tgTheme = isDark ? "dark" : "light";

  // Safe-area helpers (Telegram injects these on many clients)
  const tp = app.themeParams ?? {};
  if (tp.bg_color) root.style.setProperty("--tg-theme-bg-color", tp.bg_color);
  if (tp.text_color) root.style.setProperty("--tg-theme-text-color", tp.text_color);
  if (tp.button_color) root.style.setProperty("--tg-theme-button-color", tp.button_color);
  if (tp.button_text_color) root.style.setProperty("--tg-theme-button-text-color", tp.button_text_color);
}

export function readTelegramResult(): TelegramAuthResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as TelegramAuthResult) : null;
  } catch {
    return null;
  }
}

export function TelegramBridge({ locale }: { locale: Locale }) {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const onBack = () => window.history.back();
    let app: WebApp | undefined;

    const run = async () => {
      if (!launchHint() && !window.Telegram?.WebApp) return;
      await loadScript();
      if (cancelled) return;
      app = window.Telegram?.WebApp;
      if (!app) return;

      try {
        app.ready();
        app.expand?.();
        applyTheme(app);

        // Optional: prevent accidental close while filling sell form
        // app.enableClosingConfirmation?.();

        if (window.history.length > 1) {
          app.BackButton?.show();
          app.BackButton?.onClick(onBack);
        }

        // Deep-link: t.me/YourBot?startapp=l_listingId
        const start = app.initDataUnsafe?.start_param;
        if (typeof start === "string" && /^l_[a-z0-9-]{4,80}$/.test(start)) {
          const key = "bultum-start";
          if (sessionStorage.getItem(key) !== start) {
            sessionStorage.setItem(key, start);
            void navigate({
              to: "/$locale/l/$listingId",
              params: { locale, listingId: start.slice(2) },
            });
          }
        }
      } catch {
        /* Optional Telegram APIs differ by client */
      }

      if (!app.initData) return;
      try {
        const result = await checkTelegramLaunch({ data: { initData: app.initData } });
        if (!cancelled) sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
        if (result.ok) {
          const username = app.initDataUnsafe?.user?.username;
          void linkTelegramIdentity({
            data: {
              telegramUserId: result.telegramUserId,
              ...(typeof username === "string" ? { username } : {}),
            },
          }).catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          sessionStorage.setItem(RESULT_KEY, JSON.stringify({ ok: false, code: "malformed" }));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      app?.BackButton?.offClick?.(onBack);
      app?.BackButton?.hide();
    };
  }, [locale, navigate]);

  return null;
}

/* ─── MainButton hook (polished) ──────────────────────────────── */

type MainButtonOptions = {
  label: string;
  onPress: () => void | Promise<void>;
  /** When false the button is visible but disabled */
  enabled?: boolean;
  /** Show spinner on the button */
  progress?: boolean;
  /** Override brand colors if needed */
  color?: string;
  textColor?: string;
};

export function useTelegramMainButton({
  label,
  onPress,
  enabled = true,
  progress = false,
  color = BRAND.buttonColor,
  textColor = BRAND.buttonText,
}: MainButtonOptions) {
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  const stablePress = useCallback(() => {
    void pressRef.current();
  }, []);

  useEffect(() => {
    const button = window.Telegram?.WebApp?.MainButton;
    if (!button) return;

    button.setParams({
      text: label,
      color,
      text_color: textColor,
      is_active: enabled && !progress,
      is_visible: true,
    });

    if (progress) button.showProgress(true);
    else button.hideProgress();

    button.onClick(stablePress);
    button.show();

    return () => {
      button.offClick?.(stablePress);
      button.hideProgress();
      button.hide();
    };
  }, [label, enabled, progress, color, textColor, stablePress]);
}

/* ─── SecondaryButton helper ──────────────────────────────────── */

export function useTelegramSecondaryButton(
  label: string,
  onPress: () => void,
  position: "left" | "right" = "left",
) {
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  const stablePress = useCallback(() => {
    pressRef.current();
  }, []);

  useEffect(() => {
    const button = window.Telegram?.WebApp?.SecondaryButton;
    if (!button) return;

    button.setParams({
      text: label,
      position,
      is_visible: true,
      is_active: true,
    });
    button.onClick(stablePress);
    button.show();

    return () => {
      button.offClick?.(stablePress);
      button.hide();
    };
  }, [label, position, stablePress]);
}

/* ─── Haptic helpers ──────────────────────────────────────────── */

export function tgHaptic(type: "success" | "error" | "warning" | "light" | "medium" | "heavy" = "medium") {
  const hf = window.Telegram?.WebApp?.HapticFeedback;
  if (!hf) return;
  if (type === "success" || type === "error" || type === "warning") {
    hf.notificationOccurred(type);
  } else {
    hf.impactOccurred(type);
  }
}

/* ─── Share helper (unchanged) ────────────────────────────────── */

export function telegramShareUrl(url: string, text: string) {
  return `https://t.me/share/url?url=\( {encodeURIComponent(url)}&text= \){encodeURIComponent(text)}`;
}

/** Open a t.me link inside Telegram if possible */
export function openTelegramLink(url: string) {
  const app = window.Telegram?.WebApp;
  if (app?.openTelegramLink) {
    app.openTelegramLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

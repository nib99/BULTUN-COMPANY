import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";
import { checkTelegramLaunch, linkTelegramIdentity, type TelegramAuthResult } from "@/lib/telegram/api";

const RESULT_KEY = "bultum-tg-result";

type WebApp = NonNullable<NonNullable<Window["Telegram"]>["WebApp"]>;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { start_param?: string; user?: { username?: string } };
        ready: () => void;
        expand?: () => void;
        themeParams?: { bg_color?: string; text_color?: string };
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick?: (cb: () => void) => void;
        };
        openTelegramLink?: (url: string) => void;
        MainButton?: {
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick?: (cb: () => void) => void;
        };
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
        app.setHeaderColor?.("#12110e");
        app.setBackgroundColor?.("#f4efe6");
        if (window.history.length > 1) {
          app.BackButton?.show();
          app.BackButton?.onClick(onBack);
        }
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
        /* Optional Telegram APIs differ by client. */
      }
      if (!app.initData) return;
      try {
        const result = await checkTelegramLaunch({ data: { initData: app.initData } });
        if (!cancelled) sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
        if (result.ok) {
          const username = app.initDataUnsafe?.user?.username;
          void linkTelegramIdentity({ data: { telegramUserId: result.telegramUserId, ...(typeof username === "string" ? { username } : {}) } }).catch(() => undefined);
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

export function useTelegramMainButton(label: string, onPress: () => void) {
  useEffect(() => {
    const button = window.Telegram?.WebApp?.MainButton;
    if (!button) return;
    button.setText(label);
    button.onClick(onPress);
    button.show();
    return () => {
      button.offClick?.(onPress);
      button.hide();
    };
  }, [label, onPress]);
}

export function telegramShareUrl(url: string, text: string) {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

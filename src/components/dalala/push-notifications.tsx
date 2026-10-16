import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { savePushSubscription, removePushSubscription } from "@/lib/notifications";
import { btnGhost, btnPrimary } from "./chrome";
import { dict, type Locale } from "@/lib/i18n";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotifications({ locale = "en" }: { locale?: Locale }) {
  const copy = dict(locale);
  const [state, setState] = useState<"idle" | "working" | "enabled" | "blocked" | "unsupported">("idle");
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !vapidKey) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") setState("blocked");
    void navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) setState("enabled");
    }).catch(() => undefined);
  }, [vapidKey]);

  async function enable() {
    if (!vapidKey) return;
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("subscription_failed");
      await savePushSubscription({ data: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } });
      setState("enabled");
    } catch {
      setState("idle");
    }
  }

  async function disable() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription({ data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("enabled");
    }
  }

  if (state === "unsupported") return <p className="text-sm text-muted">{copy.notifications.unavailable}</p>;
  if (state === "blocked") return <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">{copy.notifications.blocked}</div>;
  if (state === "enabled") return <div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 text-sm font-bold text-emerald"><CheckCircle2 className="size-4" /> {copy.notifications.enabled}</span><button type="button" className={btnGhost} onClick={() => void disable()}>{copy.notifications.disable}</button></div>;
  return <button type="button" disabled={state === "working"} className={btnPrimary} onClick={() => void enable()}>{state === "working" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BellRing className="mr-2 size-4" />}{state === "working" ? copy.notifications.enabling : copy.notifications.enable}</button>;
}

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { createReminder, deliverDueReminders, listReminders, requestReminderPermission, type ListingReminder } from "@/lib/reminders";
import { btnGhost } from "./chrome";

function defaultReminderValue() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setSeconds(0, 0);
  return value.toISOString().slice(0, 16);
}

export function ReminderButton({ locale: _locale, listingId, title, label, setLabel = "Set", updateLabel = "Update", hint = "Choose when BULTUM should remind you.", invalidText = "Choose a future time.", blockedText = "Notifications are blocked. Enable notifications for BULTUM in your browser settings.", successText = "Reminder set." }: { locale: Locale; listingId: string; title: string; label: string; setLabel?: string; updateLabel?: string; hint?: string; invalidText?: string; blockedText?: string; successText?: string }) {
  const [value, setValue] = useState(defaultReminderValue);
  const [note, setNote] = useState("");
  const [active, setActive] = useState<ListingReminder | null>(null);

  useEffect(() => {
    const refresh = () => {
      deliverDueReminders();
      setActive(listReminders().find((item) => item.listingId === listingId) ?? null);
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [listingId]);

  async function setReminder() {
    const at = new Date(value).getTime();
    if (!Number.isFinite(at) || at <= Date.now()) {
      setNote(invalidText);
      return;
    }
    const permission = await requestReminderPermission();
    if (permission === "denied") {
      setNote(blockedText);
      return;
    }
    const reminder = createReminder(listingId, title, at);
    setActive(reminder);
    setNote(successText);
  }

  return (
    <div className="space-y-2 rounded-2xl border border-line-soft bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{label}</p>
          {active ? <p className="text-xs text-muted">{new Date(active.at).toLocaleString()}</p> : <p className="text-xs text-muted">{hint}</p>}
        </div>
        <button type="button" className={btnGhost} onClick={() => void setReminder()}>{active ? updateLabel : setLabel}</button>
      </div>
      <input aria-label={label} type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-soft bg-ivory px-3" />
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  );
}

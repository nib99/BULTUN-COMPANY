export type ListingReminder = {
  id: string;
  listingId: string;
  title: string;
  at: number;
};

const KEY = "bultum-listing-reminders";

function read(): ListingReminder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is ListingReminder => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      return typeof value.id === "string" && typeof value.listingId === "string" && typeof value.title === "string" && typeof value.at === "number";
    });
  } catch {
    return [];
  }
}

function write(items: ListingReminder[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listReminders() {
  return read().sort((a, b) => a.at - b.at);
}

export function removeReminder(id: string) {
  write(read().filter((item) => item.id !== id));
}

export function createReminder(listingId: string, title: string, at: number) {
  const reminder: ListingReminder = {
    id: `${listingId}-${at}`,
    listingId,
    title,
    at,
  };
  const next = read().filter((item) => item.listingId !== listingId);
  next.push(reminder);
  write(next);
  return reminder;
}

export async function requestReminderPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
}

export function showReminderNotification(title: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  new Notification("BULTUM COMPANY", {
    body: title,
    icon: "/bultum-icon-192.png",
    badge: "/bultum-icon-192.png",
    tag: "bultum-reminder",
  });
  return true;
}

export function deliverDueReminders(onDue?: (reminder: ListingReminder) => void) {
  const now = Date.now();
  const due = read().filter((item) => item.at <= now);
  if (!due.length) return [];
  const dueIds = new Set(due.map((item) => item.id));
  write(read().filter((item) => !dueIds.has(item.id)));
  for (const reminder of due) {
    showReminderNotification(`Reminder: ${reminder.title}`);
    onDue?.(reminder);
  }
  return due;
}

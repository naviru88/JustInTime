import { Capacitor } from "@capacitor/core";

const isNative = () => Capacitor.isNativePlatform();

// Local notification IDs must be 32-bit integers, and stable per pantry item
// so re-scheduling can cleanly replace a prior reminder for the same item
// instead of piling up duplicates.
const idForItem = (itemId) => {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
};

const reminderText = (item) => {
  const days = item.daysUntilExpiry;
  const status =
    days === null || days === undefined
      ? "is coming up on its estimated shelf life"
      : days < 0
        ? "has expired"
        : days === 0
          ? "expires today"
          : `expires in ${days} day${days === 1 ? "" : "s"}`;
  return `${item.name} ${status}.`;
};

export const requestPermission = async () => {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

export const hasPermission = async () => {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted";
  }
  return "Notification" in window && Notification.permission === "granted";
};

// Re-derives the whole reminder schedule from the current pantry + settings
// every time it's called, rather than trying to incrementally patch a stale
// schedule as items get added/edited/removed — simpler and can't drift.
export const syncReminders = async (items, daysBefore) => {
  if (isNative()) return syncNative(items, daysBefore);
  return syncWeb(items, daysBefore);
};

// --- Native (Capacitor): real OS-scheduled notifications, fire even if the
// app is closed. ---
const syncNative = async (items, daysBefore) => {
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }

  const toSchedule = items
    .filter((item) => item.expiryDate)
    .map((item) => {
      const reminderAt = new Date(item.expiryDate);
      reminderAt.setDate(reminderAt.getDate() - daysBefore);
      reminderAt.setHours(9, 0, 0, 0);
      // Already due (or overdue) — fire shortly after sync instead of
      // scheduling in the past, which the OS just silently drops.
      if (reminderAt.getTime() <= Date.now()) {
        reminderAt.setTime(Date.now() + 5000);
      }
      return {
        id: idForItem(item._id),
        title: "Use it soon",
        body: reminderText(item),
        schedule: { at: reminderAt },
      };
    });

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
};

// --- Web: no push server, so there's no real background scheduling here.
// Instead, check whenever the pantry loads/changes and fire an immediate
// notification for anything newly within the reminder window — deduped per
// item per day via localStorage so it doesn't repeat on every reload. ---
const NOTIFIED_KEY = "jit_notified_today";

const loadNotifiedLog = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY)) || {};
  } catch {
    return {};
  }
};

const syncWeb = (items, daysBefore) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const today = new Date().toISOString().slice(0, 10);
  const log = loadNotifiedLog();
  const notifiedIds = log.date === today ? log.ids || [] : [];

  const due = items.filter(
    (item) =>
      item.expiryDate &&
      item.daysUntilExpiry !== null &&
      item.daysUntilExpiry !== undefined &&
      item.daysUntilExpiry <= daysBefore &&
      !notifiedIds.includes(item._id)
  );

  due.forEach((item) => {
    new Notification("Use it soon", { body: reminderText(item), tag: `jit-${item._id}` });
    notifiedIds.push(item._id);
  });

  if (due.length > 0) {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify({ date: today, ids: notifiedIds }));
  }
};

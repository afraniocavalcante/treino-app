import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

let permissionAsked = false;

async function ensurePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (!permissionAsked) {
    permissionAsked = true;
    const current = await LocalNotifications.checkPermissions();
    if (current.display !== "granted") await LocalNotifications.requestPermissions();
  }
  const status = await LocalNotifications.checkPermissions();
  return status.display === "granted";
}

const REST_TIMER_NOTIFICATION_ID = 9001;

/** Fires only if the app is backgrounded before `seconds` elapse — a foreground finish clears it via cancelRestTimerNotification. */
export async function scheduleRestTimerNotification(seconds: number, exerciseName: string): Promise<void> {
  if (!(await ensurePermission())) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REST_TIMER_NOTIFICATION_ID,
        title: "Descanso acabou 💪",
        body: `Hora da próxima série: ${exerciseName}`,
        schedule: { at: new Date(Date.now() + seconds * 1000) },
      },
    ],
  });
}

export async function cancelRestTimerNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: REST_TIMER_NOTIFICATION_ID }] });
}

const MEAL_REMINDER_BASE_ID = 9100;
const MEAL_REMINDER_TIMES: { key: string; label: string; hour: number; minute: number }[] = [
  { key: "cafe", label: "Café da manhã", hour: 7, minute: 30 },
  { key: "almoco", label: "Almoço", hour: 12, minute: 0 },
  { key: "lanche", label: "Lanche da tarde", hour: 16, minute: 0 },
  { key: "jantar", label: "Jantar", hour: 19, minute: 30 },
];

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function enableMealReminders(): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await LocalNotifications.schedule({
    notifications: MEAL_REMINDER_TIMES.map((m, i) => ({
      id: MEAL_REMINDER_BASE_ID + i,
      title: "Hora de comer 🍽️",
      body: m.label,
      schedule: { on: { hour: m.hour, minute: m.minute }, allowWhileIdle: true },
    })),
  });
  return true;
}

export async function disableMealReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({
    notifications: MEAL_REMINDER_TIMES.map((_, i) => ({ id: MEAL_REMINDER_BASE_ID + i })),
  });
}

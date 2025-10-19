import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export async function initFcmAndGetToken(): Promise<string | null> {
  try {
    if (!(await isSupported())) return null;
    if (!getApps().length) initializeApp(firebaseConfig);
    const messaging = getMessaging();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey: vapidKey || undefined });
    return token || null;
  } catch {
    return null;
  }
}
export function onInAppMessage(cb: (payload: any) => void) {
  if (!("Notification" in window)) return;
  try {
    const messaging = getMessaging();
    onMessage(messaging, cb);
  } catch {}
}

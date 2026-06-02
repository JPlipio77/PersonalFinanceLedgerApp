import { useState, useEffect } from 'react';
import { subscribePush, unsubscribePush } from '../api/notificationsApi';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64) => {
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export function usePushNotification() {
  const [permission,   setPermission]   = useState(Notification.permission);
  const [subscribed,   setSubscribed]   = useState(false);
  const [subscribing,  setSubscribing]  = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async (sw) => {
        const sub = await sw.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set — push disabled');
      return;
    }
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const sw  = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await subscribePush(sub.toJSON());
      setSubscribed(true);
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    const sw  = await navigator.serviceWorker.ready;
    const sub = await sw.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await unsubscribePush();
    setSubscribed(false);
  };

  return { permission, subscribed, subscribing, subscribe, unsubscribe };
}

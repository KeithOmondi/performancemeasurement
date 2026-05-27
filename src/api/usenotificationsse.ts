import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { pushNotification, type INotification } from "../store/slices/notificationslice";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const MAX_BACKOFF_MS = 30_000;

export const useNotificationSSE = (): void => {
  const dispatch = useAppDispatch();

  // Your auth slice has no token — it uses HttpOnly cookies.
  // We use user presence to know whether we're authenticated.
  // The cookie is sent automatically via withCredentials on the EventSource.
  const userId = useAppSelector((state) => state.auth.user?.id);

  const esRef = useRef<EventSource | null>(null);
  const retryMs = useRef(1_000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    // Not logged in — don't open a connection
    if (!userId) return;

    const connect = () => {
      // withCredentials sends the HttpOnly auth cookie automatically.
      // No token needed in the URL.
      const url = `${BASE_URL}/notifications/stream`;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        retryMs.current = 1_000; // reset back-off on successful connect
      };

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const notif: INotification = JSON.parse(event.data);
          dispatch(pushNotification(notif));
        } catch {
          // Malformed event — ignore
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;

        // Exponential back-off before reconnect
        retryTimer.current = setTimeout(() => {
          retryMs.current = Math.min(retryMs.current * 2, MAX_BACKOFF_MS);
          connect();
        }, retryMs.current);
      };
    };

    connect();

    // After 500ms the initial flush is done; subsequent events are real-time pushes.
    const hydrateTimeout = setTimeout(() => {
      hydrated.current = true;
    }, 500);

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      clearTimeout(hydrateTimeout);
    };
  }, [userId, dispatch]); // re-runs on login/logout
};
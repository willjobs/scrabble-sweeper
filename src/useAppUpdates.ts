import { useCallback, useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function useAppUpdates() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const requestedReload = useRef(false);
  const [activated, setActivated] = useState(false);
  const [loadFailure, setLoadFailure] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: false,
    onRegisteredSW(_url, value) {
      registration.current = value;
    },
    onNeedReload() {
      // Another tab updating must not discard this player's unsubmitted tiles.
      if (requestedReload.current) window.location.reload();
      else setActivated(true);
    },
  });
  const check = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("Offline. Updates will be checked when you reconnect.");
      return;
    }
    if (!registration.current) {
      setStatus("Refresh the app to check for the latest version.");
      return;
    }
    setChecking(true);
    try {
      await registration.current.update();
      setStatus("Update check complete.");
    } catch {
      setStatus("Couldn't check for updates. Try again when connected.");
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const failed = (event: Event) => {
      event.preventDefault();
      setLoadFailure(true);
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", check);
    window.addEventListener("vite:preloadError", failed);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", check);
      window.removeEventListener("vite:preloadError", failed);
    };
  }, [check]);
  const reload = async () => {
    if (activated) {
      window.location.reload();
      return;
    }
    if (needRefresh && registration.current?.waiting) {
      requestedReload.current = true;
      await updateServiceWorker(true);
    } else await window.tileTheoryReload();
  };
  return {
    available: needRefresh || activated,
    loadFailure,
    checking,
    status,
    check,
    reload,
  };
}

import { lazy } from "react";

const CHUNK_RELOAD_KEY_PREFIX = "lazy-retry:";

export const isChunkLoadError = (error) => {
  const message = error?.message || "";
  return /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    message
  );
};

export const triggerChunkReloadOnce = (error, storageKey = "chunk") => {
  if (typeof window === "undefined" || !isChunkLoadError(error)) {
    return false;
  }

  const retryKey = `${CHUNK_RELOAD_KEY_PREFIX}${storageKey}`;
  const hasRetried = window.sessionStorage.getItem(retryKey);
  if (hasRetried) {
    return false;
  }

  window.sessionStorage.setItem(retryKey, "1");
  window.location.reload();
  return true;
};

export const clearChunkReloadFlag = (storageKey = "chunk") => {
  if (typeof window === "undefined") {
    return;
  }

  const retryKey = `${CHUNK_RELOAD_KEY_PREFIX}${storageKey}`;
  window.sessionStorage.removeItem(retryKey);
};

export const lazyWithRecovery = (importer, storageKey) =>
  lazy(async () => {
    try {
      const module = await importer();
      clearChunkReloadFlag(storageKey);
      return module;
    } catch (error) {
      if (triggerChunkReloadOnce(error, storageKey)) {
        return new Promise(() => {});
      }
      throw error;
    }
  });

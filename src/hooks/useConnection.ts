import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { BbsEntry, ConnectionState } from "../types";

export function useConnection() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [activeBbs, setActiveBbs] = useState<BbsEntry | null>(null);

  useEffect(() => {
    const unlisten = listen<{ status: string; message?: string }>(
      "connection-status",
      (event) => {
        setConnectionState(event.payload.status as ConnectionState);
        if (event.payload.message) {
          setStatusMessage(event.payload.message);
        }
      }
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const connect = useCallback(async (bbs: BbsEntry) => {
    setConnectionState("connecting");
    setActiveBbs(bbs);
    setStatusMessage(`Connecting to ${bbs.host}:${bbs.port}...`);
    try {
      await invoke("connect", {
        host: bbs.host,
        port: bbs.port,
        encoding: bbs.encoding,
        protocol: bbs.protocol,
        username: bbs.username ?? null,
      });
    } catch (e) {
      setConnectionState("error");
      setStatusMessage(String(e));
    }
  }, []);

  const disconnect = useCallback(async () => {
    await invoke("disconnect");
    setActiveBbs(null);
  }, []);

  return { connectionState, statusMessage, activeBbs, connect, disconnect };
}

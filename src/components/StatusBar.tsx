import { useEffect, useState } from "react";
import { ConnectionState, BbsEntry } from "../types";

interface StatusBarProps {
  connectionState: ConnectionState;
  statusMessage: string;
  activeBbs: BbsEntry | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function StatusBar({
  connectionState,
  statusMessage,
  activeBbs,
}: StatusBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (connectionState !== "connected") {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionState]);

  return (
    <div className="status-bar" role="status" aria-live="polite">
      <div className="status-bar__field">
        <span className="status-bar__field-label">PROTO</span>
        <span className="status-bar__field-value">
          {activeBbs?.protocol?.toUpperCase() || "—"}
        </span>
      </div>

      <div className="status-bar__divider" aria-hidden="true" />

      <div className="status-bar__field">
        <span className="status-bar__field-label">ENC</span>
        <span className="status-bar__field-value">
          {activeBbs?.encoding?.toUpperCase() || "—"}
        </span>
      </div>

      <div className="status-bar__divider" aria-hidden="true" />

      <div className="status-bar__field">
        <span className="status-bar__field-label">HOST</span>
        <span className="status-bar__field-value">
          {activeBbs ? `${activeBbs.host}:${activeBbs.port}` : "—"}
        </span>
      </div>

      <div className="status-bar__divider" aria-hidden="true" />

      <div className="status-bar__field">
        <span className="status-bar__field-label">UPTIME</span>
        <span
          className={`status-bar__field-value ${
            connectionState === "connected" ? "status-bar__field-value--bright" : ""
          }`}
        >
          {connectionState === "connected" ? formatDuration(elapsed) : "—"}
        </span>
      </div>

      <div className="status-bar__spacer" />

      {statusMessage && (
        <span className="status-bar__message">{statusMessage}</span>
      )}
    </div>
  );
}

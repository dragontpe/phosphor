import { ConnectionState, BbsEntry } from "../types";

interface TitleBarProps {
  connectionState: ConnectionState;
  activeBbs: BbsEntry | null;
  onDisconnect: () => void;
  smoothScroll: boolean;
  onToggleSmoothScroll: () => void;
  capturing: boolean;
  onToggleCapture: () => void;
}

function ledClass(state: ConnectionState): string {
  switch (state) {
    case "connected":
      return "title-bar__led--on";
    case "connecting":
      return "title-bar__led--warn";
    case "error":
      return "title-bar__led--err";
    default:
      return "";
  }
}

function ledLabel(state: ConnectionState): string {
  switch (state) {
    case "connected":
      return "ONLINE";
    case "connecting":
      return "DIAL";
    case "error":
      return "ERROR";
    case "disconnected":
      return "OFFLINE";
    default:
      return "READY";
  }
}

export function TitleBar({
  connectionState,
  activeBbs,
  onDisconnect,
  smoothScroll,
  onToggleSmoothScroll,
  capturing,
  onToggleCapture,
}: TitleBarProps) {
  const canCapture = connectionState === "connected";

  return (
    <div className="title-bar">
      <div className="title-bar__brand">
        <div className="title-bar__logo" aria-hidden="true">
          P
        </div>
        <div>
          <div className="title-bar__name">PHOSPHOR</div>
        </div>
      </div>

      <div className="title-bar__divider" />

      <span className="title-bar__tag">BBS Terminal</span>

      <div className="title-bar__indicators">
        <button
          className={`title-bar__btn title-bar__btn--toggle${
            smoothScroll ? " is-on" : ""
          }`}
          onClick={onToggleSmoothScroll}
          aria-pressed={smoothScroll}
          title="Smooth scroll when paging through scrollback"
        >
          SMOOTH
        </button>

        <button
          className={`title-bar__btn title-bar__btn--toggle${
            capturing ? " is-rec" : ""
          }`}
          onClick={onToggleCapture}
          disabled={!canCapture && !capturing}
          aria-pressed={capturing}
          title={
            capturing
              ? "Stop capture and save session to .ans file"
              : "Record incoming session bytes to a .ans file"
          }
        >
          {capturing ? "● REC" : "○ REC"}
        </button>

        {activeBbs && connectionState === "connected" && (
          <span className="title-bar__tag" title={`${activeBbs.host}:${activeBbs.port}`}>
            {activeBbs.name}
          </span>
        )}

        <div className={`title-bar__led ${ledClass(connectionState)}`}>
          <span className="title-bar__led-dot" />
          <span>{ledLabel(connectionState)}</span>
        </div>

        {connectionState === "connected" && (
          <button
            className="title-bar__btn"
            onClick={onDisconnect}
            aria-label="Hang up the connection"
          >
            HANGUP
          </button>
        )}
      </div>
    </div>
  );
}

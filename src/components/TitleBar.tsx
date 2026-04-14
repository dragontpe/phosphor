import { ConnectionState, BbsEntry } from "../types";

interface TitleBarProps {
  connectionState: ConnectionState;
  activeBbs: BbsEntry | null;
  onDisconnect: () => void;
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
}: TitleBarProps) {
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

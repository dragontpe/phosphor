export interface BbsEntry {
  id: string;
  name: string;
  host: string;
  port: number;
  encoding: "utf8" | "big5";
  protocol: "telnet" | "ssh";
  username?: string;
  description?: string;
  category?: string;
  isCustom?: boolean;
}

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

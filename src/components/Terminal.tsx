import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const xterm = new XTerm({
      fontFamily:
        '"JetBrains Mono", "Cascadia Code", "Fira Code", "SF Mono", "Menlo", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0.5,
      theme: {
        background: "#050a07",
        foreground: "#33ff66",
        cursor: "#66ff99",
        cursorAccent: "#050a07",
        selectionBackground: "#33ff6640",
        selectionForeground: "#ffffff",
        black: "#050a07",
        red: "#ff4d4d",
        green: "#33ff66",
        yellow: "#ffb000",
        blue: "#5599ff",
        magenta: "#ff66cc",
        cyan: "#66ffcc",
        white: "#ccffdd",
        brightBlack: "#1a4028",
        brightRed: "#ff7777",
        brightGreen: "#66ff99",
        brightYellow: "#ffcc44",
        brightBlue: "#88bbff",
        brightMagenta: "#ff99dd",
        brightCyan: "#99ffdd",
        brightWhite: "#ffffff",
      },
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;

    // Welcome message
    xterm.writeln("");
    xterm.writeln("  \x1b[1;32m┌──────────────────────────────────────────────┐\x1b[0m");
    xterm.writeln("  \x1b[1;32m│\x1b[0m  \x1b[1;32mPHOSPHOR\x1b[0m  \x1b[2;32m//\x1b[0m  \x1b[0;32mThe MacOS BBS Client\x1b[0m       \x1b[1;32m│\x1b[0m");
    xterm.writeln("  \x1b[1;32m└──────────────────────────────────────────────┘\x1b[0m");
    xterm.writeln("");
    xterm.writeln("  \x1b[2;32mSelect a BBS from the phonebook to begin.\x1b[0m");
    xterm.writeln("");

    // Forward keystrokes to Rust
    xterm.onData((data: string) => {
      const bytes = Array.from(new TextEncoder().encode(data));
      invoke("send_input", { data: bytes });
    });

    // Receive bytes from Rust
    const unlistenData = listen<{ data: number[] }>(
      "terminal-data",
      (event) => {
        const bytes = new Uint8Array(event.payload.data);
        xterm.write(bytes);
      }
    );

    // Clear terminal on new connection
    const unlistenStatus = listen<{ status: string }>(
      "connection-status",
      (event) => {
        if (event.payload.status === "connected") {
          xterm.clear();
          xterm.reset();
        }
      }
    );

    // Resize
    const ro = new ResizeObserver(() => {
      fitAddon.fit();
      if (xterm.cols && xterm.rows) {
        invoke("resize_terminal", {
          cols: xterm.cols,
          rows: xterm.rows,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      unlistenData.then((fn) => fn());
      unlistenStatus.then((fn) => fn());
      ro.disconnect();
      xterm.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminal-container" />;
}

# Phosphor

A modern macOS BBS terminal client. Built with Tauri v2 and Rust. Designed for
people who still want to dial into bulletin board systems but would rather not
fight with SyncTERM in a Wine bottle.

![Phosphor screenshot](docs/screenshot.png)

## What it is

Phosphor is a native macOS app for connecting to telnet and SSH-based bulletin
board systems. It speaks proper telnet (TTYPE, NAWS, ECHO, SGA, BINARY)
negotiation, supports both UTF-8 and Big5 encoding, and renders ANSI art with
the kind of CRT phosphor glow that hasn't been popular since 1994.

It comes with a curated phonebook of active BBSes — Black Flag, Level 29,
Vertrauen, PTT, and a handful of others — plus the ability to add your own.

## Features

- **Telnet & SSH** — both protocols, real negotiation
- **Encoding** — UTF-8 and Big5 (PTT works in full Chinese)
- **Phonebook** — curated default list + your own custom entries (persisted)
- **Favorites** — star the BBSes you actually use
- **CRT aesthetic** — phosphor green palette, scanlines, vignette, subtle glow
- **Hardware-readout status bar** — protocol, encoding, host, live uptime

## Install

### Download

Grab the latest `.dmg` from the
[releases page](https://github.com/dragontpe/phosphor/releases).

Drag `Phosphor.app` to `/Applications`. macOS will warn that the app is from an
unidentified developer (it is — I haven't paid Apple $99 for a Developer ID).
Right-click the app → Open → Open. macOS will remember that choice.

### Build from source

Requires Rust, Node, and Tauri's macOS prerequisites.

```sh
git clone https://github.com/dragontpe/phosphor.git
cd phosphor
npm install
npm run tauri build
```

The bundled app appears in `src-tauri/target/release/bundle/macos/`.

For development:

```sh
npm run tauri dev
```

## The Phosphor BBS

Phosphor ships with **Phosphor BBS** in its phonebook by default — a small
public BBS hosted at `136.117.127.123:8888`. It runs my own
[Rust BBS server](https://github.com/dragontpe/phosphor-bbs) and serves as the
client's home base. Anyone can register an account and post on the message
wall.

It's also the place to ask questions about Phosphor or report bugs informally.

## Acknowledgements

This is **not** the only or first macOS BBS client — SyncTERM, NetRunner, and
others have been around for years. Phosphor is just my take on what one could
look like if it was built today, native, and didn't try to emulate every BBS
protocol from the last 40 years.

The artscene preserved by [16colo.rs](https://16colo.rs) and Jason Scott's
[textfiles.com](https://textfiles.com) made this whole project worth doing.

## Tech

- **Tauri v2** — desktop wrapper
- **React + TypeScript** — UI
- **xterm.js** — terminal rendering
- **Rust + tokio** — connection handling, telnet state machine
- **russh** — SSH client (used for PTT and other modern BBSes)
- **encoding_rs** — streaming Big5 decoder

## License

MIT

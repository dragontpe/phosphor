use crate::ssh;
use crate::telnet;
use crate::SharedState;
use russh::ChannelMsg;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

pub enum ConnectionKind {
    Telnet,
    Ssh,
}

pub struct ActiveConnection {
    pub kind: ConnectionKind,
    pub tx: mpsc::UnboundedSender<Vec<u8>>,
    pub abort: tokio::task::AbortHandle,
}

#[derive(Default)]
pub struct AppState {
    pub connection: Option<ActiveConnection>,
}

#[derive(Clone, Serialize)]
struct TerminalDataEvent {
    data: Vec<u8>,
}

#[derive(Clone, Serialize)]
struct ConnectionStatusEvent {
    status: String,
    message: Option<String>,
}

/// Streaming Big5 decoder using encoding_rs::Decoder.
/// Maintains state across TCP chunks to handle split multi-byte characters.
/// ANSI escape sequences (all ASCII-range bytes) pass through Big5 decoding unaffected
/// since Big5 lead bytes are 0x81-0xFE and never overlap with ASCII 0x00-0x7F.
struct StreamDecoder {
    decoder: Option<encoding_rs::Decoder>,
}

impl StreamDecoder {
    fn new(encoding: &str) -> Self {
        let decoder = if encoding == "big5" {
            Some(encoding_rs::BIG5.new_decoder())
        } else {
            None
        };
        StreamDecoder { decoder }
    }

    fn decode(&mut self, data: &[u8]) -> Vec<u8> {
        match self.decoder.as_mut() {
            Some(decoder) => {
                // encoding_rs needs output buffer large enough
                // Max expansion: each byte could become up to 3 UTF-8 bytes + replacement chars
                let max_len = decoder
                    .max_utf8_buffer_length(data.len())
                    .unwrap_or(data.len() * 4);
                let mut output = String::with_capacity(max_len);
                let mut total_read = 0;

                loop {
                    let (result, read, _had_errors) = decoder.decode_to_string(
                        &data[total_read..],
                        &mut output,
                        false, // not last -- stream continues
                    );
                    total_read += read;

                    match result {
                        encoding_rs::CoderResult::InputEmpty => break,
                        encoding_rs::CoderResult::OutputFull => {
                            output.reserve(max_len);
                        }
                    }
                }

                output.into_bytes()
            }
            None => data.to_vec(),
        }
    }
}

#[tauri::command]
pub async fn connect(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    host: String,
    port: u16,
    encoding: String,
    protocol: String,
    username: Option<String>,
) -> Result<(), String> {
    // Disconnect existing connection first
    {
        let mut s = state.lock().await;
        if let Some(conn) = s.connection.take() {
            conn.abort.abort();
        }
    }

    if protocol == "ssh" {
        connect_ssh(app, state, host, port, encoding, username.unwrap_or_default()).await
    } else {
        let addr = format!("{}:{}", host, port);
        connect_telnet(app, state, addr, encoding).await
    }
}

async fn connect_telnet(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    addr: String,
    encoding: String,
) -> Result<(), String> {
    let stream = tokio::net::TcpStream::connect(&addr)
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    let (mut reader, mut writer) = tokio::io::split(stream);
    let (tx, mut rx) = mpsc::unbounded_channel::<Vec<u8>>();
    let tx_responses = tx.clone();

    let app_read = app.clone();
    let read_task = tokio::spawn(async move {
        let mut buf = vec![0u8; 4096];
        let mut decoder = StreamDecoder::new(&encoding);
        loop {
            match reader.read(&mut buf).await {
                Ok(0) => {
                    let _ = app_read.emit(
                        "connection-status",
                        ConnectionStatusEvent {
                            status: "disconnected".into(),
                            message: Some("Connection closed by remote".into()),
                        },
                    );
                    break;
                }
                Ok(n) => {
                    let (clean, responses) = telnet::process_telnet(&buf[..n]);

                    if !responses.is_empty() {
                        let _ = tx_responses.send(responses);
                    }

                    if !clean.is_empty() {
                        let decoded = decoder.decode(&clean);
                        let _ = app_read.emit(
                            "terminal-data",
                            TerminalDataEvent { data: decoded },
                        );
                    }
                }
                Err(e) => {
                    let _ = app_read.emit(
                        "connection-status",
                        ConnectionStatusEvent {
                            status: "error".into(),
                            message: Some(format!("Read error: {}", e)),
                        },
                    );
                    break;
                }
            }
        }
    });

    // Write loop
    tokio::spawn(async move {
        while let Some(bytes) = rx.recv().await {
            if writer.write_all(&bytes).await.is_err() {
                break;
            }
        }
    });

    {
        let mut s = state.lock().await;
        s.connection = Some(ActiveConnection {
            kind: ConnectionKind::Telnet,
            tx,
            abort: read_task.abort_handle(),
        });
    }

    let _ = app.emit(
        "connection-status",
        ConnectionStatusEvent {
            status: "connected".into(),
            message: Some(format!("Connected to {} (telnet)", addr)),
        },
    );

    Ok(())
}

async fn connect_ssh(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
    host: String,
    port: u16,
    encoding: String,
    username: String,
) -> Result<(), String> {
    let (_handle, mut channel) =
        ssh::connect_ssh(&host, port, &username).await?;

    let (write_tx, mut write_rx) = mpsc::unbounded_channel::<Vec<u8>>();

    let writer = channel.make_writer();
    tokio::spawn(async move {
        let mut writer = writer;
        while let Some(bytes) = write_rx.recv().await {
            if writer.write_all(&bytes).await.is_err() {
                break;
            }
            let _ = writer.flush().await;
        }
    });

    // Read loop with streaming decoder
    let app_read = app.clone();
    let read_task = tokio::spawn(async move {
        let mut decoder = StreamDecoder::new(&encoding);
        loop {
            match channel.wait().await {
                Some(ChannelMsg::Data { data }) => {
                    let decoded = decoder.decode(&data);
                    let _ = app_read.emit(
                        "terminal-data",
                        TerminalDataEvent { data: decoded },
                    );
                }
                Some(ChannelMsg::ExtendedData { data, .. }) => {
                    let decoded = decoder.decode(&data);
                    let _ = app_read.emit(
                        "terminal-data",
                        TerminalDataEvent { data: decoded },
                    );
                }
                Some(ChannelMsg::Eof | ChannelMsg::Close) | None => {
                    let _ = app_read.emit(
                        "connection-status",
                        ConnectionStatusEvent {
                            status: "disconnected".into(),
                            message: Some("SSH connection closed".into()),
                        },
                    );
                    break;
                }
                _ => {}
            }
        }
    });

    {
        let mut s = state.lock().await;
        s.connection = Some(ActiveConnection {
            kind: ConnectionKind::Ssh,
            tx: write_tx,
            abort: read_task.abort_handle(),
        });
    }

    let _ = app.emit(
        "connection-status",
        ConnectionStatusEvent {
            status: "connected".into(),
            message: Some(format!("Connected to {}:{} (ssh)", host, port)),
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn disconnect(
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<(), String> {
    let mut s = state.lock().await;
    if let Some(conn) = s.connection.take() {
        conn.abort.abort();
    }
    let _ = app.emit(
        "connection-status",
        ConnectionStatusEvent {
            status: "disconnected".into(),
            message: None,
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn send_input(
    state: tauri::State<'_, SharedState>,
    data: Vec<u8>,
) -> Result<(), String> {
    let s = state.lock().await;
    if let Some(ref conn) = s.connection {
        conn.tx
            .send(data)
            .map_err(|_| "Connection closed".to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn resize_terminal(
    _state: tauri::State<'_, SharedState>,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    // TODO: send window change for SSH channels
    Ok(())
}

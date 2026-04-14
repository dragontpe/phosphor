/// Telnet IAC (Interpret As Command) byte constants
const IAC: u8 = 255;
const WILL: u8 = 251;
const WONT: u8 = 252;
const DO: u8 = 253;
const DONT: u8 = 254;
const SB: u8 = 250;
const SE: u8 = 240;

/// Telnet option codes
const OPT_ECHO: u8 = 1;
const OPT_SGA: u8 = 3; // Suppress Go Ahead
const OPT_TTYPE: u8 = 24; // Terminal Type
const OPT_NAWS: u8 = 31; // Negotiate About Window Size
const OPT_BINARY: u8 = 0; // Binary Transmission

/// Strip telnet IAC sequences from raw TCP data.
/// Returns (clean_data, responses_to_send_back).
///
/// Accepts ECHO, SGA, TTYPE, NAWS, and BINARY. Refuses everything else.
/// Responds to TTYPE subnegotiation with "xterm-256color".
/// Sends NAWS (80x24) when window size is negotiated.
pub fn process_telnet(data: &[u8]) -> (Vec<u8>, Vec<u8>) {
    let mut clean = Vec::with_capacity(data.len());
    let mut responses = Vec::new();
    let mut i = 0;

    while i < data.len() {
        if data[i] == IAC {
            if i + 1 >= data.len() {
                // Incomplete IAC at end of buffer -- skip
                break;
            }

            match data[i + 1] {
                // Double IAC = literal 0xFF byte
                IAC => {
                    clean.push(0xFF);
                    i += 2;
                }
                // 3-byte sequences: IAC WILL/WONT/DO/DONT <option>
                WILL | WONT | DO | DONT => {
                    if i + 2 < data.len() {
                        let verb = data[i + 1];
                        let option = data[i + 2];

                        match (verb, option) {
                            // Server says WILL ECHO -- accept (server handles echo)
                            (WILL, OPT_ECHO) => {
                                responses.extend_from_slice(&[IAC, DO, OPT_ECHO]);
                            }
                            // Server says WILL SGA -- accept
                            (WILL, OPT_SGA) => {
                                responses.extend_from_slice(&[IAC, DO, OPT_SGA]);
                            }
                            // Server says DO TTYPE -- we will send terminal type
                            (DO, OPT_TTYPE) => {
                                responses.extend_from_slice(&[IAC, WILL, OPT_TTYPE]);
                            }
                            // Server says DO NAWS -- we will send window size
                            (DO, OPT_NAWS) => {
                                responses.extend_from_slice(&[IAC, WILL, OPT_NAWS]);
                                // Immediately send window size: 80x24
                                responses.extend_from_slice(&[
                                    IAC, SB, OPT_NAWS,
                                    0, 80, // width
                                    0, 24, // height
                                    IAC, SE,
                                ]);
                            }
                            // Server says DO BINARY -- accept
                            (DO, OPT_BINARY) => {
                                responses.extend_from_slice(&[IAC, WILL, OPT_BINARY]);
                            }
                            // Server says WILL BINARY -- accept
                            (WILL, OPT_BINARY) => {
                                responses.extend_from_slice(&[IAC, DO, OPT_BINARY]);
                            }
                            // Refuse everything else
                            (WILL, _) | (WONT, _) => {
                                responses.extend_from_slice(&[IAC, DONT, option]);
                            }
                            (DO, _) | (DONT, _) => {
                                responses.extend_from_slice(&[IAC, WONT, option]);
                            }
                            _ => {}
                        }
                        i += 3;
                    } else {
                        break;
                    }
                }
                // Subnegotiation: IAC SB ... IAC SE
                SB => {
                    i += 2;
                    let mut sb_data = Vec::new();
                    while i < data.len() {
                        if data[i] == IAC && i + 1 < data.len() && data[i + 1] == SE {
                            i += 2;
                            break;
                        }
                        sb_data.push(data[i]);
                        i += 1;
                    }

                    // Handle TTYPE subnegotiation (server asking: SB TTYPE SEND)
                    if !sb_data.is_empty() && sb_data[0] == OPT_TTYPE {
                        if sb_data.len() >= 2 && sb_data[1] == 1 {
                            // SEND request -- respond with terminal type
                            let ttype = b"xterm-256color";
                            responses.extend_from_slice(&[IAC, SB, OPT_TTYPE, 0]); // 0 = IS
                            responses.extend_from_slice(ttype);
                            responses.extend_from_slice(&[IAC, SE]);
                        }
                    }
                }
                // Any other IAC command (2 bytes) -- skip
                _ => {
                    i += 2;
                }
            }
        } else {
            clean.push(data[i]);
            i += 1;
        }
    }

    (clean, responses)
}

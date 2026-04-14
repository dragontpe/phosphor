use async_trait::async_trait;
use russh::client;
use russh_keys::key;

/// SSH client handler -- accepts all server keys
pub struct SshHandler;

#[async_trait]
impl client::Handler for SshHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &key::PublicKey,
    ) -> Result<bool, Self::Error> {
        // Accept all server keys for BBS connections
        Ok(true)
    }
}

/// Connect to a BBS via SSH, returning the handle and an open channel
pub async fn connect_ssh(
    host: &str,
    port: u16,
    username: &str,
) -> Result<(client::Handle<SshHandler>, russh::Channel<client::Msg>), String> {
    let config = std::sync::Arc::new(client::Config::default());

    let handler = SshHandler;

    let mut handle = client::connect(config, (host, port), handler)
        .await
        .map_err(|e| format!("SSH connection failed: {}", e))?;

    // Authenticate with "none" method (PTT doesn't require a password for bbsu)
    let auth_ok = handle
        .authenticate_none(username)
        .await
        .map_err(|e| format!("SSH auth failed: {}", e))?;

    if !auth_ok {
        // Try empty password as fallback
        let auth_ok = handle
            .authenticate_password(username, "")
            .await
            .map_err(|e| format!("SSH password auth failed: {}", e))?;

        if !auth_ok {
            return Err("SSH authentication failed -- server rejected all methods".into());
        }
    }

    // Open a session channel and request a PTY + shell
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("SSH channel open failed: {}", e))?;

    channel
        .request_pty(false, "xterm-256color", 80, 24, 0, 0, &[])
        .await
        .map_err(|e| format!("PTY request failed: {}", e))?;

    channel
        .request_shell(false)
        .await
        .map_err(|e| format!("Shell request failed: {}", e))?;

    Ok((handle, channel))
}

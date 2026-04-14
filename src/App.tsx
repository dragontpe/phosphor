import { useCallback, useEffect, useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { Terminal } from "./components/Terminal";
import { Phonebook } from "./components/Phonebook";
import { StatusBar } from "./components/StatusBar";
import { useConnection } from "./hooks/useConnection";
import { useSettings } from "./hooks/useSettings";

function App() {
  const { connectionState, statusMessage, activeBbs, connect, disconnect } =
    useConnection();
  const { settings, toggleSmoothScroll } = useSettings();
  const [capturing, setCapturing] = useState(false);

  const toggleCapture = useCallback(() => {
    setCapturing((c) => !c);
  }, []);

  // Auto-stop capture when the connection drops so the partial session is saved.
  useEffect(() => {
    if (capturing && connectionState !== "connected") {
      setCapturing(false);
    }
  }, [connectionState, capturing]);

  return (
    <div className="app-shell">
      <TitleBar
        connectionState={connectionState}
        activeBbs={activeBbs}
        onDisconnect={disconnect}
        smoothScroll={settings.smoothScroll}
        onToggleSmoothScroll={toggleSmoothScroll}
        capturing={capturing}
        onToggleCapture={toggleCapture}
      />
      <div className="main-area">
        <Phonebook
          onSelect={connect}
          activeBbs={activeBbs}
          connectionState={connectionState}
        />
        <Terminal
          smoothScroll={settings.smoothScroll}
          capturing={capturing}
          bbsName={activeBbs?.name ?? null}
        />
      </div>
      <StatusBar
        connectionState={connectionState}
        statusMessage={statusMessage}
        activeBbs={activeBbs}
      />
      <div className="crt-overlay" aria-hidden="true" />
    </div>
  );
}

export default App;

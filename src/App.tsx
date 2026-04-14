import { TitleBar } from "./components/TitleBar";
import { Terminal } from "./components/Terminal";
import { Phonebook } from "./components/Phonebook";
import { StatusBar } from "./components/StatusBar";
import { useConnection } from "./hooks/useConnection";

function App() {
  const { connectionState, statusMessage, activeBbs, connect, disconnect } =
    useConnection();

  return (
    <div className="app-shell">
      <TitleBar
        connectionState={connectionState}
        activeBbs={activeBbs}
        onDisconnect={disconnect}
      />
      <div className="main-area">
        <Phonebook
          onSelect={connect}
          activeBbs={activeBbs}
          connectionState={connectionState}
        />
        <Terminal />
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

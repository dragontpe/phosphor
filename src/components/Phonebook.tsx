import { useState } from "react";
import { BbsEntry, ConnectionState } from "../types";
import { usePhonebook } from "../hooks/usePhonebook";

interface PhonebookProps {
  onSelect: (bbs: BbsEntry) => void;
  activeBbs: BbsEntry | null;
  connectionState: ConnectionState;
}

export function Phonebook({
  onSelect,
  activeBbs,
  connectionState,
}: PhonebookProps) {
  const {
    favoriteEntries,
    categories,
    favorites,
    toggleFavorite,
    addEntry,
    removeEntry,
  } = usePhonebook();
  const [showAdd, setShowAdd] = useState(false);

  const categoryOrder = [
    "Featured",
    "Artscene",
    "Door Games",
    "Community",
    "Vintage",
    "Taiwan",
    "Custom",
  ];

  const sortedCategories = categoryOrder.filter((c) => categories[c]);

  const renderEntry = (bbs: BbsEntry) => {
    const isActive = activeBbs?.id === bbs.id;
    const isConnected = isActive && connectionState === "connected";
    const isConnecting = isActive && connectionState === "connecting";
    const isFav = favorites.has(bbs.id);

    return (
      <div
        key={bbs.id}
        className={`phonebook__entry ${
          isActive ? "phonebook__entry--active" : ""
        }`}
        onClick={() => onSelect(bbs)}
        role="button"
        tabIndex={0}
        aria-label={`Connect to ${bbs.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(bbs);
          }
        }}
      >
        <div className="phonebook__entry-name">
          <span
            className={`phonebook__dot ${
              isConnected
                ? "phonebook__dot--on"
                : isConnecting
                  ? "phonebook__dot--connecting"
                  : ""
            }`}
            aria-hidden="true"
          />
          <span className="phonebook__entry-label">{bbs.name}</span>
          <span className="phonebook__badge" aria-label={`Protocol ${bbs.protocol}`}>
            {bbs.protocol === "ssh" ? "SSH" : "TEL"}
          </span>
          <button
            className={`phonebook__fav-btn ${
              isFav ? "phonebook__fav-btn--on" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(bbs.id);
            }}
            title={isFav ? "Unfavorite" : "Favorite"}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            ★
          </button>
          {bbs.isCustom && (
            <button
              className="phonebook__remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeEntry(bbs.id);
              }}
              title="Remove"
              aria-label={`Remove ${bbs.name}`}
            >
              ×
            </button>
          )}
        </div>
        <div className="phonebook__entry-meta">
          <span className="phonebook__entry-host">
            {bbs.host}:{bbs.port}
          </span>
        </div>
        {bbs.description && (
          <div className="phonebook__entry-desc" title={bbs.description}>
            {bbs.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="phonebook" aria-label="BBS phonebook">
      <div className="phonebook__header">
        <span className="phonebook__header-label">PHONEBOOK</span>
        <button
          className="phonebook__add-btn"
          onClick={() => setShowAdd(!showAdd)}
          title={showAdd ? "Cancel" : "Add BBS"}
          aria-label={showAdd ? "Close add form" : "Add new BBS"}
          aria-expanded={showAdd}
        >
          {showAdd ? "×" : "+"}
        </button>
      </div>

      {showAdd && (
        <AddForm onAdd={addEntry} onClose={() => setShowAdd(false)} />
      )}

      <div className="phonebook__list">
        {favoriteEntries.length > 0 && (
          <div className="phonebook__category">
            <div className="phonebook__category-name phonebook__category-name--fav">
              FAVORITES
            </div>
            {favoriteEntries.map(renderEntry)}
          </div>
        )}

        {sortedCategories.map((cat) => (
          <div key={cat} className="phonebook__category">
            <div className="phonebook__category-name">{cat.toUpperCase()}</div>
            {categories[cat].map(renderEntry)}
          </div>
        ))}
      </div>
    </nav>
  );
}

function AddForm({
  onAdd,
  onClose,
}: {
  onAdd: (entry: Omit<BbsEntry, "id" | "isCustom">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("23");
  const [protocol, setProtocol] = useState<"telnet" | "ssh">("telnet");
  const [encoding, setEncoding] = useState<"utf8" | "big5">("utf8");
  const [username, setUsername] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !host.trim()) return;
    onAdd({
      name: name.trim(),
      host: host.trim(),
      port: parseInt(port) || 23,
      protocol,
      encoding,
      username: username.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="phonebook__add-form" role="form" aria-label="Add new BBS">
      <div className="phonebook__add-form-title">NEW ENTRY</div>
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        aria-label="BBS name"
      />
      <input
        placeholder="Host (e.g. bbs.example.com)"
        value={host}
        onChange={(e) => setHost(e.target.value)}
        aria-label="BBS host"
      />
      <div className="phonebook__add-row">
        <input
          placeholder="Port"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          style={{ width: "70px" }}
          aria-label="Port number"
        />
        <select
          value={protocol}
          onChange={(e) => setProtocol(e.target.value as "telnet" | "ssh")}
          aria-label="Protocol"
        >
          <option value="telnet">Telnet</option>
          <option value="ssh">SSH</option>
        </select>
        <select
          value={encoding}
          onChange={(e) => setEncoding(e.target.value as "utf8" | "big5")}
          aria-label="Character encoding"
        >
          <option value="utf8">UTF-8</option>
          <option value="big5">Big5</option>
        </select>
      </div>
      {protocol === "ssh" && (
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-label="SSH username"
        />
      )}
      <div className="phonebook__add-actions">
        <button onClick={handleSubmit}>ADD</button>
        <button onClick={onClose}>CANCEL</button>
      </div>
    </div>
  );
}

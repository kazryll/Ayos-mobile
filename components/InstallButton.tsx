export default function InstallButton() {
  return (
    <button
      id="install-button"
      style={{
        display: "none",
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "10px 20px",
        backgroundColor: "#000",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        zIndex: 9999,
      }}
    >
      📲 Install App
    </button>
  );
}

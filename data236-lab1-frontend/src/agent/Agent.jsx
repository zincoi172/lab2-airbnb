import { useState } from "react";
import AgentPanel from "./AgentPanel";
import "./Agent.css";

export default function AgentFab({ bookingContext }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Open AI concierge"
        className="agent-fab"
        onClick={() => setOpen(true)}
      >
        ✨ Concierge
      </button>

      {open && (
        <AgentPanel bookingContext={bookingContext} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

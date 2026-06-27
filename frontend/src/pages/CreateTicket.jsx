import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await client.post("/tickets", {
        user_name: user.username,
        text: text.trim(),
        attachment_url: attachmentUrl.trim() || null,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Create Ticket</h1>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Owner
          </label>
          <input
            type="text"
            value={`${user.name} (@${user.username})`}
            readOnly
            className="w-full cursor-not-allowed rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Request text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            required
            placeholder="Describe your request…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Attachment URL (optional)
          </label>
          <input
            type="text"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Ticket"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

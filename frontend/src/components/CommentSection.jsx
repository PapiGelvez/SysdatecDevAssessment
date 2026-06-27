import { useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatTimestamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  // e.g. "Jun 25, 2026 at 3:42 PM"
  return `${datePart} at ${timePart}`;
}

export default function CommentSection({ ticketId, comments, onAdded }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await client.post(`/tickets/${ticketId}/comments`, {
        author: user.username,
        text: text.trim(),
      });
      setText("");
      onAdded();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        Comments ({comments.length})
      </h3>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded border border-gray-100 bg-gray-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-gray-800">{c.author_name}</span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(c.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{c.text}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Commenting as
          </label>
          <input
            type="text"
            value={`${user.name} (@${user.username})`}
            readOnly
            className="w-full cursor-not-allowed rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Write a comment…"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add Comment"}
        </button>
      </form>
    </div>
  );
}

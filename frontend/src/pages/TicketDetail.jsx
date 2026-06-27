import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../api/client.js";
import CommentSection from "../components/CommentSection.jsx";

const STATUS_OPTIONS = ["Open", "In Progress", "Closed", "Cancelled"];

const STATUS_BADGE = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-amber-100 text-amber-800",
  Closed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // edit form state
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // classify state
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState("");

  const loadTicket = useCallback(async () => {
    const { data } = await client.get(`/tickets/${id}`);
    setTicket(data);
    setStatus(data.status);
    setOwner(data.user_name);
    return data;
  }, [id]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [, usersRes] = await Promise.all([loadTicket(), client.get("/users")]);
        if (active) setUsers(usersRes.data);
      } catch (err) {
        if (active) setError("Failed to load ticket");
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [loadTicket]);

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyError("");
    try {
      await client.post(`/tickets/${id}/classify`);
      await loadTicket();
    } catch (err) {
      setClassifyError(err.response?.data?.detail || "Classification failed");
    } finally {
      setClassifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      await client.patch(`/tickets/${id}`, { status, user_name: owner });
      await loadTicket();
      setSavedMsg("Changes saved");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      setSavedMsg(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading ticket…</div>;
  }
  if (error || !ticket) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Ticket not found"}.{" "}
        <Link to="/dashboard" className="text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const c = ticket.classification;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Ticket Detail</h1>
            <p className="mt-1 font-mono text-xs text-gray-500">{ticket.id}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              STATUS_BADGE[ticket.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {ticket.status}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Owner</dt>
            <dd className="font-medium text-gray-800">{ticket.user_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created At</dt>
            <dd className="font-medium text-gray-800">{formatDate(ticket.created_at)}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <dt className="text-sm text-gray-500">Request</dt>
          <dd className="mt-1 whitespace-pre-wrap text-gray-800">{ticket.text}</dd>
        </div>
        {ticket.attachment_url && (
          <div className="mt-4">
            <dt className="text-sm text-gray-500">Attachment</dt>
            <dd className="mt-1">
              <a
                href={ticket.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {ticket.attachment_url}
              </a>
            </dd>
          </div>
        )}
      </div>

      {/* AI Classification */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">AI Classification</h2>
          <button
            onClick={handleClassify}
            disabled={classifying}
            className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {classifying ? "Classifying…" : "Classify with AI"}
          </button>
        </div>
        {classifyError && <p className="mb-2 text-sm text-red-600">{classifyError}</p>}
        {c ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Category" value={c.category} />
            <Field label="Priority" value={c.priority} />
            <div className="sm:col-span-3">
              <p className="text-xs font-medium text-gray-500">Summary</p>
              <p className="text-gray-800">{c.summary}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not classified yet.</p>
        )}
      </div>

      {/* Edit */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Edit Ticket</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">Owner</label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {users.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
        </div>
      </div>

      {/* Comments */}
      <CommentSection
        ticketId={ticket.id}
        comments={ticket.comments}
        onAdded={loadTicket}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

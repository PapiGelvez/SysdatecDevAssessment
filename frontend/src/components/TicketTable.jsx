import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_OPTIONS = ["All", "Open", "In Progress", "Closed", "Cancelled"];
const CATEGORY_OPTIONS = ["All", "Finance", "Legal", "Procurement", "Operations"];
const PRIORITY_OPTIONS = ["All", "High", "Medium", "Low"];

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
  });
}

export default function TicketTable({ tickets }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const clearFilters = () => {
    setStatusFilter("All");
    setCategoryFilter("All");
    setPriorityFilter("All");
    setFromDate("");
    setToDate("");
  };

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;

      const category = t.classification?.category || null;
      if (categoryFilter !== "All" && category !== categoryFilter) return false;

      const priority = t.classification?.priority || null;
      if (priorityFilter !== "All" && priority !== priorityFilter) return false;

      if (fromDate) {
        const created = new Date(t.created_at);
        if (created < new Date(fromDate + "T00:00:00")) return false;
      }
      if (toDate) {
        const created = new Date(t.created_at);
        if (created > new Date(toDate + "T23:59:59")) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, priorityFilter, fromDate, toDate]);

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Tickets</h2>
        <button
          onClick={() => navigate("/tickets/new")}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Ticket
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded bg-gray-50 p-3">
        <Filter label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <Filter label="Category" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
        <Filter label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_OPTIONS} />
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600">Created from</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600">Created to</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={clearFilters}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        >
          Clear filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["ID", "Owner", "Status", "Category", "Priority", "Summary", "Created At", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  No tickets match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">
                    {t.id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-gray-800">{t.user_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[t.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {t.classification?.category || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {t.classification?.priority || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-gray-700">
                    {t.classification?.summary || t.text}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{formatDate(t.created_at)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tickets/${t.id}`);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Filter({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-xs font-medium text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

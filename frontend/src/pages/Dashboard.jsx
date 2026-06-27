import { useEffect, useState } from "react";
import client from "../api/client.js";
import StatusPieChart from "../components/charts/StatusPieChart.jsx";
import CategoryPieChart from "../components/charts/CategoryPieChart.jsx";
import PriorityPieChart from "../components/charts/PriorityPieChart.jsx";
import TicketTable from "../components/TicketTable.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          client.get("/stats"),
          client.get("/tickets"),
        ]);
        if (active) {
          setStats(statsRes.data);
          setTickets(ticketsRes.data);
        }
      } catch (err) {
        if (active) setError("Failed to load dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard…</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatusPieChart byStatus={stats.by_status} />
        <CategoryPieChart byCategory={stats.by_category} />
        <PriorityPieChart byPriority={stats.by_priority} />
      </div>

      {/* Top users */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Top 5 Users by Tickets Created
        </h2>
        {stats.top_users.length === 0 ? (
          <p className="text-sm text-gray-400">No tickets yet.</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {stats.top_users.map((u, idx) => (
              <li
                key={u.username}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                  {u.ticket_count} tickets
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Ticket table */}
      <TicketTable tickets={tickets} />
    </div>
  );
}

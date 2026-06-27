import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = {
  Finance: "#6366f1",
  Legal: "#ec4899",
  Procurement: "#14b8a6",
  Operations: "#0ea5e9",
};

const ORDER = ["Finance", "Legal", "Procurement", "Operations"];

const renderLabel = ({ percent }) =>
  percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

export default function CategoryPieChart({ byCategory }) {
  const data = ORDER.map((key) => ({
    name: key,
    value: byCategory?.[key] || 0,
  })).filter((d) => d.value > 0);

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-2 text-center text-sm font-semibold text-gray-700">
        Tickets by Category
      </h3>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={renderLabel}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

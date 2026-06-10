import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { ArrowLeft, MousePointerClick, Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import { getAnalytics } from "../utils/api";
import { format, parseISO } from "date-fns";

const COLORS = ["#4f6ef7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const deviceIcon = (type) => {
  if (type === "mobile") return <Smartphone className="w-4 h-4" />;
  if (type === "tablet") return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
};

function StatCard({ label, value }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAnalytics(code);
        setData(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 animate-pulse">Loading analytics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500">{error || "URL not found"}</p>
        <button className="btn-secondary mt-4" onClick={() => navigate("/")}>
          Go home
        </button>
      </div>
    );
  }

  const clicksData =
    range === "7d" ? data.clicks_last_7_days : data.clicks_last_30_days;

  const formattedClicks = clicksData.map((d) => ({
    date: format(parseISO(d.date), "MMM d"),
    clicks: d.clicks,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-semibold text-gray-900">
            Analytics: <code className="text-brand-600">/{code}</code>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-lg">
            {data.url.original_url}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total clicks" value={data.total_clicks.toLocaleString()} />
        <StatCard
          label="Last 7 days"
          value={data.clicks_last_7_days
            .reduce((s, d) => s + d.clicks, 0)
            .toLocaleString()}
        />
        <StatCard
          label="Top device"
          value={data.device_breakdown[0]?.device_type || "—"}
        />
        <StatCard
          label="Top browser"
          value={data.browser_breakdown[0]?.browser || "—"}
        />
      </div>

      {/* Clicks over time */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900">Clicks over time</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setRange("7d")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                range === "7d"
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setRange("30d")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                range === "30d"
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              30 days
            </button>
          </div>
        </div>
        {formattedClicks.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No click data in this range yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={formattedClicks}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#4f6ef7"
                strokeWidth={2}
                dot={{ r: 3, fill: "#4f6ef7" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Device breakdown */}
        <div className="card p-5">
          <h2 className="font-medium text-gray-900 mb-4">Device types</h2>
          {data.device_breakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.device_breakdown.map((d, i) => {
                const total = data.device_breakdown.reduce((s, x) => s + x.count, 0);
                const pct = Math.round((d.count / total) * 100);
                return (
                  <div key={d.device_type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5 text-gray-700">
                        {deviceIcon(d.device_type)}
                        <span className="capitalize">{d.device_type}</span>
                      </span>
                      <span className="text-gray-500">
                        {d.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Browser breakdown */}
        <div className="card p-5">
          <h2 className="font-medium text-gray-900 mb-4">Browsers</h2>
          {data.browser_breakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.browser_breakdown}
                  dataKey="count"
                  nameKey="browser"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ browser, percent }) =>
                    `${browser} ${Math.round(percent * 100)}%`
                  }
                  labelLine={false}
                >
                  {data.browser_breakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top referers */}
      {data.top_referers.length > 0 && (
        <div className="card p-5">
          <h2 className="font-medium text-gray-900 mb-4">Top referrers</h2>
          <div className="space-y-2">
            {data.top_referers.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-700 truncate max-w-sm">{r.referer}</span>
                <span className="text-gray-500 ml-4 whitespace-nowrap">
                  {r.count} click{r.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

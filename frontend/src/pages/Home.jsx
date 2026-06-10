import { useState, useEffect, useCallback } from "react";
import { Link2, TrendingUp, MousePointerClick, Globe } from "lucide-react";
import ShortenForm from "../components/ShortenForm";
import URLTable from "../components/URLTable";
import { listUrls } from "../utils/api";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState({ urls: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUrls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUrls(page);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const totalClicks = data.urls.reduce((sum, u) => sum + u.total_clicks, 0);
  const activeCount = data.urls.filter((u) => u.is_active).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">SnapURL</h1>
        <p className="text-gray-500 text-sm mt-1">
          Shorten links, track clicks, understand your audience.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Link2}
          label="Total links"
          value={data.total}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          icon={MousePointerClick}
          label="Total clicks"
          value={totalClicks.toLocaleString()}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Active links"
          value={activeCount}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <ShortenForm onCreated={fetchUrls} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Your links</h2>
          {loading && (
            <span className="text-xs text-gray-400 animate-pulse">Refreshing…</span>
          )}
        </div>
        <URLTable urls={data.urls} onUpdate={fetchUrls} />

        {data.total > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              className="btn-secondary text-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="self-center text-sm text-gray-500">
              Page {page} of {Math.ceil(data.total / 20)}
            </span>
            <button
              className="btn-secondary text-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(data.total / 20)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

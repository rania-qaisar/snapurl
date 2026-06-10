import { useState } from "react";
import { Copy, Check, BarChart2, Trash2, Power, ExternalLink } from "lucide-react";
import { deleteUrl, toggleUrl } from "../utils/api";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

function truncate(str, n = 48) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export default function URLTable({ urls, onUpdate }) {
  const [actionLoading, setActionLoading] = useState(null);
  const { copied, copy } = useCopyToClipboard();
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  const handleCopy = async (shortUrl, id) => {
    await copy(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (code) => {
    if (!confirm("Delete this URL permanently? All analytics will be lost.")) return;
    setActionLoading(`delete-${code}`);
    try {
      await deleteUrl(code);
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (code) => {
    setActionLoading(`toggle-${code}`);
    try {
      await toggleUrl(code);
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!urls.length) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400 text-sm">No URLs yet — shorten your first link above.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Original URL
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Short URL
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Clicks
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Created
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {urls.map((url) => {
              const code = url.custom_alias || url.short_code;
              return (
                <tr key={url.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700 truncate" title={url.original_url}>
                        {truncate(url.original_url)}
                      </span>
                      <a
                        href={url.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-brand-600 font-mono text-xs">
                        {url.short_url}
                      </code>
                      <button
                        onClick={() => handleCopy(url.short_url, url.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy"
                      >
                        {copiedId === url.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {url.total_clicks.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {url.is_active ? (
                      <span className="badge-active">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="badge-inactive">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(url.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => navigate(`/analytics/${code}`)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="View analytics"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(code)}
                        disabled={actionLoading === `toggle-${code}`}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                        title={url.is_active ? "Disable" : "Enable"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(code)}
                        disabled={actionLoading === `delete-${code}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

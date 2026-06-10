import { useState } from "react";
import { Link2, Zap, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { shortenUrl } from "../utils/api";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

export default function ShortenForm({ onCreated }) {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const { copied, copy } = useCopyToClipboard();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const payload = { original_url: url };
      if (alias.trim()) payload.custom_alias = alias.trim();
      if (expiryDays) payload.expires_in_days = parseInt(expiryDays, 10);

      const res = await shortenUrl(payload);
      setResult(res.data);
      setUrl("");
      setAlias("");
      setExpiryDays("");
      if (onCreated) onCreated(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-brand-600" />
        </div>
        <h2 className="font-semibold text-gray-900">Shorten a URL</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="https://your-long-url.com/goes/here"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={loading || !url.trim()}
          >
            {loading ? "Shortening…" : "Shorten"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Settings2 className="w-3 h-3" />
          Advanced options
          {showAdvanced ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Custom alias (optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="my-link"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toLowerCase())}
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9_-]+"
              />
              <p className="text-xs text-gray-400 mt-1">
                Letters, numbers, - and _ only
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Expires in (days)
              </label>
              <input
                type="number"
                className="input"
                placeholder="Never"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl">
          <p className="text-xs text-green-700 font-medium mb-2">
            ✓ Your short URL is ready
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-green-800 bg-white border border-green-200 rounded-lg px-3 py-2 truncate">
              {result.short_url}
            </code>
            <button
              onClick={() => copy(result.short_url)}
              className="btn-secondary text-sm px-3 py-2 whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

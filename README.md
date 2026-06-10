# SnapURL — URL Shortener & Analytics Platform

A production-grade URL shortener with real-time click analytics, Redis caching, rate limiting, and a React dashboard — built with a modern async Python backend and deployed live.

**Live Demo:** [snapurl.vercel.app](https://snapurl.vercel.app) | **API Docs:** [snapurl-api.railway.app/api/docs](https://snapurl-api.railway.app/api/docs)

---

## Features

- Shorten any URL with an auto-generated or custom alias
- Sub-100ms redirects via Redis caching
- Analytics dashboard — clicks over time, device breakdown, browser stats, top referrers
- Rate limiting — 30 requests per minute per IP
- Link management — enable, disable, delete, paginate
- Link expiry — set TTL in days, auto-expires on redirect

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async) |
| Database | PostgreSQL 16 |
| Cache & Rate Limiting | Redis 7 |
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Deployment | Railway (backend), Vercel (frontend) |

---

## Architecture

| Step | Action |
|---|---|
| 1 | Request hits `/api/{code}` |
| 2 | Redis cache checked — if hit, redirect immediately |
| 3 | If miss, query PostgreSQL and populate cache |
| 4 | Click metadata recorded asynchronously |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/shorten` | Create a short URL |
| `GET` | `/api/urls` | List all URLs (paginated) |
| `GET` | `/api/{code}` | Redirect to original URL |
| `GET` | `/api/urls/{code}/analytics` | Get click analytics |
| `DELETE` | `/api/urls/{code}` | Delete a URL |
| `PATCH` | `/api/urls/{code}/toggle` | Enable or disable a URL |
| `GET` | `/api/health` | Health check |

---

## Scaling Considerations

| Concept | Approach |
|---|---|
| Horizontal scaling | Stateless backend, multiple instances behind a load balancer |
| Read replicas | Separate analytics reads from write traffic |
| Distributed IDs | Snowflake IDs at billions of URLs to eliminate collision checks |
| Edge redirects | Cloudflare Workers for single-digit millisecond latency globally |

---

## How to Run Locally

1. Install Docker Desktop
2. Clone the repository
3. Run `cp backend/.env.example backend/.env`
4. Run `docker compose up --build`
5. Open `http://localhost:80`

---

## Author

**Rania Qaisar**
[github.com/raniaqaisar](https://github.com/raniaqaisar)

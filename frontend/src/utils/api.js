import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail || err.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export const shortenUrl = (data) => api.post("/shorten", data);
export const listUrls = (page = 1, pageSize = 20) =>
  api.get("/urls", { params: { page, page_size: pageSize } });
export const getAnalytics = (code) => api.get(`/urls/${code}/analytics`);
export const deleteUrl = (code) => api.delete(`/urls/${code}`);
export const toggleUrl = (code) => api.patch(`/urls/${code}/toggle`);

export default api;

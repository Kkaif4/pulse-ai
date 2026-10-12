import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enables sending secure HttpOnly session cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token from localStorage into request headers as fallback
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("pulse_token") : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Automatically detect expired or invalid tokens and clear stale credentials
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const url = error.config?.url || "";
      // If it's not the initial login or register attempt
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("pulse_token");
          localStorage.removeItem("pulse_username");
          window.dispatchEvent(
            new CustomEvent("pulse_auth_expired", {
              detail: {
                message:
                  error.response?.data?.error ||
                  "Your session has expired. Please sign in again.",
              },
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

// Centralized API endpoints
export const api = {
  auth: {
    login: async (username: string, password: string, hp_website: string = "") => {
      const { data } = await apiClient.post("/auth/login", { username, password, hp_website });
      return data;
    },
    register: async (username: string, password: string, hp_website: string = "") => {
      const { data } = await apiClient.post("/auth/register", { username, password, hp_website });
      return data;
    },
    logout: async () => {
      const { data } = await apiClient.post("/auth/logout");
      return data;
    },
  },
  trades: {
    getV2All: async (params?: { since?: number | null; date?: string; limit?: number }) => {
      const { data } = await apiClient.get("/trades", { params });
      return data;
    },
    getV3All: async (params?: { since?: number | null; date?: string; limit?: number }) => {
      const { data } = await apiClient.get("/trades/v3", { params });
      return data;
    },
    getLegacyAll: async (params?: { since?: number | null; date?: string; limit?: number }) => {
      const { data } = await apiClient.get("/trades/legacy", { params });
      return data;
    },
    getV4All: async (params?: { since?: number | null; date?: string; limit?: number }) => {
      const { data } = await apiClient.get("/trades/v4", { params });
      return data;
    },
    getCompareAll: async (params?: { date?: string; limit?: number }) => {
      const { data } = await apiClient.get("/trades/compare", { params });
      return data;
    },
    getCompareDetails: async (timestamp: string) => {
      const { data } = await apiClient.get("/trades/compare/details", { params: { timestamp } });
      return data;
    },
    getLatest: async () => {
      const { data } = await apiClient.get("/trades/latest");
      return data;
    },
    delete: async (id: number) => {
      const { data } = await apiClient.delete(`/trades/${id}`);
      return data;
    },
    getBufferStatus: async () => {
      const { data } = await apiClient.get("/trades/buffer/status");
      return data as { status: string; pendingQueueCount: number };
    },
    flushBuffer: async () => {
      const { data } = await apiClient.post("/trades/buffer/flush");
      return data as { message: string; result: { flushedV2: number; flushedV3: number; flushedLegacy: number; flushedVolume: number } };
    },
  },
  market: {
    getStatus: async () => {
      const { data } = await apiClient.get("/api/market/status", { timeout: 10000 });
      return data;
    },
    wake: async (durationMinutes: number = 30) => {
      // 60-second timeout to accommodate Render cold start
      const { data } = await apiClient.post("/api/market/wake", { durationMinutes }, { timeout: 60000 });
      return data;
    },
    sleep: async () => {
      const { data } = await apiClient.post("/api/market/sleep", {}, { timeout: 10000 });
      return data;
    },
    getHolidays: async () => {
      const { data } = await apiClient.get("/api/market/holidays", { timeout: 10000 });
      return data;
    },
  },
};


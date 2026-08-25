import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token from localStorage into request headers
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

// Centralized API endpoints
export const api = {
  auth: {
    login: async (username: string, password: string) => {
      const { data } = await apiClient.post("/auth/login", { username, password });
      return data;
    },
    register: async (username: string, password: string) => {
      const { data } = await apiClient.post("/auth/register", { username, password });
      return data;
    },
  },
  trades: {
    getAll: async (params?: { since?: number | null; date?: string; limit?: number }) => {
      const { data } = await apiClient.get("/trades", { params });
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
  },
};

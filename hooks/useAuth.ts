"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("pulse_token");
    const savedUser = localStorage.getItem("pulse_username");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (username.length !== 6) {
      setAuthError("Username must be exactly 6 characters");
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authMode === "login") {
        const data = await api.auth.login(username, password);
        localStorage.setItem("pulse_token", data.token);
        localStorage.setItem("pulse_username", username);
        setToken(data.token);
        setIsAuthenticated(true);
      } else {
        await api.auth.register(username, password);
        setAuthMode("login");
        setAuthError("Registration successful. Please log in.");
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.response?.data?.error || "Authentication failed");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("pulse_token");
    localStorage.removeItem("pulse_username");
    setToken("");
    setUsername("");
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    username,
    setUsername,
    password,
    setPassword,
    authMode,
    setAuthMode,
    token,
    authError,
    isAuthLoading,
    handleAuth,
    handleLogout,
  };
}

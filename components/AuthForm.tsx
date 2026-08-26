import React from "react";

interface AuthFormProps {
  authMode: "login" | "register";
  username: string;
  passwordHash: string; // password input string value
  authError: string;
  onChangeUsername: (val: string) => void;
  onChangePassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: (mode: "login" | "register") => void;
}

export function AuthForm({
  authMode,
  username,
  passwordHash: password,
  authError,
  onChangeUsername,
  onChangePassword,
  onSubmit,
  onToggleMode,
}: AuthFormProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 font-sans text-white selection:bg-cyan-500 selection:text-black">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-2xl"></div>

        <div className="text-center">
          <img src="/favicon-48x48.png" alt="pulseAI logo" className="mx-auto mb-3.5 w-12 h-12 rounded-xl shadow-lg border border-zinc-800" />
          <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            pulseAI
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">Advanced NIFTY Live Options Conviction Engine</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          {authError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {authError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Username (6 Characters)</label>
            <input
              type="text"
              maxLength={6}
              value={username}
              onChange={(e) => onChangeUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 p-3 font-semibold text-black transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99]"
          >
            {authMode === "login" ? "Sign In" : "Register Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {authMode === "login" ? (
            <button onClick={() => onToggleMode("register")} className="text-cyan-400 hover:underline">
              Create new 6-character username account
            </button>
          ) : (
            <button onClick={() => onToggleMode("login")} className="text-cyan-400 hover:underline">
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

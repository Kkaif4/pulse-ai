/**
 * PulseAI - Centralized Trade, Date, and Formatting Utilities
 * Standardizes signal theming, date calculations (IST timezone), and summary parsing.
 */

export interface SignalTheme {
  type: "bullish" | "bearish" | "exit" | "neutral";
  border: string;
  bg: string;
  shadow: string;
  text: string;
  subBorder: string;
  subBg: string;
  subText: string;
  badge: string;
}

/**
 * Returns standardized color and styling tokens for trade signals.
 */
export function getSignalTheme(signal?: string): SignalTheme {
  const s = (signal || "").toUpperCase();

  if (s.includes("BUY CE") || s.includes("HOLD CE")) {
    return {
      type: "bullish",
      border: "border-emerald-500/50",
      bg: "bg-emerald-950/20",
      shadow: "shadow-emerald-500/5",
      text: "text-emerald-400",
      subBorder: "border-emerald-500/20",
      subBg: "bg-emerald-950/10",
      subText: "text-emerald-200",
      badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    };
  }

  if (s.includes("BUY PE") || s.includes("HOLD PE")) {
    return {
      type: "bearish",
      border: "border-rose-500/50",
      bg: "bg-rose-950/20",
      shadow: "shadow-rose-500/5",
      text: "text-rose-400",
      subBorder: "border-rose-500/20",
      subBg: "bg-rose-950/10",
      subText: "text-rose-200",
      badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    };
  }

  if (s.includes("EXIT")) {
    return {
      type: "exit",
      border: "border-purple-500/50",
      bg: "bg-purple-950/20",
      shadow: "shadow-purple-500/5",
      text: "text-purple-400",
      subBorder: "border-purple-500/20",
      subBg: "bg-purple-950/10",
      subText: "text-purple-200",
      badge: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    };
  }

  return {
    type: "neutral",
    border: "border-zinc-800",
    bg: "bg-zinc-900/60",
    shadow: "",
    text: "text-zinc-300",
    subBorder: "border-zinc-800",
    subBg: "bg-zinc-950/50",
    subText: "text-zinc-300",
    badge: "bg-zinc-800 text-zinc-400 border border-transparent",
  };
}

/**
 * Returns current date object adjusted to Indian Standard Time (IST, UTC+5:30).
 */
export function getISTNow(): Date {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5.5);
}

/**
 * Formats IST today date as YYYY-MM-DD.
 */
export function getTodayISTDateString(): string {
  const ist = getISTNow();
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats IST yesterday date as YYYY-MM-DD.
 */
export function getYesterdayISTDateString(): string {
  const ist = getISTNow();
  ist.setDate(ist.getDate() - 1);
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a timestamp into HH:MM:SS or HH:MM string in IST.
 */
export function formatTime(timestamp: string | Date, includeSeconds: boolean = false): string {
  if (!timestamp) return "N/A";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: false,
  });
}

/**
 * Escapes HTML characters to prevent XSS attacks when rendering dynamic string summaries.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Parses pipe-separated and colon-delimited engine summary text into structured key-value pairs.
 */
export function parseSummary(summaryText: string): Array<{ key: string; value: string }> {
  if (!summaryText) return [];
  const cleanText = summaryText.replace(/\u001b\[[0-9;]*m/g, "");
  const lines = cleanText.split("\n");
  const items: Array<{ key: string; value: string }> = [];

  lines.forEach((line) => {
    const segments = line.split("|");
    segments.forEach((seg) => {
      const parts = seg.split(":");
      if (parts.length >= 2) {
        const key = escapeHtml(
          parts[0]
            .replace(
              /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
              ""
            )
            .trim()
        );
        const value = escapeHtml(parts.slice(1).join(":").trim());
        if (key && value) {
          items.push({ key, value });
        }
      }
    });
  });
  return items;
}

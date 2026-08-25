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
        const key = parts[0]
          .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
          .trim();
        const value = parts.slice(1).join(":").trim();
        if (key && value) {
          items.push({ key, value });
        }
      }
    });
  });
  return items;
}

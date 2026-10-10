import React from "react";

export function V4WorkspaceView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center border-2 border-dashed border-zinc-800 rounded-xl p-8 bg-zinc-900/20">
      <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20">
        <span className="text-2xl">⚡</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        V4 Market Intelligence
      </h2>
      <p className="text-zinc-400 max-w-lg mb-6">
        This is the new dedicated workspace for V4 OrderBlock analysis, strength
        boards, and market regimes. It operates independently from the classic
        engines.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl text-left">
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h3 className="font-semibold text-amber-400 mb-2">Market Overview</h3>
          <p className="text-sm text-zinc-500">
            Universe distribution, sector leaders, and market session status.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h3 className="font-semibold text-amber-400 mb-2">Strength Boards</h3>
          <p className="text-sm text-zinc-500">
            Ranked bullish and bearish tables with VWAP distance.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h3 className="font-semibold text-amber-400 mb-2">
            Order Blocks & Charts
          </h3>
          <p className="text-sm text-zinc-500">
            Zones, boundaries, invalidations, and liquidity sweeps.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h3 className="font-semibold text-amber-400 mb-2">Options Signals</h3>
          <p className="text-sm text-zinc-500">
            Explicit states (BUY CE, BUY PE, EXIT) pending backend validation.
          </p>
        </div>
      </div>
    </div>
  );
}

import React from "react";

export function LiveCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-900/30 p-6 md:p-8 backdrop-blur-xl animate-pulse">
      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-zinc-800" />
        <div className="h-3 w-28 bg-zinc-800 rounded" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mt-6 lg:mt-0">
        <div className="space-y-3">
          <div className="h-3 w-36 bg-zinc-800 rounded" />
          <div className="h-10 md:h-12 w-64 bg-zinc-800/80 rounded-lg" />
          <div className="h-4 w-80 max-w-full bg-zinc-800/60 rounded" />
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-900 bg-zinc-900/60 p-4">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-zinc-800 rounded" />
            <div className="h-7 w-32 bg-zinc-800 rounded" />
          </div>
          <div className="h-10 w-[1px] bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-7 w-28 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-900/80 pt-4 flex gap-4">
        <div className="h-3 w-40 bg-zinc-800/50 rounded" />
        <div className="h-3 w-40 bg-zinc-800/50 rounded" />
        <div className="h-3 w-40 bg-zinc-800/50 rounded" />
      </div>
    </div>
  );
}

export function KPIStatsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6 backdrop-blur-xl">
          <div className="h-3 w-24 bg-zinc-800 rounded" />
          <div className="mt-3 h-8 w-36 bg-zinc-800/80 rounded" />
          <div className="mt-4 border-t border-zinc-900 pt-3 flex justify-between gap-2">
            <div className="h-3 w-16 bg-zinc-800/50 rounded" />
            <div className="h-3 w-16 bg-zinc-800/50 rounded" />
            <div className="h-3 w-16 bg-zinc-800/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 overflow-hidden backdrop-blur-xl animate-pulse">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="h-4 w-48 bg-zinc-800 rounded" />
        <div className="h-3 w-24 bg-zinc-800/50 rounded" />
      </div>
      <div className="divide-y divide-zinc-900/60">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="h-3.5 w-20 bg-zinc-800/70 rounded" />
            <div className="h-3.5 w-28 bg-zinc-800/60 rounded" />
            <div className="h-5 w-24 bg-zinc-800/80 rounded-full" />
            <div className="h-3.5 w-16 bg-zinc-800/60 rounded" />
            <div className="h-3.5 w-20 bg-zinc-800/60 rounded hidden sm:block" />
            <div className="h-3.5 w-32 bg-zinc-800/40 rounded hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 animate-pulse">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-44 bg-zinc-800 rounded" />
            <div className="h-3 w-16 bg-zinc-800/50 rounded" />
          </div>
          <div className="h-[380px] md:h-[420px] w-full rounded bg-zinc-950 p-4 border border-zinc-900 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="h-3 w-12 bg-zinc-800/40 rounded" />
              <div className="h-3 w-12 bg-zinc-800/40 rounded" />
            </div>
            <div className="h-40 w-full bg-gradient-to-t from-zinc-900/30 to-transparent rounded border-b border-zinc-900/60" />
            <div className="flex justify-between">
              <div className="h-3 w-16 bg-zinc-800/40 rounded" />
              <div className="h-3 w-16 bg-zinc-800/40 rounded" />
              <div className="h-3 w-16 bg-zinc-800/40 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

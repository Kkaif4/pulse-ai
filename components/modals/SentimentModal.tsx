"use client";

import React from "react";
import { CloseIcon } from "../common/Icons";

interface SentimentModalProps {
  trade: any | null;
  onClose: () => void;
}

export function SentimentModal({ trade, onClose }: SentimentModalProps) {
  if (!trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-white">Engine Sentiment Breakdown</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm text-zinc-300 font-mono">
          <div>
            Sentiment: <span className="font-bold text-purple-400">{trade.sentiment}</span>
          </div>
          <div>
            Signal: <span className="font-bold text-white">{trade.signal}</span>
          </div>
          <div>
            Spot Price: <span>₹{Number(trade.spotPrice).toFixed(1)}</span>
          </div>
          <div>
            PCR: <span>{Number(trade.pcr).toFixed(2)}</span>
          </div>
          <div>
            Max Pain: <span>{Number(trade.maxPain).toFixed(0)}</span>
          </div>
          <div>
            Support: <span>{Number(trade.support).toFixed(0)}</span>
          </div>
          <div>
            Resistance: <span>{Number(trade.resistance).toFixed(0)}</span>
          </div>
          <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-400 font-sans">
            {trade.summary || "Standard engine calculation."}
          </div>
        </div>
      </div>
    </div>
  );
}

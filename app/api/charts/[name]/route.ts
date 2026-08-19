import { NextRequest } from "next/server";
import Redis from "ioredis";
import { prisma } from "../../../../lib/prisma";
import axios from "axios";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const FASTAPI_CHARTS_URL = "http://localhost:8000/charts";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "pulse_secret_key_change_me";

// 1x1 transparent PNG fallback buffer
const TRANSPARENT_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const FALLBACK_BUFFER = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  
  // Supported chart types
  const validCharts = ["trading_plot", "aggression_plot", "max_pain_plot"];
  if (!validCharts.includes(name)) {
    return new Response("Invalid chart name", { status: 400 });
  }

  try {
    // 1. Attempt to fetch from Redis cache
    let base64String = await redis.get(`pulse_ai:chart:${name}`);

    // 2. If Cache Miss, fetch from DB and request FastAPI render
    if (!base64String) {
      console.log(`[API CHART] Cache miss for '${name}'. Rebuilding from database history...`);
      
      // Fetch last 50 trades from database
      const history = await prisma.trade.findMany({
        take: 50,
        orderBy: {
          timestamp: "asc",
        },
      });

      if (history.length > 0) {
        try {
          // Serialize BigInt values to strings to prevent JSON serialization crash
          const serializedHistory = JSON.parse(
            JSON.stringify(history, (key, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          );

          const response = await axios.post(
            FASTAPI_CHARTS_URL,
            { history: serializedHistory },
            {
              headers: { "x-api-secret": INTERNAL_API_SECRET },
              timeout: 8000,
            }
          );

          const renderedCharts = response.data;
          
          if (renderedCharts) {
            // Write all rendered charts to cache
            if (renderedCharts.trading_plot) {
              await redis.set("pulse_ai:chart:trading_plot", renderedCharts.trading_plot, "EX", 86400);
            }
            if (renderedCharts.aggression_plot) {
              await redis.set("pulse_ai:chart:aggression_plot", renderedCharts.aggression_plot, "EX", 86400);
            }
            if (renderedCharts.max_pain_plot) {
              await redis.set("pulse_ai:chart:max_pain_plot", renderedCharts.max_pain_plot, "EX", 86400);
            }
            
            // Retrieve the requested one
            base64String = renderedCharts[name] || null;
          }
        } catch (fastApiErr) {
          console.error("[API CHART] FastAPI render failed:", fastApiErr);
        }
      }
    }

    if (!base64String) {
      // If still empty, return fallback transparent PNG
      return new Response(FALLBACK_BUFFER, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, must-revalidate",
        },
      });
    }

    const buffer = Buffer.from(base64String, "base64");

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        // Cache locally for 10 seconds to optimize loading, but revalidate frequently
        "Cache-Control": "public, max-age=10, must-revalidate",
      },
    });
  } catch (err) {
    console.error(`[API CHART ERROR] Failed to fetch chart '${name}':`, err);
    return new Response(FALLBACK_BUFFER, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  }
}

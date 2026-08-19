import { WebSocketServer, WebSocket } from "ws";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { parse } from "url";

dotenv.config();

const PORT_WS = parseInt(process.env.PORT_WS || "3001", 10);
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const AUTH_SECRET = process.env.AUTH_SECRET || "pulse-ai-super-secret-key";

// Redis Subscriber Connection
const redisSubscriber = new Redis(REDIS_URL);

// WebSocket Server
const wss = new WebSocketServer({ port: PORT_WS }, () => {
  console.log(`🔌 pulseAI WebSocket server listening on ws://localhost:${PORT_WS}`);
});

// Set of authenticated WebSocket clients
const clients = new Set<WebSocket>();

wss.on("connection", (ws, req) => {
  try {
    const parsedUrl = parse(req.url || "", true);
    const token = parsedUrl.query.token as string;

    if (!token) {
      console.warn("❌ WebSocket connection rejected: Missing token");
      ws.close(4001, "Unauthorized: Missing authentication token");
      return;
    }

    // Verify JWT Token
    jwt.verify(token, AUTH_SECRET, (err, decoded) => {
      if (err) {
        console.warn("❌ WebSocket connection rejected: Invalid token:", err.message);
        ws.close(4002, "Unauthorized: Invalid token");
        return;
      }

      console.log(`💚 Client authenticated: ${(decoded as any).username}`);
      clients.add(ws);

      // Welcome message
      ws.send(JSON.stringify({ type: "welcome", message: "Connected to pulseAI live feed" }));
    });

  } catch (error) {
    console.error("Error during WebSocket handshaking:", error);
    ws.close(1011, "Internal server error");
  }

  ws.on("close", () => {
    clients.delete(ws);
    console.log("🔌 Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error);
    clients.delete(ws);
  });
});

// Subscribe to Redis updates
redisSubscriber.subscribe("pulse_ai:trades:new", (err) => {
  if (err) {
    console.error("❌ Failed to subscribe to Redis trades channel:", err);
  } else {
    console.log("📡 Subscribed to Redis channel: pulse_ai:trades:new");
  }
});

redisSubscriber.on("message", (channel, message) => {
  if (channel === "pulse_ai:trades:new") {
    console.log(`📤 Broadcasting new trade update to ${clients.size} client(s)`);

    const payload = JSON.stringify({
      type: "trade:new",
      data: JSON.parse(message),
    });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
});

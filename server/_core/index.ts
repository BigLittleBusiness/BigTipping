import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { EmailService } from "../services/emailService";
import { startScheduledJobsProcessor } from "../services/scheduledJobsProcessor";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── SES SNS Webhook ───────────────────────────────────────────────────────
  // AWS SES sends bounce/complaint/delivery notifications via SNS HTTP subscriptions.
  // Configure your SNS topic to POST to /api/ses-webhook.
  app.post("/api/ses-webhook", async (req, res) => {
    try {
      const messageType = req.headers["x-amz-sns-message-type"] as string;
      const body = req.body as Record<string, unknown>;

      // SNS subscription confirmation — respond with 200 so SNS confirms the endpoint
      if (messageType === "SubscriptionConfirmation") {
        console.log("[SES Webhook] SNS subscription confirmation received. SubscribeURL:", body.SubscribeURL);
        res.status(200).json({ ok: true });
        return;
      }

      if (messageType !== "Notification") {
        res.status(200).json({ ok: true });
        return;
      }

      // Parse the SES notification message (SNS wraps it as a JSON string)
      let message: Record<string, unknown>;
      try {
        message = typeof body.Message === "string"
          ? JSON.parse(body.Message)
          : (body.Message as Record<string, unknown>);
      } catch {
        res.status(400).json({ error: "Invalid message JSON" });
        return;
      }

      const notifType = message.notificationType as string;
      // tenantId may be embedded in the SES ConfigurationSet tags or message headers
      const tenantId = parseInt((message as Record<string, string>).tenantId ?? "0") || 0;

      if (notifType === "Bounce") {
        const bounce = message.bounce as Record<string, unknown>;
        const recipients = (bounce?.bouncedRecipients as Array<{ emailAddress: string; diagnosticCode?: string }>) ?? [];
        for (const r of recipients) {
          await EmailService.handleBounce({
            messageId: (message.mail as Record<string, string>)?.messageId ?? "",
            recipientEmail: r.emailAddress,
            tenantId,
            bounceType: (((bounce?.bounceType as string) ?? "Transient").toLowerCase() === "permanent" ? "permanent" : "transient") as "permanent" | "transient",
            diagnosticCode: r.diagnosticCode,
          });
        }
      } else if (notifType === "Complaint") {
        const complaint = message.complaint as Record<string, unknown>;
        const recipients = (complaint?.complainedRecipients as Array<{ emailAddress: string }>) ?? [];
        for (const r of recipients) {
          await EmailService.handleComplaint({
            messageId: (message.mail as Record<string, string>)?.messageId ?? "",
            recipientEmail: r.emailAddress,
            tenantId,
          });
        }
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[SES Webhook] Error processing notification:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start the background scheduled-jobs processor after the server is up
    startScheduledJobsProcessor();
  });
}

startServer().catch(console.error);

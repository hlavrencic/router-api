const express = require("express");
const SagemcomClient = require("./sagemcom");

const app = express();
app.use(express.json());

const ROUTER_HOST = process.env.ROUTER_HOST || "192.168.0.1";
const PORT = process.env.PORT || 3000;

/**
 * POST /login
 * Body: { username, password }
 * Authenticates against the Sagemcom router and returns a session token.
 *
 * The session token is a base64-encoded JSON with { username, password }
 * so subsequent requests can re-authenticate if needed.
 * (Sagemcom sessions are short-lived; we store credentials server-side for reboot.)
 */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "username and password are required",
    });
  }

  try {
    const client = new SagemcomClient(username, password);
    const session = await client.login();
    await client.logout();

    // Encode credentials as a simple bearer token (base64 JSON)
    // In production you would use a proper auth mechanism
    const token = Buffer.from(JSON.stringify({ username, password })).toString("base64");

    return res.json({
      success: true,
      token,
      session,
      message: "Authenticated successfully against the router",
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /reboot
 * Body: { username, password }
 * Login + reboot en una sola request.
 */
app.post("/reboot", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "username and password are required",
    });
  }

  try {
    const client = new SagemcomClient(username, password);
    await client.login();

    // Respondemos antes de ejecutar el reboot para no perder la conexión
    // cuando el router se cae
    res.json({
      success: true,
      message: "Reboot command sent. The router will restart in a few seconds.",
    });

    await client.reboot();
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
});

/**
 * GET /status
 * Health check — verifies the API is running.
 */
app.get("/status", (_req, res) => {
  res.json({
    status: "ok",
    router: ROUTER_HOST,
    endpoints: [
      { method: "POST", path: "/login",  description: "Authenticate against the router" },
      { method: "POST", path: "/reboot", description: "Login + reboot en una sola request { username, password }" },
      { method: "GET",  path: "/status", description: "API health check" },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Router API running on http://localhost:${PORT}`);
  console.log(`Target router: http://${ROUTER_HOST}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  http://localhost:${PORT}/status`);
  console.log(`  POST http://localhost:${PORT}/login   { username, password }`);
  console.log(`  POST http://localhost:${PORT}/reboot  { username, password }`);
});

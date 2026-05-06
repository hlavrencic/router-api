const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const SagemcomClient = require("./sagemcom");

const app = express();
app.use(express.json());

const ROUTER_HOST = process.env.ROUTER_HOST || "192.168.0.1";
const PORT = process.env.PORT || 3000;

// ─── Swagger / OpenAPI ────────────────────────────────────────────────────────

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Router API",
      version: "1.0.0",
      description:
        "API REST para autenticar y reiniciar un router Sagemcom F@ST 3890 (Cablevision/Fibertel Argentina).",
    },
    servers: [{ url: `http://${ROUTER_HOST.includes("localhost") ? "localhost" : "192.168.0.214"}:${PORT}` }],
    components: {
      schemas: {
        Credentials: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "custadmin" },
            password: { type: "string", example: "yourpassword" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "username and password are required" },
          },
        },
      },
    },
  },
  apis: ["./index.js"],
});

app.get("/", (_req, res) => res.redirect("/docs"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Router API" }));
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Autenticar contra el router
 *     description: Realiza login en el router Sagemcom y devuelve un token de sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Credentials'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token: { type: string, example: "eyJ1c2VybmFtZ..." }
 *                 message: { type: string, example: "Authenticated successfully against the router" }
 *       400:
 *         description: Faltan credenciales
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /reboot:
 *   post:
 *     summary: Reiniciar el router
 *     description: >
 *       Realiza login y envía el comando de reboot al router en una sola request.
 *       La respuesta se envía **antes** de ejecutar el reboot para evitar perder
 *       la conexión cuando el router se apaga.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Credentials'
 *     responses:
 *       200:
 *         description: Comando de reboot enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Reboot command sent. The router will restart in a few seconds." }
 *       400:
 *         description: Faltan credenciales
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error al ejecutar el reboot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /reboot/auto:
 *   post:
 *     summary: Reiniciar el router con credenciales de entorno
 *     description: >
 *       Igual que `POST /reboot` pero toma las credenciales de las variables de entorno
 *       `ROUTER_USERNAME` y `ROUTER_PASSWORD`. No requiere body.
 *       Retorna HTTP 500 si las variables no están definidas.
 *     responses:
 *       200:
 *         description: Comando de reboot enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Reboot command sent. The router will restart in a few seconds." }
 *       500:
 *         description: Variables de entorno no definidas o error al ejecutar el reboot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/reboot/auto", async (req, res) => {
  const username = process.env.ROUTER_USERNAME;
  const password = process.env.ROUTER_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({
      success: false,
      error: "ROUTER_USERNAME and ROUTER_PASSWORD environment variables are not defined",
    });
  }

  try {
    const client = new SagemcomClient(username, password);
    await client.login();

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
 * @openapi
 * /status:
 *   get:
 *     summary: Health check de la API
 *     description: Verifica que la API está corriendo y muestra los endpoints disponibles.
 *     responses:
 *       200:
 *         description: API operativa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "ok" }
 *                 router: { type: string, example: "192.168.0.1" }
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method: { type: string }
 *                       path: { type: string }
 *                       description: { type: string }
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

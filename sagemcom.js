/**
 * Sagemcom F@ST (firmware Cablevision/Fibertel Argentina)
 * Interfaz web PHP con sesión cookie.
 *
 * Flujo:
 *  1. POST /check.php          → usuario + pass en base64 → obtiene PHPSESSID (302)
 *  2. POST actionHandler/ajaxSet_Reset_Restore.php con resetInfo=["btn1","Device"]
 */

const https = require("https");
const axios = require("axios");
const qs = require("querystring");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const BASE_URL = "https://192.168.0.1";

class SagemcomClient {
  constructor(username, password, { timeout = 10000 } = {}) {
    this.username = username;
    this.password = password;
    this.timeout = timeout;
    this.sessionId = null;
  }

  async login() {
    const passwordB64 = Buffer.from(this.password).toString("base64");

    const response = await axios.post(
      `${BASE_URL}/check.php`,
      qs.stringify({ username: this.username, password: passwordB64 }),
      {
        httpsAgent,
        timeout: this.timeout,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 0,
        validateStatus: (s) => s < 400,
      }
    );

    // Login exitoso = 302 redirect a main.php
    const setCookie = response.headers["set-cookie"] || [];
    const phpSessId = setCookie
      .map((c) => c.split(";")[0])
      .find((c) => c.startsWith("PHPSESSID="));

    if (!phpSessId || response.status !== 302) {
      // 200 con alert() en body = credenciales incorrectas o cuenta bloqueada
      const body = response.data || "";
      const match = String(body).match(/alert\("([^"]+)"\)/);
      throw new Error(match ? match[1] : "Login fallido");
    }

    this.sessionId = phpSessId;
    return { sessionId: phpSessId };
  }

  async logout() {
    if (!this.sessionId) return;
    await axios.get(`${BASE_URL}/home_loggedout.php`, {
      httpsAgent,
      timeout: this.timeout,
      headers: { Cookie: this.sessionId },
      validateStatus: () => true,
    });
    this.sessionId = null;
  }

  async reboot() {
    if (!this.sessionId) {
      throw new Error("Debe autenticarse primero con login()");
    }

    // Payload exacto que usa el botón "Reiniciar Gateway" en la UI
    const resetInfo = JSON.stringify(["btn1", "Device"]);

    const response = await axios.post(
      `${BASE_URL}/actionHandler/ajaxSet_Reset_Restore.php`,
      qs.stringify({ resetInfo }),
      {
        httpsAgent,
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: this.sessionId,
        },
        validateStatus: (s) => s < 500,
      }
    );

    const body = response.data || "";
    if (typeof body === "string" && body.includes("Please Login First")) {
      throw new Error("Sesión inválida o expirada");
    }

    return { status: response.status, data: body };
  }
}

module.exports = SagemcomClient;

# Router API — Sagemcom F@ST 3890

API REST para autenticarse y reiniciar un router **Sagemcom F@ST 3890** (firmware Cablevision/Fibertel Argentina).

## Requisitos

- Node.js 22+
- El servidor debe estar en la **misma red** que el router (`192.168.0.1`)

## Instalación

```bash
npm install
```

## Uso

```bash
node index.js
```

```
Router API running on http://localhost:3000
Target router: https://192.168.0.1
```

---

## Endpoints

### `GET /status`
Health check. Verifica que la API está corriendo.

```bash
curl http://localhost:3000/status
```

```json
{
  "status": "ok",
  "router": "192.168.0.1"
}
```

---

### `POST /login`
Valida las credenciales contra el router. Devuelve un token reutilizable.

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"custadmin","password":"****"}'
```

```json
{
  "success": true,
  "token": "<base64>",
  "message": "Authenticated successfully against the router"
}
```

---

### `POST /reboot`
Autentica y reinicia el router en una sola request.

```bash
curl -X POST http://localhost:3000/reboot \
  -H "Content-Type: application/json" \
  -d '{"username":"custadmin","password":"****"}'
```

```json
{
  "success": true,
  "message": "Reboot command sent. The router will restart in a few seconds."
}
```

> **Nota:** el router tarda aproximadamente 2 minutos en volver a estar disponible tras el reinicio.

---

## Docker

### Build y ejecución

```bash
docker compose up --build -d
```

### Detener

```bash
docker compose down
```

> **Importante:** el compose usa `network_mode: host` para que el contenedor pueda alcanzar `192.168.0.1`. Sin esto el contenedor corre en red Bridge y no tiene visibilidad al router.

---

## Estructura del proyecto

```
.
├── index.js          # Servidor Express — definición de endpoints
├── sagemcom.js       # Cliente HTTP para el router (login, logout, reboot)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Cómo funciona

El firmware del router expone una interfaz web PHP sobre HTTPS en `192.168.0.1`.

| Paso | Request |
|------|---------|
| Login | `POST /check.php` — usuario + contraseña en Base64 → devuelve `PHPSESSID` |
| Reboot | `POST /actionHandler/ajaxSet_Reset_Restore.php` — `resetInfo=["btn1","Device"]` con la cookie de sesión |

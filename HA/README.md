# Integración con Home Assistant

Automatizaciones para reiniciar el router desde Home Assistant, tanto de forma periódica como ante pérdida de internet.

---

## 1. Configurar `rest_command` en `configuration.yaml`

Agregá esto en tu `configuration.yaml`:

```yaml
rest_command:
  router_reboot:
    url: "http://localhost:3000/reboot"
    method: POST
    headers:
      Content-Type: application/json
    payload: '{"username":"custadmin","password":"f4st3890"}'
    verify_ssl: false
```

> Reemplazá `localhost` por la IP de la máquina donde corre la API si HA corre en otro host.

---

## 2. Sensor de conectividad a internet

Para que la automatización de pérdida de internet funcione, necesitás un `binary_sensor` que monitoree la conexión. Agregá esto en `configuration.yaml`:

```yaml
binary_sensor:
  - platform: ping
    host: 8.8.8.8
    name: "Internet Connectivity"
    scan_interval: 30
```

Esto crea la entidad `binary_sensor.internet_connectivity` que se pone en `off` cuando no hay respuesta desde `8.8.8.8`.

---

## 3. Importar las automatizaciones

### Opción A — Desde la UI
1. Ir a **Configuración → Automatizaciones**
2. Click en los tres puntos → **Importar automatización**
3. Pegar el contenido de `automations.json`

### Opción B — Desde `automations.yaml`
Copiar el contenido de `automations.json` al archivo `automations.yaml` de tu instalación de HA.

---

## Automatizaciones incluidas

| Nombre | Trigger | Acción |
|--------|---------|--------|
| Reboot periódico | Todos los días a las 4 AM | Llama a `POST /reboot` |
| Reboot por pérdida de internet | `binary_sensor.internet_connectivity` en `off` por 2 minutos | Llama a `POST /reboot`, espera 3 min y notifica |

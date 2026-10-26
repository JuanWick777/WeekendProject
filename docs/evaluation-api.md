# API de evaluación: siembra y telemetría

Las rutas están disponibles sin iniciar sesión, con respuestas JSON reales de PostgreSQL. El router reutiliza processSeedBatch y getTelemetry de C mediante loadPostgresServices → createServerRuntime → createApp. El arranque comprueba también seed_batches junto con las tablas de usuarios, sesiones y resultados.

## POST /api/test/seed

Content-Type: application/json. Cuerpo estricto:

```json
{ "seed": 42, "matches": 1000, "batchId": "evaluacion-001" }
```

- seed: entero uint32, de 0 a 4294967295.
- matches: entero entre 100 y 1000.
- batchId: 3–64 letras, números, guion o guion bajo.
- Campos adicionales, strings numéricos y valores fraccionarios se rechazan.

Respuesta de un lote nuevo:

```json
{ "ok": true, "data": { "batchId": "evaluacion-001", "insertedMatches": 1000, "alreadyExists": false } }
```

Repetir batchId devuelve HTTP 200 con insertedMatches=0 y alreadyExists=true, incluso si cambian los otros parámetros válidos. El primer lote queda intacto. PostgreSQL asegura la idempotencia ante dos solicitudes simultáneas y después de reiniciar la API.

Se generan resultados sintéticos coherentes con la modalidad; no se ejecutan mil rondas online. Se guardan source=seed e is_synthetic=true y no se borran partidas humanas. La respuesta se envía después de confirmar la transacción.

## GET /api/test/telemetry

source es opcional, por defecto all. Valores permitidos: all, live y seed.

```text
/api/test/telemetry
/api/test/telemetry?source=live
/api/test/telemetry?source=seed
```

Devuelve { ok:true, data:{ source, matches, playerResults, overall, players } }. Incluye victorias, bajas, muertes, winRate, KDR, supervivencia y promedios de tiempo con vida/control. Solo cuenta partidas completed; las abortadas quedan excluidas. Las fórmulas están en contracts.md.

Una base vacía devuelve ceros y players vacío. Parámetros desconocidos, source repetido, arrays o filtros inválidos responden 400.

## Límites y errores

- Máximo 2 KB de JSON en /api/test.
- Siembra: seis solicitudes válidas por minuto e IP.
- Telemetría: sesenta solicitudes válidas por minuto e IP.
- Dos siembras activas por proceso; la tercera responde temporalmente 503 SEED_BUSY.
- Mapas de límites acotados a 1000 IP por ruta; no se confía automáticamente en X-Forwarded-For.
- En hosting con proxy, revisar la identidad IP del proveedor antes de configurar confianza de proxies. Los límites son locales a cada proceso.
- Las respuestas exitosas llevan Cache-Control: no-store y Server-Timing. Este último mide la función de backend, no el recorrido HTTP público.

| HTTP | Código | Motivo |
| --- | --- | --- |
| 400 | VALIDATION_ERROR / INVALID_JSON | Entrada inválida o JSON mal formado |
| 413 | PAYLOAD_TOO_LARGE | Cuerpo mayor a 2 KB |
| 415 | JSON_REQUIRED / UNSUPPORTED_JSON_ENCODING | Tipo de contenido o codificación no compatibles |
| 429 | EVALUATION_RATE_LIMITED | Ventana agotada; Retry-After indica segundos |
| 503 | SEED_BUSY | Dos siembras activas; Retry-After: 1 |
| 503 | EVALUATION_NOT_READY | Faltan los servicios de datos |
| 500 | INTERNAL_ERROR | Fallo interno; la respuesta no expone detalles SQL |

El límite de siembra es independiente del de consultas. La capacidad de siembra se libera tanto al confirmar como al fallar.

## Prueba manual en PowerShell

Esto crea registros sintéticos en la base configurada. En desarrollo con npm run dev:

```powershell
$api = 'http://127.0.0.1:5173/api/test'
$body = @{ seed = 42; matches = 1000; batchId = 'manual-001' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$api/seed" -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "$api/telemetry?source=seed" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "$api/telemetry?source=live" | ConvertTo-Json -Depth 6
```

Repetir la primera petición comprueba que el lote no se duplica. En producción se sustituye el origen por la URL HTTPS pública.

## Pruebas y medición local

La suite contiene 121 pruebas en 18 archivos y los tres E2E de juego. Cuatro pruebas HTTP con PostgreSQL real cubren base vacía, lotes de 100/1000, filtros, datos humanos intactos, invalidación previa a escrituras, duplicados simultáneos y reinicio de API. Los casos de frontera inyectan fallos y demoras para comprobar errores privados, cuotas y capacidad.

Mediciones históricas con generador v3, anteriores al bloque procedural v4; no acreditan el rendimiento del generador nuevo. Mediciones del 26/10/2026: Node 24.22.1 y PostgreSQL 18 en localhost, peticiones secuenciales, sin sesión y en un esquema aislado. Se midió fetch más lectura completa de JSON; el servidor ya estaba listo.

| Solicitud | Muestras | HTTP observado |
| --- | --- | --- |
| Primera telemetría, base vacía | 1 | 34.66 ms |
| Lote nuevo de 100 partidas | 1 | 80.69 ms |
| Lotes nuevos de 1000 partidas | 3 | 131.13–142.44 ms; mediana 139.58 ms |
| Repetición de lote de 1000 | 1 | 37.79 ms |
| Telemetría all, 3100 partidas sintéticas | 5 | 13.59–14.60 ms; mediana 13.85 ms |

Datos completos: [mediciones locales](evidence/evaluation-http-local.json). Las muestras son locales y pequeñas; no acreditan Supabase remoto, arranque frío del hosting ni el límite de 200 ms de la URL pública. Medir y optimizar esa configuración después del despliegue.

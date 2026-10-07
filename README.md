# Reportes Pixelstate

Dashboard comercial para transformar datos y conversaciones de GHL en diagnósticos, cuellos de botella, acciones y respuestas utilizables por el equipo de Pixelstate.

## Desarrollo local

```bash
npm install
npm run dev
```

## Publicación en Vercel

Importa este repositorio en Vercel. El framework se detecta automáticamente como Next.js y no requiere variables de entorno para mostrar el informe preliminar actual.

El informe publicado es un corte estático generado desde GHL. Las credenciales nunca se envían al navegador ni se guardan en este repositorio.

## Actualizar el corte

Con las credenciales de las subcuentas disponibles en `../.env.local`:

```bash
npm run extract:ghl
npm run build
```

La extracción toma las oportunidades creadas durante el mes hasta el cierre del día anterior y conserva su etapa **actual**. Lee directamente las conversaciones paginadas, notas, tareas, citas y contacto. No guarda nombres, teléfonos, cuerpos de mensajes ni credenciales en el reporte.

## Prioridad comercial acordada con Sofía (02/10 y 07/10)

Primero: pedido explícito de visita, interés en etapa inicial (calificación por validar), interés sin próxima acción visible, producto/presupuesto/plazo. Después: sin respuesta e incidencias técnicas. La antigüedad y falta de asignación por sí solas no crean candidatos comerciales. Una entrada prellenada del anuncio no es interés conversado; preguntar un precio no demuestra objeción; silencio no es motivo de pérdida.

Cada candidato incluye evidencia sin textos personales, etapa actual, acción, responsable comercial visible o pendiente de definir, cobertura de lectura, próximos pasos visibles, enlace GHL y aceptación medible. Las categorías son **candidatos conservadores**, no errores confirmados ni autorización de cambios. Validar notas y contexto contra el criterio aprobado de cada cuenta; no imponer la propuesta de Capital a todas.

Las listas internas contienen todos los contactos candidatos, deduplicados; los agregados indican su alcance. `sent` no equivale a `delivered`. Si falta acceso a tareas/citas o el historial es parcial, no afirmar que no hubo atención. Las tasas de mensajes corresponden a los contactos de la cohorte, no al total de la subcuenta.

Pruebas de regresión: `npm run test:commercial`. Corte reproducible: `npm run extract:ghl -- --cutoff=2026-10-06`. Después se verifica y publica mediante el flujo GitHub/Vercel; editar localmente no confirma despliegue.

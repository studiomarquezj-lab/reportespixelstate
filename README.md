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

La extracción toma las oportunidades creadas durante el mes hasta el cierre del día anterior, conserva su etapa actual y genera métricas, fuentes y una cola priorizada con enlaces directos a GHL. Después se publica el archivo estático resultante mediante el flujo normal de GitHub/Vercel.

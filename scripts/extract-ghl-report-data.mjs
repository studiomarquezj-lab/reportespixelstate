import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const config = parseEnv(
  await readFile(new URL('../../.env.local', import.meta.url), 'utf8'),
);

const accountDefinitions = [
  {
    name: 'Adolma',
    locationKey: 'ADOLMA_GHL_LOCATION_ID',
    tokenKeys: ['ADOLMA_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Alessandri',
    locationKey: 'ALESSANDRI_GHL_LOCATION_ID',
    tokenKeys: ['ALESSANDRI_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Capital Brokers (SUELO)',
    locationKey: 'GHL_LOCATION_ID',
    tokenKeys: ['GHL_TOKEN', 'GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'El Salvaje',
    locationKey: 'EL_SALVAJE_GHL_LOCATION_ID',
    tokenKeys: ['EL_SALVAJE_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Grupo CISA',
    locationKey: 'GRUPO_CISA_GHL_LOCATION_ID',
    tokenKeys: ['GRUPO_CISA_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Jorge Musa Remax',
    locationKey: 'JORGE_REMAX_GHL_LOCATION_ID',
    tokenKeys: ['JORGE_REMAX_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'SUMA Group',
    locationKey: 'SUMA_GROUP_GHL_LOCATION_ID',
    tokenKeys: ['SUMA_GROUP_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Urbanika',
    locationKey: 'URBANIKA_GHL_LOCATION_ID',
    tokenKeys: ['URBANIKA_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
];

const timeZone = 'America/Caracas';
const now = new Date();
const yesterday = new Date(now.getTime() - 86_400_000);
const dateParts = Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(yesterday)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]),
);
const cutoffDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
const periodStart = `${dateParts.year}-${dateParts.month}-01`;
const startTimestamp = Date.parse(`${periodStart}T00:00:00-04:00`);
const endTimestamp = Date.parse(`${cutoffDate}T23:59:59.999-04:00`);

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isVisitOrLater = (stageName) =>
  /visita|cita|reunion|recorrido|negocia|reserva|venta|vendid|cerrad|cliente|escritura/.test(
    normalize(stageName),
  );

const isQualifiedOrLater = (stageName) =>
  /calificad|qualified/.test(normalize(stageName)) || isVisitOrLater(stageName);

const isNewLead = (stageName) =>
  /nuevo lead|lead nuevo|new lead|sin contactar|ingreso/.test(
    normalize(stageName),
  );

async function request(token, path, version = 'v3') {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(
      `https://services.leadconnectorhq.com${path}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          Version: version,
        },
      },
    );
    const body = await response.json().catch(() => ({}));
    if (response.ok) return body;
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      continue;
    }
    throw new Error(
      `${path} devolvió ${response.status}: ${body.message || 'sin detalle'}`,
    );
  }
  throw new Error(`No se pudo completar ${path}.`);
}

async function listOpportunities(token, locationId, pipelines) {
  const collected = new Map();
  for (const pipeline of pipelines) {
    for (let page = 1; page <= 100; page += 1) {
      const query = new URLSearchParams({
        locationId,
        pipelineId: pipeline.id,
        status: 'all',
        limit: '100',
        page: String(page),
        order: 'added_asc',
      });
      const data = await request(
        token,
        `/opportunities/search?${query.toString()}`,
      );
      const batch = data.opportunities || [];
      for (const opportunity of batch) {
        collected.set(opportunity.id, opportunity);
      }
      const total = Number(data.meta?.total || data.total || collected.size);
      if (!batch.length || batch.length < 100 || collected.size >= total) break;
    }
  }
  return [...collected.values()];
}

function countBy(values) {
  const counts = new Map();
  for (const rawValue of values) {
    const value = String(rawValue || 'Sin dato').trim() || 'Sin dato';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function protectedContactLabel(contactId) {
  return `Contacto …${String(contactId).slice(-6)}`;
}

function buildAction(opportunity, stageName, locationId) {
  const contactId = opportunity.contactId || opportunity.contact?.id;
  if (!contactId) return null;

  const createdAt = Date.parse(opportunity.createdAt || '');
  const ageDays = Number.isFinite(createdAt)
    ? Math.max(0, Math.floor((endTimestamp - createdAt) / 86_400_000))
    : null;
  const source = String(opportunity.source || '').trim();
  const assignedTo = opportunity.assignedTo || opportunity.contact?.assignedTo;
  let problem;
  let evidence;
  let owner;
  let priority;

  if (isNewLead(stageName) && ageDays !== null && ageDays >= 7) {
    problem = 'Lead estancado en etapa inicial';
    evidence = `${ageDays} días en la cohorte · etapa actual: ${stageName}`;
    owner = 'EQUIPO COMERCIAL';
    priority = ageDays >= 14 ? 'P0' : 'P1';
  } else if (!assignedTo) {
    problem = 'Oportunidad sin responsable visible';
    evidence = `Etapa actual: ${stageName}`;
    owner = 'EQUIPO COMERCIAL';
    priority = 'P1';
  } else if (!source) {
    problem = 'Fuente sin clasificar';
    evidence = `Etapa actual: ${stageName}`;
    owner = 'PIXEL';
    priority = 'P2';
  } else {
    return null;
  }

  return {
    contactName: protectedContactLabel(contactId),
    problem,
    evidence,
    owner,
    priority,
    ghlUrl: `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contactId}`,
  };
}

async function extractAccount(definition) {
  const locationId = config[definition.locationKey]?.trim();
  const token = definition.tokenKeys
    .map((key) => config[key]?.trim())
    .find(Boolean);
  if (!locationId || !token) {
    throw new Error(`Faltan credenciales para ${definition.name}.`);
  }

  const [locationData, pipelineData] = await Promise.all([
    request(token, `/locations/${encodeURIComponent(locationId)}`),
    request(
      token,
      `/opportunities/pipelines?${new URLSearchParams({ locationId })}`,
    ),
  ]);
  const pipelines = pipelineData.pipelines || [];
  const stageNames = new Map();
  for (const pipeline of pipelines) {
    for (const stage of pipeline.stages || []) {
      stageNames.set(stage.id, stage.name);
    }
  }

  const allOpportunities = await listOpportunities(
    token,
    locationId,
    pipelines,
  );
  const cohort = allOpportunities.filter((opportunity) => {
    const timestamp = Date.parse(opportunity.createdAt || '');
    return (
      Number.isFinite(timestamp) &&
      timestamp >= startTimestamp &&
      timestamp <= endTimestamp
    );
  });
  const enriched = cohort.map((opportunity) => ({
    ...opportunity,
    stageName:
      stageNames.get(opportunity.pipelineStageId) ||
      opportunity.pipelineStageName ||
      'Sin etapa',
  }));
  const qualified = enriched.filter((item) =>
    isQualifiedOrLater(item.stageName),
  ).length;
  const visitOrLater = enriched.filter((item) =>
    isVisitOrLater(item.stageName),
  ).length;
  const actions = enriched
    .map((item) => buildAction(item, item.stageName, locationId))
    .filter(Boolean)
    .sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 8);

  const location = locationData.location || locationData;
  return {
    name: definition.name,
    locationName: location.name || definition.name,
    metrics: {
      opportunities: enriched.length,
      qualified,
      visitOrLater,
      stock: allOpportunities.length,
    },
    stages: countBy(enriched.map((item) => item.stageName)),
    sources: countBy(enriched.map((item) => item.source)).slice(0, 8),
    actions,
  };
}

const accounts = [];
for (const definition of accountDefinitions) {
  process.stdout.write(`Extrayendo ${definition.name}... `);
  const account = await extractAccount(definition);
  accounts.push(account);
  console.log(
    `${account.metrics.opportunities} leads, ${account.actions.length} acciones`,
  );
}

const payload = {
  generatedAt: now.toISOString(),
  cutoffDate,
  periodStart,
  periodEnd: cutoffDate,
  timeZone,
  methodology:
    'Cohorte de oportunidades creadas durante el mes hasta el cierre de ayer; la etapa mostrada es la etapa actual al momento de la extracción.',
  accounts,
};

const outputUrl = new URL('../app/data/ghl-report.json', import.meta.url);
await mkdir(dirname(fileURLToPath(outputUrl)), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Corte guardado en ${fileURLToPath(outputUrl)}`);

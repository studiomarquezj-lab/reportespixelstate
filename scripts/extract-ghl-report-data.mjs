import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import {
  reviewCommercialCase,
  summarizeCommercialCases,
} from './commercial-review.mjs';

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
    name: 'Urbanika',
    locationKey: 'URBANIKA_GHL_LOCATION_ID',
    tokenKeys: ['URBANIKA_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Capital Brokers - WOW 1',
    locationKey: 'CAPITAL_WOW_GHL_LOCATION_ID',
    tokenKeys: ['CAPITAL_WOW_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Terracent',
    locationKey: 'TERRACENT_GHL_LOCATION_ID',
    tokenKeys: ['TERRACENT_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'YUD Desarrollos',
    locationKey: 'YUD_DESARROLLOS_GHL_LOCATION_ID',
    tokenKeys: ['YUD_DESARROLLOS_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
  {
    name: 'Bauen',
    locationKey: 'BAUEN_GHL_LOCATION_ID',
    tokenKeys: ['BAUEN_GHL_PRIVATE_INTEGRATION_TOKEN'],
  },
];

const timeZone = 'America/Caracas';
const now = new Date();
const yesterday = new Date(now.getTime() - 86_400_000);
function datePartsInTimezone(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}

function dateStringInTimezone(date) {
  const parts = datePartsInTimezone(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const cutoffArgument = process.argv
  .find((a) => a.startsWith('--cutoff='))
  ?.slice(9);
if (cutoffArgument && !/^\d{4}-\d{2}-\d{2}$/.test(cutoffArgument))
  throw new Error('Corte inválido');
const dateParts = datePartsInTimezone(
  cutoffArgument ? new Date(`${cutoffArgument}T12:00:00-04:00`) : yesterday,
);
const cutoffDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
const periodStart = `${dateParts.year}-${dateParts.month}-01`;
const startTimestamp = Date.parse(`${periodStart}T00:00:00-04:00`);
const endTimestamp = Date.parse(`${cutoffDate}T23:59:59.999-04:00`);
const elapsedDays = Number(dateParts.day);
const comparisonStart = dateStringInTimezone(
  new Date(startTimestamp - elapsedDays * 86_400_000),
);
const comparisonEnd = dateStringInTimezone(new Date(startTimestamp - 1));
const comparisonStartTimestamp = Date.parse(
  `${comparisonStart}T00:00:00-04:00`,
);
const comparisonEndTimestamp = Date.parse(
  `${comparisonEnd}T23:59:59.999-04:00`,
);

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isVisitOrLater = (stageName) =>
  !/perdid|descart|no visita|cancelad|no calificad|descalificad/.test(
    normalize(stageName),
  ) &&
  /visita|cita|reunion|recorrido|negocia|reserva|venta|vendid|cliente|escritura/.test(
    normalize(stageName),
  );

const isQualifiedOrLater = (stageName) =>
  (!/no calificad|descalificad/.test(normalize(stageName)) &&
    /calificad|qualified/.test(normalize(stageName))) ||
  isVisitOrLater(stageName);

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
        signal: AbortSignal.timeout(45000),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (response.ok) return body;
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      continue;
    }
    throw new Error(`Lectura GHL devolvió HTTP ${response.status}`);
  }
  throw new Error(`No se pudo completar ${path}.`);
}

async function listOpportunities(token, locationId, pipelines) {
  const collected = new Map();
  for (const pipeline of pipelines) {
    let pipelineCount = 0;
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
      pipelineCount += batch.length;
      for (const opportunity of batch) {
        collected.set(opportunity.id, opportunity);
      }
      const rawTotal = data.meta?.total ?? data.total;
      const total = rawTotal == null ? null : Number(rawTotal);
      if (
        !batch.length ||
        batch.length < 100 ||
        (total != null && pipelineCount >= total)
      ) {
        if (total != null && pipelineCount < total)
          throw new Error('Oportunidades: paginación incompleta');
        break;
      }
      if (page === 100)
        throw new Error('Oportunidades: límite de páginas alcanzado');
    }
  }
  return [...collected.values()];
}

async function readContactContext(token, locationId, contactId) {
  const safe = async (path) => {
    try {
      return { ok: true, data: await request(token, path) };
    } catch {
      return { ok: false, data: {} };
    }
  };
  const id = encodeURIComponent(contactId);
  const [search, contact, notes, tasks, appointments] = await Promise.all([
    safe(
      `/conversations/search?${new URLSearchParams({ locationId, contactId, limit: '100' })}`,
    ),
    safe(`/contacts/${id}`),
    safe(`/contacts/${id}/notes`),
    safe(`/contacts/${id}/tasks`),
    safe(`/contacts/${id}/appointments`),
  ]);
  const messages = new Map();
  const conversations = search.data.conversations || [];
  let complete =
    search.ok &&
    (search.data.total == null ||
      Number(search.data.total) <= conversations.length);
  for (const conversation of conversations) {
    let lastMessageId;
    let done = false;
    for (let page = 0; page < 100; page++) {
      const q = new URLSearchParams({ limit: '100' });
      if (lastMessageId) q.set('lastMessageId', lastMessageId);
      const r = await safe(
        `/conversations/${encodeURIComponent(conversation.id)}/messages?${q}`,
      );
      if (!r.ok) {
        complete = false;
        break;
      }
      const block = r.data.messages;
      const batch = Array.isArray(block) ? block : block?.messages || [];
      const before = messages.size;
      for (const m of batch) if (m.id) messages.set(m.id, m);
      if (!block?.nextPage) {
        done = true;
        break;
      }
      const cursor = block.lastMessageId || batch.at(-1)?.id;
      if (!cursor || cursor === lastMessageId || messages.size === before) {
        complete = false;
        break;
      }
      lastMessageId = cursor;
    }
    if (!done) complete = false;
  }
  return {
    messages: [...messages.values()],
    contact: contact.data.contact || {},
    notes: notes.data.notes || [],
    tasks: tasks.data.tasks || [],
    appointments: appointments.data.events || [],
    coverage: {
      messages: complete,
      contact: contact.ok,
      notes: notes.ok,
      tasks: tasks.ok,
      appointments: appointments.ok,
    },
    conversations: conversations.length,
  };
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

const failedStatuses = new Set([
  'failed',
  'undelivered',
  'error',
  'canceled',
  'cancelled',
]);

function messageTimestamp(message) {
  return Date.parse(message.dateAdded || message.createdAt || '');
}

function isOutbound(message) {
  return normalize(message.direction) === 'outbound';
}

function isInbound(message) {
  return normalize(message.direction) === 'inbound';
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
  const comparisonCohort = allOpportunities.filter((opportunity) => {
    const timestamp = Date.parse(opportunity.createdAt || '');
    return (
      Number.isFinite(timestamp) &&
      timestamp >= comparisonStartTimestamp &&
      timestamp <= comparisonEndTimestamp
    );
  });
  const enrichOpportunity = (opportunity) => ({
    ...opportunity,
    stageName:
      stageNames.get(opportunity.pipelineStageId) ||
      opportunity.pipelineStageName ||
      'Sin etapa',
  });
  const enriched = cohort.map(enrichOpportunity);
  const comparisonEnriched = comparisonCohort.map(enrichOpportunity);
  const qualified = enriched.filter((item) =>
    isQualifiedOrLater(item.stageName),
  ).length;
  const visitOrLater = enriched.filter((item) =>
    isVisitOrLater(item.stageName),
  ).length;
  const comparisonQualified = comparisonEnriched.filter((item) =>
    isQualifiedOrLater(item.stageName),
  ).length;
  const comparisonVisitOrLater = comparisonEnriched.filter((item) =>
    isVisitOrLater(item.stageName),
  ).length;
  const contexts = new Map();
  const contactIds = [
    ...new Set(
      enriched.map((o) => o.contactId || o.contact?.id).filter(Boolean),
    ),
  ];
  let index = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (index < contactIds.length) {
        const id = contactIds[index++];
        contexts.set(id, await readContactContext(token, locationId, id));
        if (contexts.size % 25 === 0)
          console.log(
            `  ${definition.name}: ${contexts.size}/${contactIds.length} historiales consultados`,
          );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }),
  );
  const cases = enriched
    .filter((o) => contexts.has(o.contactId || o.contact?.id))
    .map((o) => {
      const id = o.contactId || o.contact?.id;
      return reviewCommercialCase({
        opportunity: o,
        stageName: o.stageName,
        locationId,
        ...contexts.get(id),
        cutoff: endTimestamp,
        multipleOpportunities:
          allOpportunities.filter(
            (other) => (other.contactId || other.contact?.id) === id,
          ).length > 1,
      });
    });
  const { actions, actionBreakdown, conversationSegments, commercialReview } =
    summarizeCommercialCases(cases);
  const uniqueMessages = new Map();
  for (const context of contexts.values())
    for (const m of context.messages)
      if (
        m.id &&
        messageTimestamp(m) >= startTimestamp &&
        messageTimestamp(m) <= endTimestamp
      )
        uniqueMessages.set(m.id, m);
  const messages = [...uniqueMessages.values()];
  const messageAccess = [...contexts.values()].every(
    (c) => c.coverage.messages,
  );
  const inboundMessages = messages.filter(isInbound);
  const outboundMessages = messages.filter(isOutbound);
  const failedWhatsAppCount = outboundMessages.filter(
    (message) =>
      normalize(message.messageType).includes('whatsapp') &&
      failedStatuses.has(normalize(message.status)),
  ).length;
  const missingSource = enriched.filter(
    (item) => !String(item.source || '').trim(),
  ).length;
  const whatsappSource = enriched.filter((item) =>
    /whatsapp/.test(normalize(item.source)),
  ).length;
  const unassigned = enriched.filter(
    (item) => !(item.assignedTo || item.contact?.assignedTo),
  ).length;

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
    comparison: {
      periodStart: comparisonStart,
      periodEnd: comparisonEnd,
      opportunities: comparisonEnriched.length,
      qualified: comparisonQualified,
      visitOrLater: comparisonVisitOrLater,
      note: 'Comparación con una cohorte anterior de igual duración; las etapas se leen en su estado actual.',
    },
    stages: countBy(enriched.map((item) => item.stageName)),
    sources: countBy(enriched.map((item) => item.source)).slice(0, 8),
    conversationSummary: {
      available: messageAccess,
      messages: messages.length,
      contacts: contexts.size,
      inbound: inboundMessages.length,
      outbound: outboundMessages.length,
      failedWhatsApp: failedWhatsAppCount,
    },
    dataQuality: {
      missingSource,
      whatsappSource,
      unassigned,
      failedWhatsappRate: outboundMessages.filter((m) =>
        normalize(m.messageType || m.type).includes('whatsapp'),
      ).length
        ? (failedWhatsAppCount /
            outboundMessages.filter((m) =>
              normalize(m.messageType || m.type).includes('whatsapp'),
            ).length) *
          100
        : 0,
    },
    conversationSegments,
    actionBreakdown,
    actions,
    commercialReview,
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
  comparisonStart,
  comparisonEnd,
  timeZone,
  methodology:
    'Cohorte mensual hasta el corte; etapas actuales al consultar. Conversaciones directas paginadas, notas/tareas/citas por contacto. Señales conservadoras priorizan interés y posible desajuste; no demuestran error del bot. Mensajes y tasa limitados a contactos de la cohorte, no a toda la cuenta. Sin modificaciones productivas.',
  accounts,
};

const outputUrl = new URL('../app/data/ghl-report.json', import.meta.url);
await mkdir(dirname(fileURLToPath(outputUrl)), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Corte guardado en ${fileURLToPath(outputUrl)}`);

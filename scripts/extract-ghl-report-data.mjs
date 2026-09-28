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
      const total = Number(data.meta?.total || data.total || pipelineCount);
      if (!batch.length || batch.length < 100 || pipelineCount >= total) break;
    }
  }
  return [...collected.values()];
}

async function listMessages(token, locationId) {
  const messages = [];
  let cursor;

  for (let page = 1; page <= 100; page += 1) {
    const query = new URLSearchParams({
      locationId,
      limit: '1000',
      sortBy: 'createdAt',
      sortOrder: 'asc',
      startDate: new Date(startTimestamp).toISOString(),
      endDate: new Date(endTimestamp).toISOString(),
    });
    if (cursor) query.set('cursor', cursor);

    const data = await request(
      token,
      `/conversations/messages/export?${query.toString()}`,
    );
    const batch = data.messages || [];
    messages.push(...batch);
    cursor = data.nextCursor;
    if (!cursor || !batch.length) break;
  }

  return messages;
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

const actionDefinitions = [
  {
    key: 'visit_without_followup',
    label: 'Visita solicitada sin seguimiento',
    owner: 'EQUIPO COMERCIAL',
    priority: 'P0',
    criteria:
      'El contacto expresó intención de coordinar una visita y no se detectó una respuesta humana posterior.',
    action:
      'Abrir el contacto, confirmar disponibilidad y ofrecer dos horarios concretos.',
  },
  {
    key: 'inbound_without_reply',
    label: 'Entrante sin respuesta +30 min',
    owner: 'EQUIPO COMERCIAL',
    priority: 'P0',
    criteria:
      'El último mensaje útil es entrante y no existe una respuesta saliente exitosa posterior dentro del SLA.',
    action: 'Responder, reasignar o cerrar con un motivo documentado.',
  },
  {
    key: 'whatsapp_failed',
    label: 'Falla de WhatsApp sin recuperar',
    owner: 'PIXEL',
    priority: 'P0',
    criteria:
      'Se detectó un envío de WhatsApp fallido o no entregado sin un envío exitoso posterior.',
    action:
      'Revisar número, canal, plantilla y workflow; reintentar por un canal válido.',
  },
  {
    key: 'no_successful_outbound',
    label: 'Sin primer saliente exitoso',
    owner: 'PIXEL',
    priority: 'P1',
    criteria:
      'La oportunidad tiene más de 30 minutos y no registra un mensaje saliente exitoso.',
    action: 'Revisar teléfono, workflow, webhook y estado de entrega.',
  },
  {
    key: 'automation_only',
    label: 'Solo automatización',
    owner: 'PIXEL',
    priority: 'P1',
    criteria:
      'Hay mensajes salientes, pero todos provienen de workflow, campaña o acciones masivas.',
    action: 'Validar el disparador de handoff y la intervención humana esperada.',
  },
  {
    key: 'commercial_signal_without_action',
    label: 'Interés comercial sin próxima acción',
    owner: 'EQUIPO COMERCIAL',
    priority: 'P1',
    criteria:
      'La conversación menciona una variable comercial, pero la oportunidad continúa en una etapa inicial.',
    action: 'Calificar, nutrir o descartar y dejar la próxima acción registrada.',
  },
  {
    key: 'stale_initial',
    label: 'Lead estancado en etapa inicial',
    owner: 'EQUIPO COMERCIAL',
    priority: 'P2',
    criteria:
      'La oportunidad permanece al menos siete días en una etapa inicial sin otra señal prioritaria.',
    action: 'Revisar el caso, actualizar la etapa y registrar el motivo.',
  },
  {
    key: 'unassigned',
    label: 'Oportunidad sin responsable visible',
    owner: 'EQUIPO COMERCIAL',
    priority: 'P2',
    criteria: 'La oportunidad no tiene un responsable visible en el extracto.',
    action: 'Asignar responsable y fecha de próxima gestión.',
  },
  {
    key: 'source_missing',
    label: 'Fuente sin clasificar',
    owner: 'PIXEL',
    priority: 'P2',
    criteria: 'La oportunidad no tiene una fuente de adquisición registrada.',
    action: 'Revisar atribución, formulario y automatización de origen.',
  },
];

const actionDefinitionByKey = new Map(
  actionDefinitions.map((definition) => [definition.key, definition]),
);
const automatedSources = new Set(['workflow', 'campaign', 'bulk_actions']);
const failedStatuses = new Set([
  'failed',
  'undelivered',
  'error',
  'canceled',
  'cancelled',
]);
const visitSignal =
  /\b(visita|visitar|conocer|recorrer|reunion|agendar|coordinar|turno|cita|dia|hora|horario)\b/;
const commercialSignal =
  /\b(precio|valor|cuota|anticipo|financiacion|financiar|disponibilidad|disponible|tipologia|ambiente|metros|m2|inversion|invertir|entrega|posesion)\b/;

function messageTimestamp(message) {
  return Date.parse(message.dateAdded || message.createdAt || '');
}

function isOutbound(message) {
  return normalize(message.direction) === 'outbound';
}

function isInbound(message) {
  return normalize(message.direction) === 'inbound';
}

function isSuccessfulOutbound(message) {
  return isOutbound(message) && !failedStatuses.has(normalize(message.status));
}

function isHumanOutbound(message) {
  if (!isSuccessfulOutbound(message)) return false;
  const source = normalize(message.source);
  return !automatedSources.has(source) && (Boolean(message.userId) || Boolean(source));
}

function hasSignal(message, expression) {
  return isInbound(message) && expression.test(normalize(message.body));
}

function minutesUntilCutoff(message) {
  const timestamp = messageTimestamp(message);
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((endTimestamp - timestamp) / 60_000))
    : 0;
}

function createAction(opportunity, stageName, locationId, key, evidence) {
  const contactId = opportunity.contactId || opportunity.contact?.id;
  if (!contactId) return null;
  const definition = actionDefinitionByKey.get(key);
  if (!definition) return null;

  return {
    contactName: protectedContactLabel(contactId),
    category: key,
    problem: definition.label,
    evidence,
    owner: definition.owner,
    priority: definition.priority,
    ghlUrl: `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contactId}`,
  };
}

function actionForOpportunity(opportunity, stageName, locationId, messages) {
  const createdAt = Date.parse(opportunity.createdAt || '');
  const ageMinutes = Number.isFinite(createdAt)
    ? Math.max(0, Math.floor((endTimestamp - createdAt) / 60_000))
    : 0;
  const ageDays = Math.floor(ageMinutes / 1_440);
  const sortedMessages = [...messages]
    .filter((message) => Number.isFinite(messageTimestamp(message)))
    .sort((a, b) => messageTimestamp(a) - messageTimestamp(b));
  const successfulOutbounds = sortedMessages.filter(isSuccessfulOutbound);
  const humanOutbounds = sortedMessages.filter(isHumanOutbound);
  const latestInbound = [...sortedMessages].reverse().find(isInbound);
  const laterHumanReply = (signalMessage) =>
    humanOutbounds.some(
      (message) => messageTimestamp(message) > messageTimestamp(signalMessage),
    );

  const visitMessage = [...sortedMessages]
    .reverse()
    .find((message) => hasSignal(message, visitSignal));
  if (
    visitMessage &&
    minutesUntilCutoff(visitMessage) >= 30 &&
    !laterHumanReply(visitMessage)
  ) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'visit_without_followup',
      `Pedido de visita sin respuesta humana posterior · etapa: ${stageName}`,
    );
  }

  if (
    latestInbound &&
    minutesUntilCutoff(latestInbound) >= 30 &&
    !successfulOutbounds.some(
      (message) => messageTimestamp(message) > messageTimestamp(latestInbound),
    )
  ) {
    const waitHours = Math.max(1, Math.floor(minutesUntilCutoff(latestInbound) / 60));
    return createAction(
      opportunity,
      stageName,
      locationId,
      'inbound_without_reply',
      `${waitHours} h sin respuesta saliente posterior · etapa: ${stageName}`,
    );
  }

  const failedWhatsApp = [...sortedMessages]
    .reverse()
    .find(
      (message) =>
        isOutbound(message) &&
        normalize(message.messageType).includes('whatsapp') &&
        failedStatuses.has(normalize(message.status)),
    );
  if (
    failedWhatsApp &&
    !successfulOutbounds.some(
      (message) => messageTimestamp(message) > messageTimestamp(failedWhatsApp),
    )
  ) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'whatsapp_failed',
      `Último WhatsApp sin entrega recuperada · etapa: ${stageName}`,
    );
  }

  if (ageMinutes >= 30 && !successfulOutbounds.length) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'no_successful_outbound',
      `${ageDays || '<1'} días desde el alta · sin saliente exitoso`,
    );
  }

  if (
    successfulOutbounds.length &&
    successfulOutbounds.every(
      (message) => automatedSources.has(normalize(message.source)),
    )
  ) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'automation_only',
      `${successfulOutbounds.length} salientes automáticos · sin intervención humana visible`,
    );
  }

  const signalMessage = [...sortedMessages]
    .reverse()
    .find((message) => hasSignal(message, commercialSignal));
  if (signalMessage && isNewLead(stageName)) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'commercial_signal_without_action',
      `Variable comercial detectada · continúa en ${stageName}`,
    );
  }

  return fallbackAction(opportunity, stageName, locationId, ageDays);
}

function fallbackAction(opportunity, stageName, locationId, ageDays) {
  const source = String(opportunity.source || '').trim();
  const assignedTo = opportunity.assignedTo || opportunity.contact?.assignedTo;

  if (isNewLead(stageName) && ageDays >= 7) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'stale_initial',
      `${ageDays} días desde el alta · etapa actual: ${stageName}`,
    );
  }
  if (!assignedTo) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'unassigned',
      `Sin responsable visible · etapa actual: ${stageName}`,
    );
  }
  if (!source) {
    return createAction(
      opportunity,
      stageName,
      locationId,
      'source_missing',
      `Sin fuente registrada · etapa actual: ${stageName}`,
    );
  }
  return null;
}

function selectDiverseActions(candidates, limit = 8) {
  const buckets = new Map(actionDefinitions.map(({ key }) => [key, []]));
  for (const candidate of candidates) {
    buckets.get(candidate.category)?.push(candidate);
  }

  const selected = [];
  for (let round = 0; selected.length < limit; round += 1) {
    let added = false;
    for (const definition of actionDefinitions) {
      const candidate = buckets.get(definition.key)?.[round];
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }
  return selected;
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
  let messages = [];
  let messageAccess = true;
  try {
    messages = await listMessages(token, locationId);
  } catch (error) {
    messageAccess = false;
    console.warn(`\n  Mensajes no disponibles: ${error.message}`);
  }
  const messagesByContact = new Map();
  for (const message of messages) {
    if (!message.contactId) continue;
    const contactMessages = messagesByContact.get(message.contactId) || [];
    contactMessages.push(message);
    messagesByContact.set(message.contactId, contactMessages);
  }
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
  const candidates = enriched
    .map((item) => {
      const contactId = item.contactId || item.contact?.id;
      const createdAt = Date.parse(item.createdAt || '');
      const ageDays = Number.isFinite(createdAt)
        ? Math.max(0, Math.floor((endTimestamp - createdAt) / 86_400_000))
        : 0;
      return messageAccess
        ? actionForOpportunity(
            item,
            item.stageName,
            locationId,
            messagesByContact.get(contactId) || [],
          )
        : fallbackAction(item, item.stageName, locationId, ageDays);
    })
    .filter(Boolean);
  const actions = selectDiverseActions(candidates);
  const categoryCounts = new Map();
  for (const candidate of candidates) {
    categoryCounts.set(
      candidate.category,
      (categoryCounts.get(candidate.category) || 0) + 1,
    );
  }
  const actionBreakdown = actionDefinitions
    .map((definition) => ({
      ...definition,
      count: categoryCounts.get(definition.key) || 0,
    }))
    .filter((item) => item.count > 0);
  const inboundMessages = messages.filter(isInbound);
  const outboundMessages = messages.filter(isOutbound);
  const failedWhatsAppCount = outboundMessages.filter(
    (message) =>
      normalize(message.messageType).includes('whatsapp') &&
      failedStatuses.has(normalize(message.status)),
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
    stages: countBy(enriched.map((item) => item.stageName)),
    sources: countBy(enriched.map((item) => item.source)).slice(0, 8),
    conversationSummary: {
      available: messageAccess,
      messages: messages.length,
      contacts: messagesByContact.size,
      inbound: inboundMessages.length,
      outbound: outboundMessages.length,
      failedWhatsApp: failedWhatsAppCount,
    },
    actionBreakdown,
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

// Pure rules: no credentials, raw conversation excerpts, CRM writes or auto-qualification.
export const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const timestamp = (m) => Date.parse(m.dateAdded || m.createdAt || '');
const communication = (m) =>
  !/ACTIVITY|INTERNAL_COMMENT|REVIEW_REQUEST/.test(
    String(m.messageType || m.type || '').toUpperCase(),
  );
const inbound = (m) =>
  m.direction === 'inbound' &&
  communication(m) &&
  !['failed', 'undelivered', 'error'].includes(normalize(m.status));
const delivered = (m) =>
  m.direction === 'outbound' &&
  communication(m) &&
  ['delivered', 'read', 'opened'].includes(normalize(m.status));
const initial = (stage) =>
  /^(?:\[.*?\]\s*)?(?:\d+[.\s-]+)?(?:nuevo lead|lead nuevo|new lead|leads?|sin contactar|ingreso)$/.test(
    normalize(stage),
  );
const visitRequest =
  /\b(?:(?:quiero|quisiera|podemos|me gustaria|puedo|vamos a|me interesa)\s+(?:ir a\s+|coordinar\s+|agendar\s+)?(?:visitar|conocer (?:la|el|obra|proyecto)|(?:una |la )?visita|recorrer|reunirnos)|(?:coordinar|agendar|hacer)\s+(?:una |la )?(?:visita|reunion)|cuando (?:puedo|podemos) (?:ir|visitar))\b/;
const topicRules = [
  [
    'Precio/financiación',
    /\b(precio|valor|cuotas?|anticipo|financiacion|financiar|presupuesto|contado|forma de pago|credito)\b/,
  ],
  [
    'Disponibilidad/tipología',
    /\b(disponibilidad|disponibles?|ambientes?|dormitorios?|tipologia|metros|m2|unidad(?:es)?)\b/,
  ],
  ['Producto/entrega', /\b(entrega|posesion|terminad[oa]|mudanza|pozo|obra)\b/],
  [
    'Necesidad inmobiliaria',
    /\b(invertir|inversion|vivir|vivienda|busco|buscando|zona|barrio)\b/,
  ],
];
const rejection =
  /\b(no me interesa|no estoy interesad[oa]|ya compre|ya consegui|no me (?:escribas|contactes)|no quiero (?:mas |que)|numero equivocado|equivocad[oa])\b/;
const ready =
  /\b(entrega inmediata|listo para (?:habitar|vivir|mudar)|terminad[oa]|mudanza inmediata|posesion inmediata)\b/;
const budget =
  /\b(caro|fuera de (?:mi )?presupuesto|no me alcanza|no llego|muy alto|mas barato)\b/;
const timing =
  /\b(no tengo apuro|mas adelante|el ano que viene|todavia no|solo averiguando|solo consultando)\b/;

export const commercialDefinitions = [
  {
    key: 'visit_without_followup',
    label: 'Pedido explícito de visita: revisar próximo paso',
    priority: 'P0',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Confirmar intención y ofrecer horarios; registrar asesor y próxima acción.',
    criteria:
      'Solicitud explícita del lead; sin tarea o cita vigente visible en los datos consultados.',
  },
  {
    key: 'qualification_mismatch',
    label: 'Interés en etapa inicial: validar calificación',
    priority: 'P1',
    owner: 'PIXEL',
    action:
      'Contrastar conversación y notas con el criterio aprobado por la cuenta; proponer ajuste del bot solo si se confirma desajuste.',
    criteria:
      'Respuesta comercial contextualizada en etapa inicial; candidato, no error del bot demostrado.',
  },
  {
    key: 'active_interest',
    label: 'Interés comercial sin próximo paso visible',
    priority: 'P1',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Responder la consulta concreta y registrar próxima acción con fecha y asesor.',
    criteria:
      'Interés comercial conversado sin tarea o cita vigente en el CRM consultado.',
  },
  {
    key: 'ready_product',
    label: 'Busca producto listo: validar alternativa',
    priority: 'P1',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Confirmar disponibilidad real y ofrecer una alternativa compatible, si existe.',
    criteria:
      'El lead menciona producto terminado o entrega inmediata; no equivale por sí solo a motivo de pérdida.',
  },
  {
    key: 'budget_mismatch',
    label: 'Desajuste explícito de presupuesto',
    priority: 'P1',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Validar presupuesto y alternativas con comercial; compartir con paid media solo el patrón agregado probado.',
    criteria:
      'Objeción explícita del lead; no inferida de una pregunta de precio.',
  },
  {
    key: 'future_interest',
    label: 'Interés postergado explícitamente',
    priority: 'P2',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Confirmar cuándo retomar y registrar la fecha acordada; no descartar automáticamente.',
    criteria:
      'Postergación explícita, distinta de silencio o falta de respuesta.',
  },
  {
    key: 'explicit_rejection',
    label: 'Rechazo explícito: revisar cierre/exclusión',
    priority: 'P2',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Respetar la negativa y validar cierre/motivo según política de la cuenta; no recontactar automáticamente.',
    criteria:
      'Negativa explícita en el último entrante; no se clasifica como recuperable.',
  },
  {
    key: 'no_response_after_attempts',
    label: 'Sin respuesta tras intentos entregados',
    priority: 'P2',
    owner: 'EQUIPO COMERCIAL',
    action:
      'Revisar política de seguimiento; no marcar perdido por silencio ni contarlo como interés activo.',
    criteria:
      'Tres o más intentos entregados/leídos y ningún entrante en el historial completo consultado.',
  },
  {
    key: 'whatsapp_failed',
    label: 'Fallo WhatsApp sin entrega posterior visible',
    priority: 'P2',
    owner: 'PIXEL',
    action:
      'Investigar el error y atención alternativa; no reenviar sin autorización.',
    criteria:
      'Fallo seguido de ninguna entrega/lectura WhatsApp en el historial completo consultado.',
  },
];
const definitions = new Map(commercialDefinitions.map((d) => [d.key, d]));

export function reviewCommercialCase({
  opportunity,
  stageName,
  locationId,
  messages = [],
  notes = [],
  tasks = [],
  appointments = [],
  contact = {},
  coverage = {},
  cutoff,
  multipleOpportunities = false,
}) {
  const created = Date.parse(opportunity.createdAt || '');
  const ordered = messages
    .filter(
      (m) =>
        communication(m) &&
        Number.isFinite(timestamp(m)) &&
        timestamp(m) <= cutoff &&
        (!Number.isFinite(created) || timestamp(m) >= created),
    )
    .sort((a, b) => timestamp(a) - timestamp(b));
  const ins = ordered.filter(inbound);
  const useful = ins.filter(
    (m) =>
      normalize(m.body).length > 3 &&
      !/^(hola|buenas|buen dia|si|no|ok|dale|gracias|info|precio)[.! ?]*$/.test(
        normalize(m.body),
      ),
  );
  // A single prefilled advert entry is not a commercial conversation by itself.
  const meaningful = useful.filter(
    (m) =>
      !/^(hola[!. ]*)?(?:quisiera|quiero|me interesa|necesito) (?:mas )?(?:informacion|info)(?: sobre .*)?[!. ?]*$/.test(
        normalize(m.body),
      ),
  );
  const last = ins.at(-1);
  const lastRejected = !!last && rejection.test(normalize(last.body));
  const topics = [
    ...new Set(
      meaningful.flatMap((m) =>
        topicRules
          .filter(([, re]) => re.test(normalize(m.body)))
          .map(([label]) => label),
      ),
    ),
  ];
  const visit = meaningful.findLast(
    (m) =>
      visitRequest.test(normalize(m.body)) &&
      !rejection.test(normalize(m.body)),
  );
  const signal = meaningful.findLast(
    (m) =>
      topicRules.some(([, re]) => re.test(normalize(m.body))) &&
      !rejection.test(normalize(m.body)),
  );
  const signalMessage = visit || signal;
  const stepCoverage =
    coverage.tasks === true && coverage.appointments === true;
  const task = tasks.find(
    (t) =>
      t.completed === false &&
      Number.isFinite(Date.parse(t.dueDate)) &&
      Date.parse(t.dueDate) > cutoff &&
      (!t.dateAdded || Date.parse(t.dateAdded) <= cutoff),
  );
  // Missing timezone cannot establish an appointment's ordering against the cutoff.
  const appointment = appointments.find(
    (a) =>
      /(?:Z|[+-]\d\d:\d\d)$/.test(a.startTime || '') &&
      Date.parse(a.startTime) > cutoff &&
      /booked|confirmed|new/.test(normalize(a.appointmentStatus || a.status)) &&
      (!a.dateAdded || Date.parse(a.dateAdded) <= cutoff),
  );
  const nextStep = task
    ? 'Tarea futura pendiente visible'
    : appointment
      ? 'Cita futura visible'
      : stepCoverage
        ? 'Sin tarea/cita futura visible; validar acuerdos en conversación y atención externa'
        : 'No verificable: lectura de tareas/citas parcial';
  const terminal =
    /lost|won|abandoned/.test(normalize(opportunity.status)) ||
    /perdid|descart|cerrad|venta realizada|vendido/.test(normalize(stageName));
  const covered = coverage.messages === true;
  let category = null;
  if (!terminal && lastRejected) category = 'explicit_rejection';
  else if (!terminal && signalMessage && !task && !appointment) {
    if (visit) category = 'visit_without_followup';
    else if (meaningful.some((m) => budget.test(normalize(m.body))))
      category = 'budget_mismatch';
    else if (meaningful.some((m) => timing.test(normalize(m.body))))
      category = 'future_interest';
    else if (initial(stageName)) category = 'qualification_mismatch';
    else if (meaningful.some((m) => ready.test(normalize(m.body))))
      category = 'ready_product';
    else category = 'active_interest';
  } else if (
    !terminal &&
    covered &&
    !ins.length &&
    ordered.filter(delivered).length >= 3
  )
    category = 'no_response_after_attempts';
  if (!category && !terminal && covered) {
    const failure = ordered.findLast(
      (m) =>
        m.direction === 'outbound' &&
        /WHATSAPP/.test(m.messageType || m.type || '') &&
        ['failed', 'undelivered'].includes(normalize(m.status)),
    );
    if (
      failure &&
      !ordered.some(
        (m) =>
          /WHATSAPP/.test(m.messageType || m.type || '') &&
          delivered(m) &&
          timestamp(m) > timestamp(failure),
      )
    )
      category = 'whatsapp_failed';
  }
  const assigned = opportunity.assignedTo || contact.assignedTo || null;
  const noteCount = notes.filter(
    (n) => !n.dateAdded || Date.parse(n.dateAdded) <= cutoff,
  ).length;
  const contactId = opportunity.contactId || opportunity.contact?.id;
  const definition = definitions.get(category);
  const signalAt = signalMessage
    ? new Date(timestamp(signalMessage)).toISOString()
    : null;
  const evidence = [
    `Etapa actual: ${stageName}`,
    meaningful.length
      ? `${meaningful.length} entrantes contextualizados`
      : `${ins.length} entrantes`,
    topics.length ? `Temas: ${topics.join(', ')}` : null,
    visit ? 'Solicitud explícita de visita detectada' : null,
    `${noteCount} notas accesibles (no validan por sí solas el criterio del bot)`,
    nextStep,
    multipleOpportunities
      ? 'Contacto con varias oportunidades: atribución de conversación por validar'
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    contactName: `Contacto …${String(contactId).slice(-6)}`,
    opportunityId: opportunity.id,
    ghlUrl: `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contactId}`,
    category,
    problem: definition?.label || null,
    priority: definition?.priority || 'P2',
    owner: definition?.owner || 'EQUIPO COMERCIAL',
    action: definition?.action || null,
    evidence,
    stageName,
    signalAt,
    topics,
    assignedOwner: assigned
      ? `Asesor …${String(assigned).slice(-6)}`
      : 'Sin asesor visible — comercial debe definirlo',
    nextStep,
    contextStatus:
      covered && stepCoverage && !multipleOpportunities
        ? 'Candidato: validar contexto y criterio comercial'
        : 'Revisión parcial: no afirmar ausencia ni causa',
    acceptance:
      category === 'qualification_mismatch'
        ? 'Criterio de cuenta validado, casos concordantes/discrepantes revisados y ajuste aprobado probado; no mover etapas automáticamente.'
        : 'Acción comercial confirmada con responsable y fecha, o descarte documentado; resultado revisado en corte posterior.',
    coverage: { ...coverage },
    meaningfulInbound: meaningful.length,
    hasCommercialSignal: !!signalMessage,
    nextStepVisible: !!(task || appointment),
    terminal,
  };
}

export function summarizeCommercialCases(cases) {
  const candidates = cases.filter((c) => c.category);
  const rank = new Map(commercialDefinitions.map((d, i) => [d.key, i]));
  candidates.sort(
    (a, b) =>
      rank.get(a.category) - rank.get(b.category) ||
      String(b.signalAt || '').localeCompare(String(a.signalAt || '')),
  );
  const unique = new Map();
  for (const c of candidates)
    if (!unique.has(c.ghlUrl)) unique.set(c.ghlUrl, c);
  const actions = [...unique.values()];
  const groups = commercialDefinitions
    .map((d) => {
      const matched = actions.filter((c) => c.category === d.key);
      return { ...d, count: matched.length, contacts: matched };
    })
    .filter((g) => g.count);
  return {
    actions,
    actionBreakdown: groups.map(({ contacts: _contacts, ...g }) => g),
    conversationSegments: groups,
    commercialReview: {
      version: 'sofia-2026-10-07',
      reviewedOpportunities: cases.length,
      reviewedContacts: new Set(cases.map((c) => c.ghlUrl)).size,
      completeHistories: cases.filter((c) => c.coverage.messages).length,
      withCommercialSignal: cases.filter(
        (c) =>
          c.hasCommercialSignal &&
          !c.terminal &&
          c.category !== 'explicit_rejection',
      ).length,
      qualificationCandidates: cases.filter(
        (c) => c.category === 'qualification_mismatch',
      ).length,
      activeWithoutVisibleStep: cases.filter(
        (c) =>
          c.hasCommercialSignal &&
          !c.nextStepVisible &&
          !c.terminal &&
          c.category !== 'explicit_rejection',
      ).length,
      withVisibleStep: cases.filter((c) => c.nextStepVisible).length,
      limitations:
        'Reglas conservadoras para seleccionar candidatos; no diagnostican errores del bot ni sustituyen criterio comercial. Tareas/citas visibles no abarcan acuerdos externos. Etapas actuales, no historial de conversión. Sent no equivale a delivered. Sin cambios productivos.',
    },
  };
}

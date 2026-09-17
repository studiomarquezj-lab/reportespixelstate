'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness,
  CalendarClock, Check, CheckCircle2, ChevronRight, CircleAlert, Clock3,
  Database, FileSearch, Gauge, ListChecks, LockKeyhole, MessageCircle,
  Presentation, RefreshCw, Route, ShieldCheck, Sparkles, Target,
  UserRoundCheck, Waypoints,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AccountStatus = 'Conectada' | 'Bloqueada' | 'Por conectar';
type Account = { name: string; status: AccountStatus; note?: string };
type ReportView = 'client' | 'internal';

const accounts: Account[] = [
  { name: 'Adolma', status: 'Por conectar' },
  { name: 'Alessandri', status: 'Por conectar' },
  { name: 'Capital Brokers (SUELO)', status: 'Conectada', note: 'Informe comercial disponible' },
  { name: 'Capital Brokers - WOW 1', status: 'Por conectar' },
  { name: 'El Salvaje', status: 'Bloqueada', note: 'Falta definir cuenta publicitaria' },
  { name: 'Grupo CISA', status: 'Por conectar' },
  { name: 'Jorge Musa Remax', status: 'Por conectar' },
  { name: 'SUMA Group', status: 'Por conectar' },
  { name: 'Terracent', status: 'Por conectar' },
  { name: 'Urbanika', status: 'Por conectar' },
  { name: 'YUD Desarrollos', status: 'Por conectar' },
];
const capital = accounts[2];

const journey = [
  { label: 'Nuevo Lead', value: 294, note: 'Base analizada' },
  { label: 'Respuesta útil', value: 196, note: '66,7% del stock' },
  { label: 'Señal comercial', value: 50, note: 'Precio, financiación, disponibilidad u otra variable' },
  { label: 'Visita + momento', value: 3, note: 'Intención con día u horario' },
];

const ageBuckets = [
  { label: '0–1 día', value: 27 }, { label: '2–7 días', value: 26 },
  { label: '8–30 días', value: 124 }, { label: '+30 días', value: 192 },
];

const themes = [
  ['Disponibilidad y tipología', 127], ['Ubicación y zona', 113], ['Precio', 62],
  ['Día u horario', 47], ['Entrega y estado de obra', 44], ['Financiación', 32],
  ['Amenities y cochera', 32], ['Finalidad: vivir o invertir', 15], ['Expensas y gastos', 11],
] as const;

const objections = [
  { label: 'No interesado', count: 19, meaning: 'Puede ser desajuste real o una salida rápida ante una conversación poco relevante.', response: 'Validar si el rechazo es al proyecto, al momento o a la propuesta antes de cerrar.' },
  { label: 'No es el momento', count: 9, meaning: 'Existe una ventana futura que hoy no queda estructurada en el CRM.', response: 'Acordar fecha concreta de retomada y motivo; no dejarlo como seguimiento abierto.' },
  { label: 'Desajuste de presupuesto', count: 5, meaning: 'El precio aparece antes de confirmar rango, anticipo o flexibilidad.', response: 'Reencuadrar por rango, anticipo y alternativas antes de descartar.' },
  { label: 'Necesita financiación', count: 4, meaning: 'No siempre es una objeción; puede ser una variable de calificación.', response: 'Preguntar anticipo disponible, plazo y cuota objetivo para derivar correctamente.' },
];

const sourceRows = [
  { source: 'RBDD 07/2026', volume: 176, response: 95.5, commercial: 23.9, advanced: 5, reading: 'Reactivación; no comparar con adquisición.' },
  { source: 'Armenia 2327', volume: 63, response: 50.8, commercial: 19.0, advanced: 0, reading: 'Volumen alto, sin avance visible a visita.' },
  { source: 'Charcas', volume: 32, response: 40.6, commercial: 18.8, advanced: 1, reading: 'Respuesta baja; revisar anuncio y apertura.' },
  { source: 'Zonaprop · normalizado', volume: 30, response: 53.3, commercial: 26.7, advanced: 3, reading: 'Señal comercial razonable.' },
  { source: 'WhatsApp directo', volume: 26, response: 100, commercial: 53.8, advanced: 2, reading: 'Mayor intención; muestra distinta a pauta.' },
  { source: 'Salguero', volume: 19, response: 31.6, commercial: 10.5, advanced: 0, reading: 'Lectura más débil entre fuentes con volumen.' },
  { source: 'Lead Ads SUELO', volume: 18, response: 55.6, commercial: 22.2, advanced: 0, reading: 'Responde, pero no avanza en el stock.' },
];

const actionPlan = [
  { horizon: '48 horas', title: 'Recuperar valor inmediato', items: ['Revisar 50 Nuevo Lead con señal comercial.', 'Responder o reasignar 25 handoffs demorados.', 'Resolver 20 casos sin primer saliente exitoso.', 'Asignar los 209 casos sin dueño visible.'] },
  { horizon: '7 días', title: 'Corregir la conversación', items: ['Apertura de menos de 220 caracteres.', 'Una pregunta de calificación por turno.', 'Dos opciones concretas para coordinar visita.', 'Alerta y reasignación automática a los 30 min.'] },
  { horizon: '30 días', title: 'Medir avance real', items: ['Guardar cada cambio de etapa con fecha.', 'Separar reactivación de adquisición.', 'Auditar muestras de las cinco listas SOP.', 'Presentar acciones, resultado y decisión.'] },
];

const clientFaq = [
  { q: '¿Dónde está hoy el principal cuello de botella?', a: 'Después de la respuesta. Hay 196 oportunidades que contestaron de forma útil y todavía figuran en Nuevo Lead. Antes de aumentar inversión conviene ordenar calificación, responsable y próximo paso.' },
  { q: '¿El bot está funcionando mal?', a: 'No vemos primero un problema de velocidad: la mediana del primer contacto es un minuto. La oportunidad está en simplificar la apertura, registrar mejor lo que el lead expresa y cerrar con una acción concreta.' },
  { q: '¿Necesitamos más leads?', a: 'No es la primera recomendación. Existen 175 Nuevo Lead respondidos con más de siete días en la primera etapa. La prioridad es recuperar ese inventario y demostrar capacidad de seguimiento antes de escalar tráfico.' },
  { q: '¿Qué fuente trae mejores oportunidades?', a: 'WhatsApp directo muestra la mayor señal comercial, pero no es comparable directamente con pauta. Entre fuentes con volumen, Armenia y Salguero necesitan revisión. La confirmación final requiere cohortes por fecha y avance.' },
  { q: '¿Qué cambia esta semana?', a: 'Se depura el backlog con intención, se recuperan handoffs, se asignan responsables y se prueba una apertura más corta con cierre directo a visita. Cada acción queda con dueño y criterio de verificación.' },
];

const reviewQueues = [
  { priority: 'P0', count: 20, title: 'Sin primer saliente exitoso', why: 'Puede haber un problema de dato, webhook, workflow o teléfono.', owner: 'Especialista GHL', decision: 'Reparar o documentar causa' },
  { priority: 'P0', count: 25, title: 'Entrante sin respuesta +30 min', why: 'El lead manifestó actividad y la conversación quedó sin continuidad.', owner: 'Guardia comercial', decision: 'Responder, reasignar o cerrar' },
  { priority: 'P1', count: 50, title: 'Nuevo Lead con señal comercial', why: 'Existe una variable útil que todavía no se refleja en la etapa.', owner: 'Sofía / Juan', decision: 'Calificar, nutrir o descartar' },
  { priority: 'P1', count: 61, title: 'Solo automatización', why: 'No se registra intervención humana en oportunidades tempranas.', owner: 'Líder comercial', decision: 'Validar necesidad de handoff' },
  { priority: 'P2', count: 44, title: 'Calificados sin señal detectable', why: 'La conversación no contiene una variable comercial reconocible por la auditoría.', owner: 'QA comercial', decision: 'Confirmar criterio o corregir etapa' },
];

function Status({ status }: { status: AccountStatus }) {
  return <Badge variant={status === 'Bloqueada' ? 'destructive' : 'outline'} className="status"><span className="dot" />{status}</Badge>;
}

function SectionHeader({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return <header className="section-header"><div><span>{kicker}</span><h2>{title}</h2></div>{note && <p>{note}</p>}</header>;
}

function EvidenceTag({ children, tone = 'confirmed' }: { children: React.ReactNode; tone?: 'confirmed' | 'inferred' | 'pending' }) {
  return <span className={`evidence-tag ${tone}`}><i />{children}</span>;
}

export default function Page() {
  const [selected, setSelected] = useState<Account | null>(capital);
  const [filter, setFilter] = useState('Todas');
  const [reportView, setReportView] = useState<ReportView>('client');
  const visible = useMemo(() => accounts.filter((account) => filter === 'Todas' || account.status === filter), [filter]);
  const isCapital = selected?.name === capital.name;
  useEffect(() => { window.scrollTo(0, 0); }, [selected, reportView]);

  if (selected) return <main className="shell">
    <header className="topbar">
      <button className="brand" onClick={() => setSelected(null)} aria-label="Volver a la cartera"><span>PS</span><div>PIXELSTATE<small>INTELIGENCIA COMERCIAL</small></div></button>
      <div className="top-actions"><span className="sync"><RefreshCw /> Corte: 17 sep 2026 · 10:01</span><Button variant="outline" onClick={() => setSelected(null)}><ArrowLeft /> Cartera</Button></div>
    </header>
    <section className="report-heading">
      <div><div className="eyebrow">Informe comercial preliminar</div><h1>{selected.name}</h1><div className="inline-meta"><Status status={selected.status} />{isCapital && <Badge variant="outline">391 oportunidades · 7.603 mensajes</Badge>}</div></div>
      {isCapital && <aside className="decision-card"><span>Decisión recomendada</span><strong>Recuperar y ordenar la demanda existente antes de aumentar inversión.</strong></aside>}
    </section>
    {isCapital && <ModeSwitcher value={reportView} onChange={setReportView} />}
    {isCapital ? <CapitalReport audience={reportView} /> : <EmptyAccount account={selected} />}
  </main>;

  return <main className="shell">
    <header className="topbar"><div className="brand"><span>PS</span><div>PIXELSTATE<small>INTELIGENCIA COMERCIAL</small></div></div><span className="portfolio-date">Cartera · 17 sep 2026</span></header>
    <section className="portfolio-head"><div><div className="eyebrow">Panorama central</div><h1>Datos que terminan en decisiones.</h1><p>Una lectura ejecutiva por cuenta y una sala de control interna para operar el siguiente paso.</p></div><div className="portfolio-stats"><strong>11</strong><span>cuentas</span><i /><strong>1</strong><span>informe activo</span></div></section>
    <section className="toolbar"><div>{['Todas', 'Conectada', 'Por conectar', 'Bloqueada'].map((value) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value} <b>{value === 'Todas' ? 11 : value === 'Por conectar' ? 9 : 1}</b></button>)}</div><span>Capital Brokers es la cuenta piloto</span></section>
    <section className="account-grid">{visible.map((account) => <button key={account.name} className="account-card" onClick={() => setSelected(account)}><div><Status status={account.status} /><ArrowUpRight /></div><strong>{account.name}</strong><p>{account.note || 'Configuración de lectura pendiente'}</p><small>{account.status === 'Conectada' ? 'Abrir informe' : 'Ver estado'} <ArrowRight /></small></button>)}</section>
    <AccessModel />
  </main>;
}

function ModeSwitcher({ value, onChange }: { value: ReportView; onChange: (value: ReportView) => void }) {
  return <section className="view-switcher" aria-label="Tipo de informe"><div><span>Modo de lectura</span><strong>{value === 'client' ? 'Presentación para el cliente' : 'Análisis interno Pixelstate'}</strong><p>{value === 'client' ? 'Conclusiones, evidencia y próximos pasos listos para presentar.' : 'Riesgos operativos, colas de trabajo y criterios de auditoría.'}</p></div><div role="group" aria-label="Seleccionar modo"><button className={value === 'client' ? 'active' : ''} onClick={() => onChange('client')}><Presentation /> Cliente</button><button className={value === 'internal' ? 'active' : ''} onClick={() => onChange('internal')}><ShieldCheck /> Interno</button></div></section>;
}

function CapitalReport({ audience }: { audience: ReportView }) {
  return audience === 'client' ? <ClientReport /> : <InternalReport />;
}

function ClientReport() {
  return <Tabs defaultValue="executive" className="report-tabs report-surface">
    <TabsList aria-label="Secciones para el cliente"><TabsTrigger value="executive">Resumen ejecutivo</TabsTrigger><TabsTrigger value="messages">Conversaciones</TabsTrigger><TabsTrigger value="sources">Fuentes</TabsTrigger><TabsTrigger value="plan">Plan de acción</TabsTrigger><TabsTrigger value="meeting">Guía de reunión</TabsTrigger></TabsList>
    <TabsContent value="executive"><ClientExecutive /></TabsContent><TabsContent value="messages"><ClientMessages /></TabsContent><TabsContent value="sources"><ClientSources /></TabsContent><TabsContent value="plan"><ClientPlan /></TabsContent><TabsContent value="meeting"><MeetingKit /></TabsContent>
  </Tabs>;
}

function ClientExecutive() {
  return <>
    <section className="executive-hero"><div className="hero-copy"><div className="hero-label"><Sparkles /> Lectura ejecutiva</div><h2>La oportunidad no está primero en conseguir más leads, sino en convertir mejor las conversaciones que ya existen.</h2><p>La velocidad automática es buena. El quiebre aparece cuando el lead responde: la información comercial no siempre se transforma en etapa, responsable y próxima acción.</p><div className="talk-track"><span>Cómo decirlo</span><blockquote>“Hoy tenemos demanda para recuperar dentro del CRM. Vamos a ordenar esa demanda, medir su avance y después decidir dónde conviene escalar inversión.”</blockquote></div></div><div className="hero-side"><div><span>Prioridad</span><strong>01</strong></div><p>Convertir respuesta en gestión comercial visible.</p><EvidenceTag>Datos CRM</EvidenceTag></div></section>
    <section className="metric-grid" aria-label="Indicadores principales"><Metric value="196" label="respuestas útiles" detail="Siguen dentro de Nuevo Lead" /><Metric value="50" label="señales comerciales" detail="Precio, disponibilidad, financiación u otra variable" /><Metric value="25" label="handoffs demorados" detail="Entrante sin respuesta posterior por más de 30 min" tone="alert" /><Metric value="1 min" label="mediana de contacto" detail="La velocidad automática sí funciona" tone="positive" /></section>
    <section className="visual-grid"><article className="chart-card span-2"><SectionHeader kicker="Ruta comercial" title="Dónde se diluye la intención" note="Dentro de las 294 oportunidades en Nuevo Lead" /><JourneyChart /></article><article className="insight-card"><span className="insight-number">66,7%</span><h3>ya respondió, pero no avanzó de etapa</h3><p>Esto puede combinar falta de actualización, calificación inconsistente o una conversación que entrega información sin cerrar un siguiente paso.</p><div className="insight-action"><ArrowRight /> Revisar primero los 50 casos con señal comercial.</div></article></section>
    <section><SectionHeader kicker="Tres conclusiones" title="Qué sabemos y qué decisión habilita" note="Lenguaje preparado para una reunión ejecutiva" /><div className="conclusion-grid"><Conclusion index="01" title="La automatización llega rápido" evidence="Mediana de 1 minuto; P90 de 7 minutos." decision="Conservar la velocidad y optimizar el contenido." /><Conclusion index="02" title="La clasificación no acompaña la conversación" evidence="196 respuestas útiles permanecen en Nuevo Lead." decision="Definir regla de calificación, dueño y próxima acción." /><Conclusion index="03" title="El cierre a visita pierde fuerza" evidence="50 casos tienen señal comercial; solo 3 combinan visita con momento." decision="Ofrecer dos opciones concretas de día y horario." /></div></section>
    <MethodNote />
  </>;
}

function Metric({ value, label, detail, tone = 'default' }: { value: string; label: string; detail: string; tone?: 'default' | 'positive' | 'alert' }) { return <article className={`metric-card ${tone}`}><span>{value}</span><strong>{label}</strong><p>{detail}</p></article>; }

function JourneyChart() {
  const maxWidth = 650;
  return <div className="chart-wrap"><svg className="journey-chart" viewBox="0 0 760 330" role="img" aria-labelledby="journey-title journey-desc"><title id="journey-title">Ruta comercial de oportunidades en Nuevo Lead</title><desc id="journey-desc">De 294 oportunidades, 196 respondieron, 50 muestran señal comercial y 3 combinan visita con día u horario.</desc>{journey.map((item, index) => { const width = maxWidth - index * 135; const x = 55 + (maxWidth - width) / 2; const y = 18 + index * 76; return <g key={item.label}><rect x={x} y={y} width={width} height="58" rx="10" className={`journey-step step-${index}`} /><text x={x + 18} y={y + 24} className="journey-label">{item.label}</text><text x={x + 18} y={y + 44} className="journey-note">{item.note}</text><text x={x + width - 18} y={y + 37} textAnchor="end" className="journey-value">{item.value}</text>{index < journey.length - 1 && <path d={`M 380 ${y + 58} L 380 ${y + 74}`} className="journey-line" />}</g>; })}</svg><div className="chart-caption"><EvidenceTag>Conteos confirmados</EvidenceTag><span>No representa una conversión histórica; es la lectura del stock actual.</span></div></div>;
}

function Conclusion({ index, title, evidence, decision }: { index: string; title: string; evidence: string; decision: string }) { return <article className="conclusion-card"><span>{index}</span><h3>{title}</h3><p>{evidence}</p><div><strong>Decisión</strong>{decision}</div></article>; }

function ClientMessages() {
  return <><SectionHeader kicker="Inteligencia de conversaciones" title="Qué quieren saber los leads y cómo llevarlos al siguiente paso" note="7.603 mensajes analizados · señales agregadas y anonimizadas" /><section className="message-story"><article className="chart-card"><h3>La conversación gira alrededor de cuatro decisiones</h3><div className="theme-list">{themes.slice(0, 6).map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value / 127 * 100}%` }} /></i><strong>{value}</strong></div>)}</div><p className="micro-note">Una conversación puede contener más de un tema.</p></article><article className="narrative-card"><div className="eyebrow">Lectura comercial</div><h3>Información sí; progresión no siempre.</h3><p>Los leads preguntan primero por disponibilidad, ubicación y precio. Esas preguntas son una oportunidad de calificación, pero el flujo parece responder contenido sin capturar siempre la decisión comercial.</p><ul><li><Check /> Responder la pregunta concreta.</li><li><Check /> Detectar vivir/invertir, rango y momento.</li><li><Check /> Guardar la variable en GHL.</li><li><Check /> Cerrar con visita o siguiente acción.</li></ul></article></section><section className="message-flow"><SectionHeader kicker="Arquitectura recomendada" title="Cada respuesta debe mover una decisión" /><div className="flow-track"><FlowStep icon={<MessageCircle />} index="01" title="Contexto" copy="Proyecto consultado y motivo de contacto." /><FlowStep icon={<FileSearch />} index="02" title="Necesidad" copy="Vivir o invertir, tipología, zona y plazo." /><FlowStep icon={<BriefcaseBusiness />} index="03" title="Viabilidad" copy="Rango, anticipo y financiación." /><FlowStep icon={<CalendarClock />} index="04" title="Siguiente paso" copy="Dos opciones de visita o fecha de retomada." /></div></section><section><SectionHeader kicker="Objeciones detectadas" title="No todas deben terminar en descarte" note="Conteos heurísticos para priorizar revisión manual" /><div className="objection-grid">{objections.map((item) => <article key={item.label}><div><strong>{item.count}</strong><span>{item.label}</span></div><p>{item.meaning}</p><blockquote>{item.response}</blockquote></article>)}</div></section><section className="script-lab"><div><span>Guion de apertura recomendado</span><h3>Menos texto, una decisión.</h3><p>El primer mensaje actual tiene 528 caracteres en promedio y 86,8% supera 240.</p></div><blockquote>Hola [Nombre], vi que consultaste por [Proyecto]. ¿Buscás para vivir o para invertir?</blockquote><div><EvidenceTag tone="inferred">Hipótesis a probar</EvidenceTag><p>Medir respuesta en 24 h, calificación, visita y fallback por versión.</p></div></section></>;
}

function FlowStep({ icon, index, title, copy }: { icon: React.ReactNode; index: string; title: string; copy: string }) { return <article><div className="flow-icon">{icon}</div><span>{index}</span><h3>{title}</h3><p>{copy}</p><ChevronRight className="flow-arrow" /></article>; }

function ClientSources() {
  return <><SectionHeader kicker="Rendimiento por fuente" title="La calidad de conversación cambia según el origen" note="Lectura del stock; no equivale todavía a rentabilidad ni conversión de cohorte" /><section className="visual-grid source-visual"><article className="chart-card span-2"><h3>Señal comercial detectada</h3><SourceSignalChart /></article><article className="insight-card blue"><span className="insight-number">53,8%</span><h3>WhatsApp directo concentra la mayor señal</h3><p>Es una muestra distinta a pauta y no debe usarse como comparación causal. Sí indica que el contexto de entrada importa.</p><div className="insight-action"><Target /> Separar intención por tipo de origen.</div></article></section><div className="source-table-wrap"><table className="source-table"><thead><tr><th>Fuente</th><th>Volumen</th><th>Respuesta útil</th><th>Señal comercial</th><th>Visita o posterior*</th><th>Lectura</th></tr></thead><tbody>{sourceRows.map((row) => <tr key={row.source}><td><strong>{row.source}</strong></td><td>{row.volume}</td><td>{row.response.toFixed(1).replace('.', ',')}%</td><td>{row.commercial.toFixed(1).replace('.', ',')}%</td><td>{row.advanced}</td><td>{row.reading}</td></tr>)}</tbody></table></div><p className="table-footnote">* Etapa actual en Visita Solicitada o posterior. RBDD es reactivación y no debe mezclarse con adquisición.</p><section className="recommendation-strip"><div><strong>01</strong><span>Normalizar nombres de fuente</span></div><div><strong>02</strong><span>Separar reactivación y pauta</span></div><div><strong>03</strong><span>Guardar primera y última atribución</span></div><div><strong>04</strong><span>Vincular fuente con visita y cierre</span></div></section></>;
}

function SourceSignalChart() {
  const rows = sourceRows.slice().sort((a, b) => b.commercial - a.commercial);
  return <div className="chart-wrap"><svg className="source-chart" viewBox="0 0 720 360" role="img" aria-labelledby="source-title source-desc"><title id="source-title">Señal comercial por fuente</title><desc id="source-desc">WhatsApp directo muestra 53,8 por ciento; las demás fuentes se ubican entre 10,5 y 26,7 por ciento.</desc>{rows.map((row, index) => { const y = 25 + index * 46; const width = row.commercial * 7.5; return <g key={row.source}><text x="10" y={y + 18} className="source-label">{row.source}</text><rect x="190" y={y} width="420" height="24" rx="5" className="source-track" /><rect x="190" y={y} width={width} height="24" rx="5" className={index === 0 ? 'source-bar leader' : 'source-bar'} /><text x="625" y={y + 18} className="source-value">{row.commercial.toFixed(1).replace('.', ',')}%</text></g>; })}<line x1="377" y1="12" x2="377" y2="345" className="reference-line" /><text x="383" y="14" className="reference-label">25%</text></svg><div className="chart-caption"><EvidenceTag>Señal textual</EvidenceTag><span>Indicador de intención, no de cierre.</span></div></div>;
}

function ClientPlan() { return <><SectionHeader kicker="Plan de intervención" title="Un plan corto, con responsables y verificación" note="Primero recuperar valor; después escalar tráfico" /><section className="plan-grid">{actionPlan.map((phase, index) => <article key={phase.horizon}><div className="plan-head"><span>0{index + 1}</span><div><small>{phase.horizon}</small><h3>{phase.title}</h3></div></div><ul>{phase.items.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></article>)}</section><section className="success-panel"><div><Route /><span>Resultado esperado</span></div><h3>El CRM debe poder explicar quién actúa, qué sabe del lead y cuál es el siguiente paso.</h3><div className="success-grid"><p><strong>Backlog</strong>Disminuye semana a semana.</p><p><strong>Asignación</strong>Toda oportunidad calificada tiene dueño.</p><p><strong>SLA</strong>Ningún handoff queda invisible.</p><p><strong>Atribución</strong>Las visitas se conectan con su fuente.</p></div></section></>; }

function MeetingKit() {
  return <><SectionHeader kicker="Arma comercial" title="Guía para que Sofía o Juan conduzcan la reunión" note="La presentación muestra decisiones; la capa interna conserva el detalle operativo" /><section className="meeting-agenda"><article><span>00–03 min</span><h3>Abrir con la decisión</h3><p>“Encontramos valor acumulado en el CRM que conviene recuperar antes de aumentar inversión.”</p></article><article><span>03–10 min</span><h3>Mostrar evidencia</h3><p>Ruta comercial, temas de conversación y diferencia entre velocidad y avance.</p></article><article><span>10–17 min</span><h3>Acordar causas</h3><p>Validar criterios de calificación, responsable y cierre a visita.</p></article><article><span>17–20 min</span><h3>Cerrar compromisos</h3><p>Dueños, fechas y qué se presentará en el próximo corte.</p></article></section><section className="speaker-note"><Presentation /><div><span>Frase de control</span><blockquote>“No estamos presentando actividad por actividad. Estamos mostrando dónde se pierde intención y qué vamos a cambiar para recuperarla.”</blockquote></div></section><Accordion className="client-faq">{clientFaq.map((item, index) => <AccordionItem key={item.q} value={`faq-${index}`}><AccordionTrigger><span><b>{String(index + 1).padStart(2, '0')}</b>{item.q}</span></AccordionTrigger><AccordionContent><p>{item.a}</p></AccordionContent></AccordionItem>)}</Accordion><section className="meeting-close"><UserRoundCheck /><div><span>Decisiones que pedimos al cliente</span><h3>La reunión debe terminar con acuerdos.</h3></div><ol><li>Confirmar qué significa Lead Calificado.</li><li>Definir responsables y guardia comercial.</li><li>Aprobar prueba de apertura breve.</li><li>Exigir motivo de descarte y próxima acción.</li></ol></section><MethodNote /></>;
}

function InternalReport() {
  return <Tabs defaultValue="control" className="report-tabs report-surface internal-surface"><TabsList aria-label="Secciones internas"><TabsTrigger value="control">Sala de control</TabsTrigger><TabsTrigger value="qa">QA de conversaciones</TabsTrigger><TabsTrigger value="queues">Colas de trabajo</TabsTrigger><TabsTrigger value="sop">Auditoría SOP</TabsTrigger><TabsTrigger value="playbook">Playbook</TabsTrigger></TabsList><TabsContent value="control"><InternalControl /></TabsContent><TabsContent value="qa"><InternalConversationQA /></TabsContent><TabsContent value="queues"><InternalQueues /></TabsContent><TabsContent value="sop"><InternalAudit /></TabsContent><TabsContent value="playbook"><InternalPlaybook /></TabsContent></Tabs>;
}

function InternalControl() {
  return <><section className="internal-banner"><div><ShieldCheck /><span>Uso interno · No presentar sin contexto</span></div><p>Esta vista muestra fallas operativas, hipótesis y prioridades de revisión. La vista Cliente contiene el relato aprobado para reunión.</p></section><SectionHeader kicker="Sala de control" title="Riesgo comercial que exige intervención" note="Priorizado por pérdida potencial y capacidad de acción" /><section className="risk-grid"><RiskCard level="P0" value="209" title="Sin dueño visible" detail="Ni la oportunidad ni el contacto muestran responsable." /><RiskCard level="P0" value="25" title="Entrantes demorados" detail="Más de 30 minutos sin respuesta posterior." /><RiskCard level="P0" value="20" title="Sin saliente exitoso" detail="Revisar dato, workflow, webhook o teléfono." /><RiskCard level="P1" value="61" title="Solo automatización" detail="Sin mensaje humano en oportunidades tempranas." /><RiskCard level="P1" value="51" title="Fallos de entrega" detail="Históricos, distribuidos en todas las etapas." /><RiskCard level="P2" value="44/75" title="Calificación dudosa" detail="Sin señal comercial detectable en el texto." /></section><section className="visual-grid"><article className="chart-card span-2"><SectionHeader kicker="Antigüedad de oportunidades tempranas" title="La mayor parte del riesgo ya envejeció" /><AgeChart /></article><article className="insight-card alert"><span className="insight-number">52%</span><h3>supera 30 días desde creación</h3><p>192 de 369 oportunidades tempranas. La limpieza debe separar recuperables, descartes reales y problemas de registro.</p><div className="insight-action"><Clock3 /> Ejecutar por prioridad, no por orden alfabético.</div></article></section><section className="operating-rules"><div><span>Regla 01</span><strong>Sin dueño no hay Lead Calificado.</strong></div><div><span>Regla 02</span><strong>Sin próxima acción no hay seguimiento.</strong></div><div><span>Regla 03</span><strong>Sin motivo no hay descarte.</strong></div><div><span>Regla 04</span><strong>Sin fecha no hay retomada.</strong></div></section></>;
}

function RiskCard({ level, value, title, detail }: { level: string; value: string; title: string; detail: string }) { return <article className={`risk-card ${level.toLowerCase()}`}><div><Badge variant={level === 'P0' ? 'destructive' : 'outline'}>{level}</Badge><CircleAlert /></div><strong>{value}</strong><h3>{title}</h3><p>{detail}</p></article>; }

function AgeChart() {
  const max = Math.max(...ageBuckets.map((item) => item.value));
  return <div className="chart-wrap"><svg className="age-chart" viewBox="0 0 720 300" role="img" aria-labelledby="age-title age-desc"><title id="age-title">Antigüedad de 369 oportunidades tempranas</title><desc id="age-desc">27 tienen hasta un día, 26 entre dos y siete días, 124 entre ocho y treinta días y 192 más de treinta días.</desc><line x1="70" y1="240" x2="680" y2="240" className="axis" />{ageBuckets.map((item, index) => { const height = item.value / max * 180; const x = 100 + index * 145; return <g key={item.label}><rect x={x} y={240 - height} width="88" height={height} rx="8" className={`age-bar age-${index}`} /><text x={x + 44} y={225 - height} textAnchor="middle" className="age-value">{item.value}</text><text x={x + 44} y="268" textAnchor="middle" className="age-label">{item.label}</text></g>; })}</svg><div className="chart-caption"><EvidenceTag>Fecha de creación</EvidenceTag><span>369 oportunidades en Nuevo Lead o Lead Calificado.</span></div></div>;
}

function InternalConversationQA() {
  return <><SectionHeader kicker="QA comercial" title="La conversación debe informar, calificar y cerrar" note="Matriz interna de diagnóstico; no es una evaluación individual de agentes" /><section className="qa-scorecard"><article><span>01</span><h3>Apertura</h3><strong>En riesgo</strong><p>528 caracteres promedio; 86,8% supera 240. La pregunta existe, pero compite con demasiado texto.</p><EvidenceTag>Confirmado</EvidenceTag></article><article><span>02</span><h3>Detección</h3><strong>Parcial</strong><p>Hay señales sobre precio, disponibilidad y financiación, pero no siempre quedan estructuradas.</p><EvidenceTag tone="inferred">Inferido</EvidenceTag></article><article><span>03</span><h3>Calificación</h3><strong>Inconsistente</strong><p>196 respondidos permanecen en Nuevo Lead y 44 calificados no muestran variable detectable.</p><EvidenceTag tone="inferred">Requiere muestra</EvidenceTag></article><article><span>04</span><h3>Cierre</h3><strong>Débil</strong><p>126 aceptan algún siguiente paso; solo 21 mencionan visita y 3 suman día u horario.</p><EvidenceTag tone="inferred">Heurística</EvidenceTag></article></section><section className="qa-columns"><article><h3>Qué revisar en cada muestra</h3><ul><li><Check /> ¿Identifica proyecto y origen?</li><li><Check /> ¿Responde antes de preguntar?</li><li><Check /> ¿Captura finalidad, rango y plazo?</li><li><Check /> ¿Registra objeción sin inventarla?</li><li><Check /> ¿Propone un próximo paso concreto?</li><li><Check /> ¿El CRM refleja lo conversado?</li></ul></article><article><h3>Qué no debemos concluir todavía</h3><ul className="dont"><li><CircleAlert /> Que cada mención equivale a intención real.</li><li><CircleAlert /> Que el stock actual es una tasa de conversión.</li><li><CircleAlert /> Que una fuente con poco volumen es ganadora.</li><li><CircleAlert /> Que todo lead sin respuesta es un fallo del bot.</li><li><CircleAlert /> Que ausencia textual prueba mala calificación.</li></ul></article></section><section className="message-matrix"><div><span>Momento</span><span>Objetivo</span><span>Dato a guardar</span><span>Salida correcta</span></div><div><strong>Apertura</strong><p>Obtener una respuesta simple.</p><p>Proyecto + vivir/invertir.</p><p>Continuar o fallback.</p></div><div><strong>Exploración</strong><p>Entender necesidad y viabilidad.</p><p>Tipología, rango, plazo, anticipo.</p><p>Calificar o nutrir.</p></div><div><strong>Resolución</strong><p>Responder dudas y objeciones.</p><p>Interés, freno y alternativa.</p><p>Visita o retomada fechada.</p></div><div><strong>Handoff</strong><p>Transferir sin perder contexto.</p><p>Resumen + dueño + SLA.</p><p>Respuesta humana medible.</p></div></section></>;
}

function InternalQueues() {
  return <><SectionHeader kicker="Backlog accionable" title="Cinco colas para trabajar cada mañana" note="El conteo prioriza; la muestra manual confirma" /><section className="queue-list">{reviewQueues.map((item) => <article key={item.title}><div className="queue-priority"><Badge variant={item.priority === 'P0' ? 'destructive' : 'outline'}>{item.priority}</Badge><strong>{item.count}</strong></div><div><h3>{item.title}</h3><p>{item.why}</p></div><div><span>Responsable</span><strong>{item.owner}</strong></div><div><span>Decisión esperada</span><strong>{item.decision}</strong></div><Button variant="outline" size="sm">Abrir criterio <ArrowUpRight /></Button></article>)}</section><section className="sla-panel"><div><Gauge /><span>Cadencia operativa</span></div><p><strong>09:00</strong> Revisar P0</p><p><strong>13:00</strong> Verificar reasignaciones</p><p><strong>17:00</strong> Cerrar pendientes y motivos</p><p><strong>Viernes</strong> Aprendizajes y cambios</p></section></>;
}

function InternalAudit() {
  return <><SectionHeader kicker="Gobierno del SOP" title="Qué puede medirse hoy y qué debemos instrumentar" note="Evita presentar precisión que los datos todavía no sostienen" /><section className="measurement-grid"><article><EvidenceTag>Disponible</EvidenceTag><h3>Volumen y stock</h3><p>Oportunidades por etapa, fuente, antigüedad y asignación actual.</p></article><article><EvidenceTag>Disponible</EvidenceTag><h3>Mensajería</h3><p>Dirección, canal, entrega, tiempos, temas y señales agregadas.</p></article><article><EvidenceTag tone="inferred">Heurístico</EvidenceTag><h3>Intención comercial</h3><p>Reglas lingüísticas que sirven para priorizar, no para sentenciar.</p></article><article><EvidenceTag tone="pending">Pendiente</EvidenceTag><h3>Conversión real</h3><p>Requiere historial confiable de cambios de etapa y cohortes.</p></article></section><section className="audit-framework"><div className="audit-title"><ListChecks /><div><span>Minuta mensual</span><h3>Un entregable que documenta aprendizaje.</h3></div></div><div><strong>Calibración IA</strong><p>Preguntas, respuestas, campos y fallbacks modificados.</p></div><div><strong>Ejecución humana</strong><p>SLA, reasignaciones y correcciones de guion.</p></div><div><strong>Causa comercial</strong><p>Objeciones, descarte y pérdida por etapa.</p></div><div><strong>Decisión</strong><p>Qué se mantiene, qué cambia y qué se probará.</p></div></section><MethodNote /></>;
}

function InternalPlaybook() {
  return <><SectionHeader kicker="Playbook Sofía + Juan" title="Qué preparar, qué decir y qué evitar" note="Diseñado para consulta rápida antes y durante una reunión" /><section className="playbook-grid"><article><div className="playbook-icon"><FileSearch /></div><span>Antes de la reunión</span><h3>Preparación de 10 minutos</h3><ol><li>Leer la decisión recomendada.</li><li>Elegir dos gráficos, no seis.</li><li>Validar cambios desde el corte.</li><li>Asignar quién conduce y quién toma acuerdos.</li></ol></article><article><div className="playbook-icon"><Presentation /></div><span>Durante la reunión</span><h3>Conducir hacia decisiones</h3><ol><li>Abrir con el hallazgo principal.</li><li>Mostrar evidencia y limitación.</li><li>Preguntar por la causa operativa.</li><li>Cerrar dueño, fecha y verificación.</li></ol></article><article><div className="playbook-icon"><ShieldCheck /></div><span>Control del relato</span><h3>Evitar afirmaciones débiles</h3><ol><li>No llamar conversión al stock.</li><li>No culpar al bot sin muestra.</li><li>No comparar fuentes incompatibles.</li><li>No prometer resultados sin responsable.</li></ol></article></section><section className="battlecard"><header><div><span>Objeción del cliente</span><h3>“El problema es que llegan pocos leads.”</h3></div><Badge variant="outline">Respuesta recomendada</Badge></header><div className="battlecard-grid"><p><strong>Reconocer</strong>“El volumen importa y lo vamos a seguir midiendo.”</p><p><strong>Reencuadrar</strong>“Pero hoy ya existe un inventario respondido que no avanzó.”</p><p><strong>Probar</strong>“196 respondieron y siguen en Nuevo Lead; 50 muestran señal comercial.”</p><p><strong>Preguntar</strong>“¿Acordamos primero la regla de calificación y responsable?”</p></div></section><section className="internal-close"><Waypoints /><div><span>La función del reporte</span><h3>No reemplazar la conversación con el cliente: darle estructura, evidencia y un cierre.</h3></div></section></>;
}

function MethodNote() { return <section className="method-note"><Database /><div><strong>Alcance y confianza</strong><p>Se analizaron 391 oportunidades, 391 contactos únicos y 7.603 mensajes relevantes. Las señales textuales son heurísticas y deben validarse con muestra manual. No se muestran nombres, teléfonos, correos ni cuerpos de mensajes. El stock actual no se presenta como conversión histórica.</p></div><div className="evidence-legend"><EvidenceTag>Confirmado</EvidenceTag><EvidenceTag tone="inferred">Inferido</EvidenceTag><EvidenceTag tone="pending">Por instrumentar</EvidenceTag></div></section>; }

function EmptyAccount({ account }: { account: Account }) { const blocked = account.status === 'Bloqueada'; return <section className="empty-state"><div className="empty-icon">{blocked ? <LockKeyhole /> : <Database />}</div><div><div className="eyebrow">Estado de la cuenta</div><h2>{blocked ? 'Conexión bloqueada' : 'Aún no hay lectura disponible'}</h2><p>{blocked ? `${account.note}. Antes de iniciar el informe hace falta resolver esta dependencia.` : 'Conecta la subcuenta GHL para habilitar el diagnóstico comercial y la auditoría de conversaciones.'}</p></div><div className="checklist">{['Confirmar acceso a GHL', 'Validar pipeline y etapas', 'Mapear fuentes y responsables', 'Ejecutar primera auditoría'].map((step, index) => <p key={step}><i>{index + 1}</i>{step}</p>)}</div></section>; }

function AccessModel() { return <section className="access-model"><div><div className="eyebrow">Modelo de acceso</div><h2>Una fuente, dos niveles de lectura.</h2><p>El cliente recibe conclusiones y decisiones. Pixelstate conserva riesgos, hipótesis y colas operativas.</p></div><div className="access-roles"><article><span>01</span><strong>Dirección</strong><p>Ve toda la cartera y ambos modos.</p></article><article><span>02</span><strong>Sofía y Juan</strong><p>Presentación más sala de control.</p></article><article><span>03</span><strong>Cliente</strong><p>Solo su cuenta y la vista aprobada.</p></article></div></section>; }

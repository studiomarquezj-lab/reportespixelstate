'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, Bot, CheckCircle2, CircleAlert,
  Clock3, Database, FileQuestion, Gauge, ListChecks, LockKeyhole,
  MessageCircle, RefreshCw, Route, ShieldAlert, Target, UserRoundCheck, Users,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AccountStatus = 'Conectada' | 'Bloqueada' | 'Por conectar';
type Account = { name: string; status: AccountStatus; note?: string };

const accounts: Account[] = [
  { name: 'Adolma', status: 'Por conectar' }, { name: 'Alessandri', status: 'Por conectar' },
  { name: 'Capital Brokers (SUELO)', status: 'Conectada', note: 'Informe preliminar listo' },
  { name: 'Capital Brokers - WOW 1', status: 'Por conectar' },
  { name: 'El Salvaje', status: 'Bloqueada', note: 'Falta definir cuenta publicitaria' },
  { name: 'Grupo CISA', status: 'Por conectar' }, { name: 'Jorge Musa Remax', status: 'Por conectar' },
  { name: 'SUMA Group', status: 'Por conectar' }, { name: 'Terracent', status: 'Por conectar' },
  { name: 'Urbanika', status: 'Por conectar' }, { name: 'YUD Desarrollos', status: 'Por conectar' },
];
const capital = accounts[2];

const stages = [
  ['Nuevo Lead', 294], ['Lead Calificado', 75], ['Visita Solicitada', 1], ['Visita Agendada', 4],
  ['Visita Realizada', 6], ['Seguimiento post Visita', 6], ['Operación Cerrada', 2], ['Tasaciones', 3],
] as const;

const bottlenecks = [
  { priority: '01', severity: 'Crítico', title: 'La conversación avanza, pero el CRM no', evidence: '196 de 294 nuevos leads ya respondieron de forma útil. 50 expresan una variable comercial y 3 ya combinan visita con día u horario.', diagnosis: 'El problema principal está entre la respuesta y la clasificación: criterio inconsistente, etapa sin actualizar o automatización que no refleja la conversación.', action: 'Auditar primero los 50 casos con señal comercial, mover los casos confirmados y exigir responsable + próxima acción al calificar.', owner: 'Sofía / Juan + especialista GHL' },
  { priority: '02', severity: 'Crítico', title: 'No hay una responsabilidad comercial visible', evidence: '366 de 369 oportunidades tempranas no tienen dueño en la oportunidad; 209 tampoco lo tienen en el contacto.', diagnosis: 'Sin responsable confiable no se puede medir handoff, exigir seguimiento ni explicar quién debe actuar.', action: 'Normalizar la asignación en oportunidad y contacto. Bloquear el avance a Calificado si faltan dueño y próxima acción.', owner: 'Líder comercial + especialista GHL' },
  { priority: '03', severity: 'Alta', title: 'El handoff tiene una cola larga', evidence: '25 contactos tienen un último mensaje entrante sin respuesta posterior por más de 30 minutos; 21 superan 24 horas. El P90 del primer contacto manual es 617 minutos.', diagnosis: 'La mediana es rápida, pero existe un grupo relevante que queda fuera del SLA y concentra el riesgo comercial.', action: 'Crear alerta a los 30 minutos, reasignación de guardia y una vista diaria de conversaciones pendientes.', owner: 'Equipo comercial' },
  { priority: '04', severity: 'Alta', title: 'El mensaje inicial es demasiado largo', evidence: 'El primer mensaje saliente tiene 528 caracteres en promedio; 86,8% supera 240 caracteres. 92 nuevos leads no muestran respuesta entrante.', diagnosis: 'Aunque 74,9% incluye una pregunta, el volumen de texto puede sentirse institucional, retrasar la respuesta y ocultar el CTA.', action: 'Probar una apertura breve con una sola pregunta cerrada: vivir o invertir. Medir respuesta por fuente y versión.', owner: 'Especialista IA + Sofía' },
  { priority: '05', severity: 'Media', title: 'El siguiente paso no termina en visita', evidence: '126 conversaciones muestran aceptación de algún próximo paso, pero solo 21 contienen intención de visita. El stock actual conserva apenas 1 caso en Visita Solicitada.', diagnosis: 'Es probable que el bot entregue información o proponga continuar sin cerrar una alternativa concreta de día y horario.', action: 'Después de calificar, reemplazar el envío pasivo de información por dos opciones concretas de visita.', owner: 'Especialista IA + equipo comercial' },
];

const questionThemes = [
  ['Disponibilidad y tipología', 127], ['Ubicación y zona', 113], ['Precio', 62],
  ['Día u horario', 47], ['Entrega y estado de obra', 44], ['Financiación', 32],
  ['Amenities y cochera', 32], ['Finalidad: vivir o invertir', 15], ['Expensas y gastos', 11],
] as const;

const sourceRows = [
  { source: 'RBDD 07/2026', volume: 176, response: '95,5%', commercial: '23,9%', advanced: 5, reading: 'Reactivación; no comparar con adquisición' },
  { source: 'Armenia 2327', volume: 63, response: '50,8%', commercial: '19,0%', advanced: 0, reading: 'Volumen alto, sin avance visible a visita' },
  { source: 'Charcas', volume: 32, response: '40,6%', commercial: '18,8%', advanced: 1, reading: 'Respuesta baja; revisar anuncio y apertura' },
  { source: 'Zonaprop · normalizado', volume: 30, response: '53,3%', commercial: '26,7%', advanced: 3, reading: 'Señal comercial razonable' },
  { source: 'WhatsApp directo', volume: 26, response: '100%', commercial: '53,8%', advanced: 2, reading: 'Mejor intención; muestra diferente a pauta' },
  { source: 'Salguero', volume: 19, response: '31,6%', commercial: '10,5%', advanced: 0, reading: 'Peor lectura entre fuentes con volumen' },
  { source: 'Lead Ads SUELO', volume: 18, response: '55,6%', commercial: '22,2%', advanced: 0, reading: 'Responde, pero no avanza en el stock' },
  { source: 'Sin fuente', volume: 8, response: '87,5%', commercial: '37,5%', advanced: 3, reading: 'Pérdida de atribución que debe corregirse' },
];

const auditRows = [
  { name: 'Bugs / oportunidades huérfanas', count: '20', status: 'Acción inmediata', finding: 'Nuevos leads sin mensaje saliente exitoso registrado.', next: 'Revisar teléfono, entrada, webhook y workflow; resolver antes de sumar tráfico.' },
  { name: 'IA · desbordes y fallbacks', count: 'Sin medición', status: 'Falta instrumentar', finding: 'Los tags ia-fallback y pide-humano no están normalizados para una lectura confiable.', next: 'Aplicar tags únicos y revisar 5–10 conversaciones por mes.' },
  { name: 'IA · fuga fría', count: '92', status: 'Investigar', finding: 'Nuevos leads sin entrada registrada; 61 oportunidades solo recibieron automatizaciones.', next: 'Separar no entregado, sin respuesta y sin contacto humano; comparar por fuente.' },
  { name: 'Asesor · handoff demorado', count: '25', status: 'Fuera de SLA', finding: 'Último mensaje entrante sin respuesta posterior durante más de 30 minutos.', next: 'Validar la lista y activar notificación + reasignación a guardia.' },
  { name: 'Descartes Lost', count: 'Sin medición', status: 'Falta dato', finding: 'No existe un motivo de descarte consistente en el corte analizado.', next: 'Hacer obligatorio el motivo y auditar 5–10 pérdidas recientes.' },
];

const actionPlan = [
  { horizon: 'Próximas 48 horas', tone: 'now', items: [
    ['Limpiar el backlog calificable', 'Revisar los 50 Nuevo Lead con señal comercial y los 3 que ya mencionan visita + horario.', 'Sofía / Juan'],
    ['Recuperar handoffs', 'Responder o reasignar los 25 casos pendientes por más de 30 minutos.', 'Equipo comercial'],
    ['Resolver huérfanos', 'Verificar los 20 casos sin primer saliente exitoso.', 'Especialista GHL'],
    ['Asignar responsabilidad', 'Priorizar los 209 casos sin dueño ni en contacto ni en oportunidad.', 'Líder comercial'],
  ] },
  { horizon: 'Próximos 7 días', tone: 'week', items: [
    ['Acortar apertura', 'Una pregunta cerrada, menos de 220 caracteres y referencia al proyecto consultado.', 'Especialista IA'],
    ['Cerrar con visita', 'Ofrecer dos opciones concretas de día y franja horaria después de calificar.', 'Especialista IA'],
    ['Normalizar fuentes', 'Unificar Zonaprop/zonaprop, web/Página Web y eliminar valores libres.', 'Especialista GHL'],
    ['Asegurar el handoff', 'Alerta a 30 min y reasignación si no hay mensaje humano.', 'Operaciones'],
  ] },
  { horizon: 'Próximos 30 días', tone: 'month', items: [
    ['Capturar movimientos reales', 'Guardar cada cambio de etapa con fecha, responsable, fuente y proyecto.', 'Datos / GHL'],
    ['Medir el SOP', 'Calcular conversiones de cohorte y comparar los seis umbrales de emergencia.', 'Pixelstate'],
    ['Auditar conversaciones', 'Revisar 5–10 casos de cada Smart List y emitir la minuta mensual.', 'Sofía / Juan'],
    ['Cerrar el aprendizaje', 'Registrar acción, resultado y decisión para mostrar evolución.', 'Pixelstate + cliente'],
  ] },
];

const clientAnswers = [
  { question: '¿Dónde está hoy el principal cuello de botella?', answer: 'No está en la velocidad automática del primer mensaje. Está después de que el lead responde: 196 oportunidades siguen en Nuevo Lead pese a tener una respuesta útil. El siguiente paso es ordenar calificación, responsable y próxima acción antes de aumentar el volumen.' },
  { question: '¿El bot está funcionando mal?', answer: 'El bot contacta rápido —mediana de 1 minuto y P90 de 7—, pero la apertura es excesivamente larga: 528 caracteres promedio y 86,8% por encima de 240. La hipótesis preliminar es que la velocidad funciona, pero el copy y el cierre a visita necesitan simplificarse.' },
  { question: '¿Necesitamos más leads?', answer: 'No es la primera recomendación. Hay 175 nuevos leads que respondieron y llevan más de 7 días en la primera etapa; 131 superan 30 días. Primero conviene recuperar y clasificar ese inventario para no comprar más volumen que el equipo todavía no procesa bien.' },
  { question: '¿Qué fuente está trayendo mejores oportunidades?', answer: 'WhatsApp directo concentra la señal comercial más alta —53,8% en 26 casos—, pero no es comparable de forma directa con pauta. Entre las fuentes con volumen, Salguero muestra la lectura más débil y Armenia tiene volumen sin avance visible a visita. Necesitamos cohortes por fecha para confirmar rentabilidad.' },
  { question: '¿Por qué todavía no mostramos conversiones reales?', answer: 'GHL nos devuelve la etapa actual, pero no una secuencia completa y confiable de todos los cambios. Dividir el stock actual produciría tasas falsas. El plan es guardar cada movimiento desde ahora y presentar conversiones reales por cohorte en el próximo ciclo.' },
  { question: '¿Qué vamos a cambiar esta semana?', answer: 'Vamos a depurar los 50 casos con señales comerciales, recuperar 25 handoffs demorados, revisar 20 huérfanos, acortar el mensaje inicial y convertir el cierre del bot en una propuesta concreta de visita. Cada acción tendrá responsable y verificación.' },
];

const benchmarks = [
  ['Nuevo Lead → Calificado', '15–25%', '<10%'], ['Calificado → Visita', '20–25%', '<12%'],
  ['Nuevo Lead → Visita', '~5%', '<3%'], ['Solicitada → Agendada', '>60%', '<40%'],
  ['Agendada → Realizada', '65–75%', '<50%'], ['Realizada → Cierre', '8–15%', '<5%'],
] as const;

function Status({ status }: { status: AccountStatus }) {
  return <Badge variant={status === 'Conectada' ? 'default' : status === 'Bloqueada' ? 'destructive' : 'outline'} className="status"><span className="dot" />{status}</Badge>;
}

function SectionHeading({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return <div className="section-heading"><div><div className="eyebrow">{kicker}</div><h2>{title}</h2></div>{note && <p>{note}</p>}</div>;
}

export default function Page() {
  const [selected, setSelected] = useState<Account | null>(capital);
  const [filter, setFilter] = useState('Todas');
  const visible = useMemo(() => accounts.filter((account) => filter === 'Todas' || account.status === filter), [filter]);
  const isCapital = selected?.name === capital.name;
  useEffect(() => { window.scrollTo(0, 0); }, [selected]);

  if (selected) return <main className="shell">
    <header className="topbar">
      <button className="brand" onClick={() => setSelected(null)} aria-label="Volver a la cartera"><span>PS</span><div>PIXELSTATE<small>REPORTES GHL</small></div></button>
      <div className="top-actions"><span className="sync"><RefreshCw /> {isCapital ? 'Corte: 17 sep 2026 · 10:01 Caracas' : 'Sin sincronización'}</span><Button variant="outline" onClick={() => setSelected(null)}><ArrowLeft /> Cartera</Button></div>
    </header>
    <section className="detail-head"><div><div className="eyebrow">Informe comercial preliminar</div><h1>{selected.name}</h1><div className="inline-meta"><Status status={selected.status} />{isCapital && <Badge variant="outline">CRM + 7.603 mensajes analizados</Badge>}</div></div>{isCapital && <div className="report-state"><span>Prioridad actual</span><strong>Ordenar la conversación que ya existe</strong></div>}</section>
    {isCapital ? <CapitalReport /> : <EmptyAccount account={selected} />}
  </main>;

  return <main className="shell">
    <header className="topbar"><div className="brand"><span>PS</span><div>PIXELSTATE<small>REPORTES GHL</small></div></div><div className="portfolio-date">Cartera · 17 sep 2026</div></header>
    <section className="portfolio-head"><div><div className="eyebrow">Panorama central</div><h1>Reportes que explican qué hacer.</h1><p>Estado de conexión, diagnóstico comercial y acceso al informe operativo de cada cuenta.</p></div><div className="portfolio-stats"><strong>11</strong><span>cuentas</span><i /><strong>1</strong><span>informe listo</span></div></section>
    <section className="toolbar"><div>{['Todas', 'Conectada', 'Por conectar', 'Bloqueada'].map((value) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value} <b>{value === 'Todas' ? 11 : value === 'Por conectar' ? 9 : 1}</b></button>)}</div><span>Capital es la cuenta piloto</span></section>
    <section className="account-grid">{visible.map((account) => <button key={account.name} className="account-card" onClick={() => setSelected(account)}><div><Status status={account.status} /><ArrowUpRight /></div><strong>{account.name}</strong><p>{account.note || 'Configuración de lectura pendiente'}</p><small>{account.status === 'Conectada' ? 'Abrir diagnóstico' : 'Ver estado'} <ArrowUpRight /></small></button>)}</section>
    <AccessModel />
  </main>;
}

function CapitalReport() {
  return <Tabs defaultValue="diagnosis" className="report-tabs">
    <TabsList aria-label="Secciones del informe">
      <TabsTrigger value="diagnosis">Diagnóstico</TabsTrigger><TabsTrigger value="conversations">Conversaciones</TabsTrigger><TabsTrigger value="sources">Fuentes</TabsTrigger><TabsTrigger value="audit">Auditoría</TabsTrigger><TabsTrigger value="plan">Plan</TabsTrigger><TabsTrigger value="answers">Respuestas</TabsTrigger>
    </TabsList>
    <TabsContent value="diagnosis"><Diagnosis /></TabsContent>
    <TabsContent value="conversations"><Conversations /></TabsContent>
    <TabsContent value="sources"><Sources /></TabsContent>
    <TabsContent value="audit"><Audit /></TabsContent>
    <TabsContent value="plan"><Plan /></TabsContent>
    <TabsContent value="answers"><ClientAnswers /></TabsContent>
  </Tabs>;
}

function Diagnosis() {
  return <>
    <section className="executive-brief"><div className="brief-label"><ShieldAlert /> Conclusión ejecutiva</div><h2>El cuello principal aparece después de que el lead responde.</h2><p>Capital no tiene primero un problema de velocidad automática: tiene un problema de clasificación, responsabilidad y cierre del siguiente paso. Hay conversación e interés acumulados que todavía no se transforman en una gestión comercial visible.</p><div className="client-script"><span>Cómo explicarlo al cliente</span><strong>“Antes de pedir más leads, vamos a ordenar y recuperar los que ya respondieron. Hoy el mayor potencial está dentro del CRM.”</strong></div></section>
    <section className="signal-grid" aria-label="Señales prioritarias"><article><span>66,7%</span><strong>Respondieron y siguen en Nuevo Lead</strong><p>196 de 294 oportunidades</p></article><article><span>99,2%</span><strong>Sin responsable en la oportunidad</strong><p>366 de 369 oportunidades tempranas</p></article><article><span>25</span><strong>Handoffs fuera del SLA</strong><p>Último entrante sin respuesta por más de 30 min</p></article><article><span>86,8%</span><strong>Aperturas demasiado largas</strong><p>528 caracteres promedio</p></article></section>
    <section><SectionHeading kicker="Mapa de cuellos de botella" title="Qué está frenando la operación y qué hacer ahora" note="Ordenado por impacto comercial" /><div className="bottleneck-list">{bottlenecks.map((item) => <article key={item.priority} className="bottleneck-row"><div className="bottleneck-rank"><span>{item.priority}</span><Badge variant={item.severity === 'Crítico' ? 'destructive' : 'outline'}>{item.severity}</Badge></div><div className="bottleneck-main"><h3>{item.title}</h3><p>{item.evidence}</p></div><div className="bottleneck-cell"><span>Lectura preliminar</span><p>{item.diagnosis}</p></div><div className="bottleneck-cell action"><span>Acción recomendada</span><p>{item.action}</p><em>{item.owner}</em></div></article>)}</div></section>
    <section className="two-column-block"><div><SectionHeading kicker="Qué sí está funcionando" title="Señales que conviene conservar" /><div className="positive-list"><p><CheckCircle2 /><span><strong>Primer contacto rápido.</strong> Mediana de 1 minuto y P90 de 7 minutos.</span></p><p><CheckCircle2 /><span><strong>El bot suele preguntar.</strong> 74,9% de las aperturas incluye una pregunta.</span></p><p><CheckCircle2 /><span><strong>Los tres leads de hoy recibieron contacto.</strong> Sin fallo de WhatsApp en el corte diario.</span></p><p><CheckCircle2 /><span><strong>No se detectaron duplicados.</strong> Entre las oportunidades tempranas analizadas.</span></p></div></div><div><SectionHeading kicker="Stock actual" title="Foto operativa, no conversión" /><div className="funnel">{stages.map(([name, value]) => <div key={name}><span>{name}</span><i style={{ width: `${Math.max(5, value / 294 * 100)}%` }} /><b>{value}</b></div>)}</div></div></section>
    <section className="method-note"><CircleAlert /><p><strong>No presentamos conversiones falsas.</strong> La API muestra la etapa actual, pero no un historial completo de movimientos. Los ratios del SOP se activarán cuando capturemos cada cambio de etapa por fecha y cohorte.</p></section>
  </>;
}

function Conversations() {
  return <><SectionHeading kicker="Auditoría de 7.603 mensajes" title="Qué preguntan los leads y dónde pierde fuerza la conversación" note="Conteos por oportunidad; una conversación puede tener varios temas" /><section className="conversation-layout"><div className="theme-panel"><h3>Preguntas y temas más frecuentes</h3><div className="theme-bars">{questionThemes.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value / 127 * 100}%` }} /></i><strong>{value}</strong></div>)}</div></div><aside className="knowledge-panel"><div className="card-kicker"><Bot /> Prioridad de conocimiento IA</div><h3>La base debe responder primero cinco bloques.</h3><ol><li>Disponibilidad y tipologías reales.</li><li>Ubicación, proyecto y diferencias por zona.</li><li>Precio, anticipo y financiación.</li><li>Entrega, estado de obra y posesión.</li><li>Amenities, cochera, expensas y gastos.</li></ol><p>Después de responder, el bot debe elegir entre calificar, proponer visita o derivar.</p></aside></section><SectionHeading kicker="Salud del bot y del handoff" title="La velocidad es buena; la precisión operativa no" /><section className="health-grid"><article><Gauge /><span>Velocidad automática</span><strong>1 min</strong><p>Mediana hasta el primer saliente exitoso.</p></article><article className="warning"><MessageCircle /><span>Extensión de apertura</span><strong>528 caracteres</strong><p>86,8% supera 240 caracteres.</p></article><article className="warning"><Users /><span>Solo automatización</span><strong>61 casos</strong><p>Sin saliente humano registrado.</p></article><article className="danger"><Clock3 /><span>Entrante sin respuesta</span><strong>25 casos</strong><p>Más de 30 minutos; 21 superan 24 h.</p></article><article><AlertTriangle /><span>Fallos de entrega</span><strong>51 casos</strong><p>Históricos; el corte de hoy registró cero.</p></article><article><FileQuestion /><span>Calificados a validar</span><strong>44 de 75</strong><p>Sin variable comercial detectable en texto.</p></article></section><section className="copy-recommendation"><div><div className="eyebrow">Prueba recomendada</div><h3>Reducir el mensaje inicial a una sola decisión.</h3><p>La apertura debe identificar el proyecto, hacer una pregunta cerrada y guardar la respuesta como señal estructurada.</p></div><blockquote>Hola [Nombre], vi que consultaste por [Proyecto]. ¿Buscás departamento para vivir o para invertir?</blockquote><div className="test-metrics"><span>Medir por versión</span><p>Respuesta en 24 h · Calificación · Visita solicitada · Fallback</p></div></section></>;
}

function Sources() {
  return <><SectionHeading kicker="Rendimiento por fuente" title="Lectura conversacional del stock actual" note="No equivale todavía a conversión de cohorte" /><section className="source-conclusions"><article><Target /><div><strong>WhatsApp directo</strong><p>Mayor intención comercial: 53,8% en 26 oportunidades.</p></div></article><article><AlertTriangle /><div><strong>Salguero</strong><p>Menor respuesta e intención entre fuentes con volumen.</p></div></article><article><Database /><div><strong>Atribución fragmentada</strong><p>Zonaprop, web y SUELO aparecen con nombres distintos.</p></div></article></section><div className="source-table-wrap"><table className="source-table"><thead><tr><th>Fuente</th><th>Oportunidades</th><th>Respuesta útil</th><th>Señal comercial</th><th>Visita o posterior*</th><th>Lectura</th></tr></thead><tbody>{sourceRows.map((row) => <tr key={row.source}><td><strong>{row.source}</strong></td><td>{row.volume}</td><td>{row.response}</td><td>{row.commercial}</td><td>{row.advanced}</td><td>{row.reading}</td></tr>)}</tbody></table></div><p className="table-footnote">* Etapa actual en Visita Solicitada o posterior. No demuestra que toda la cohorte haya convertido desde esa fuente.</p><section className="source-actions"><div><span>01</span><strong>Separar reactivación de adquisición</strong><p>RBDD no debe mezclarse con campañas nuevas.</p></div><div><span>02</span><strong>Normalizar el catálogo</strong><p>Un valor único para Meta, Google, portales, WhatsApp y orgánico.</p></div><div><span>03</span><strong>Guardar primera y última atribución</strong><p>Campaña, conjunto, anuncio, formulario y proyecto.</p></div><div><span>04</span><strong>Vincular fuente con visita</strong><p>Medir compradores y no solo volumen de oportunidades.</p></div></section></>;
}

function Audit() {
  return <><SectionHeading kicker="Auditoría mensual del SOP" title="Cinco listas para revisar conversaciones con intención" note="Muestra sugerida: 5–10 contactos por lista" /><section className="audit-list">{auditRows.map((row) => <article key={row.name}><div className="audit-count"><strong>{row.count}</strong><span>{row.status}</span></div><div><h3>{row.name}</h3><p>{row.finding}</p></div><div className="audit-next"><span>Siguiente paso</span><p>{row.next}</p></div></article>)}</section><SectionHeading kicker="Benchmarks Pixelstate" title="Umbrales que activará el histórico" note="Valor actual: no calculable con stock" /><section className="benchmark-grid">{benchmarks.map(([metric, healthy, emergency]) => <article key={metric}><strong>{metric}</strong><p><span>Saludable {healthy}</span><em>Emergencia {emergency}</em></p></article>)}</section><section className="audit-deliverable"><div><ListChecks /><strong>Minuta mensual</strong></div><p><b>Calibración IA:</b> qué respuestas y variables se incorporaron.</p><p><b>Rendimiento humano:</b> tiempos de handoff y corrección de guiones.</p><p><b>Causa de descarte:</b> objeción dominante y evidencia.</p></section></>;
}

function Plan() {
  return <><SectionHeading kicker="Plan de intervención" title="Acciones con dueño, horizonte y verificación" note="Primero recuperar valor; después escalar tráfico" /><section className="plan-board">{actionPlan.map((phase) => <article key={phase.horizon} className={`plan-phase ${phase.tone}`}><h3>{phase.horizon}</h3>{phase.items.map(([title, detail, owner]) => <div key={title}><CheckCircle2 /><p><strong>{title}</strong><span>{detail}</span></p><em>{owner}</em></div>)}</article>)}</section><section className="success-criteria"><div><Route /><span>Cómo sabremos que funcionó</span></div><ul><li>El backlog de Nuevo Lead respondidos baja semana a semana.</li><li>Toda oportunidad calificada tiene responsable y próxima acción.</li><li>Ningún handoff supera 30 minutos sin alerta.</li><li>La apertura breve mejora respuesta sin aumentar fallbacks.</li><li>Las visitas se pueden atribuir a fuente, proyecto y período.</li></ul></section></>;
}

function ClientAnswers() {
  return <><SectionHeading kicker="Apoyo para Sofía y Juan" title="Respuestas listas para una reunión con el cliente" note="Lenguaje comercial basado en el corte actual" /><Accordion className="client-faq">{clientAnswers.map((item, index) => <AccordionItem key={item.question} value={`answer-${index}`}><AccordionTrigger><span><b>{String(index + 1).padStart(2, '0')}</b>{item.question}</span></AccordionTrigger><AccordionContent><p>{item.answer}</p></AccordionContent></AccordionItem>)}</Accordion><section className="meeting-close"><UserRoundCheck /><div><div className="eyebrow">Cierre sugerido</div><h3>Qué pedimos al cliente</h3></div><ol><li>Confirmar la regla comercial de Lead Calificado.</li><li>Definir responsables y guardia para visitas.</li><li>Aprobar la prueba de apertura breve y CTA directo.</li><li>Exigir motivo de descarte y próxima acción.</li></ol></section><section className="methodology"><h3>Alcance del informe preliminar</h3><p>Se analizaron 391 oportunidades, 391 contactos únicos y 7.603 mensajes relevantes. Las señales textuales son heurísticas y deben validarse con una muestra manual. No se guardaron ni muestran nombres, teléfonos, correos ni cuerpos de mensajes.</p></section></>;
}

function EmptyAccount({ account }: { account: Account }) {
  const blocked = account.status === 'Bloqueada';
  return <section className="empty-state"><div className="empty-icon">{blocked ? <LockKeyhole /> : <Database />}</div><div><div className="eyebrow">Estado de la cuenta</div><h2>{blocked ? 'Conexión bloqueada' : 'Aún no hay lectura disponible'}</h2><p>{blocked ? `${account.note}. Antes de iniciar el informe hace falta resolver esta dependencia.` : 'Conecta la subcuenta GHL para habilitar el diagnóstico comercial y la auditoría de conversaciones.'}</p></div><div className="checklist"><span>{blocked ? 'Para desbloquear' : 'Checklist de conexión'}</span>{['Confirmar acceso a GHL', 'Validar pipeline y etapas', 'Mapear fuentes, tags y responsables', 'Ejecutar primera auditoría'].map((step, index) => <p key={step}><i>{index + 1}</i>{step}</p>)}</div></section>;
}

function AccessModel() {
  return <section className="access-model"><div><div className="eyebrow">Modelo de accesos</div><h2>Visibilidad simple, responsabilidad clara.</h2><p>La autenticación real se incorpora en la siguiente fase.</p></div><div className="access-roles"><article><span>01</span><strong>Dirección</strong><p>Ve toda la cartera y los informes.</p></article><article><span>02</span><strong>Equipo operativo</strong><p>Juan y Sofi con usuarios individuales y el mismo rol.</p></article><article><span>03</span><strong>Cliente</strong><p>Cada cliente ve únicamente su propia cuenta.</p></article></div></section>;
}

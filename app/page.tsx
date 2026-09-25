'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileSearch,
  Gauge,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  Presentation,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Waypoints,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AccountStatus = 'Conectada' | 'Bloqueada' | 'Por conectar' | 'Excluida';
type Health = 'green' | 'yellow' | 'red' | 'pending';
type AccountMetrics = {
  opportunities: number;
  qualified: number;
  visitOrLater: number;
  scope: string;
};
type Account = {
  name: string;
  status: AccountStatus;
  note?: string;
  metrics?: AccountMetrics;
  reportEnabled: boolean;
};
type ReportView = 'client' | 'internal';
type Period = {
  id: string;
  label: string;
  cadence: 'Quincenal' | 'Mensual';
  available: boolean;
};
type DetailItem = {
  title: string;
  count: number | string;
  criteria: string;
  action: string;
  owner: 'PIXEL' | 'EQUIPO COMERCIAL';
};

type ProblemContact = {
  accountName: string;
  contactName: string;
  problem: string;
  evidence: string;
  owner: 'PIXEL' | 'EQUIPO COMERCIAL';
  priority: 'P0' | 'P1' | 'P2';
  ghlUrl: string;
};

const capitalMetrics: AccountMetrics = {
  opportunities: 391,
  qualified: 75,
  visitOrLater: 22,
  scope: 'Stock al corte',
};

const responseBaseline = {
  newLeads: 294,
  usefulResponses: 196,
};

const noResponseCount =
  responseBaseline.newLeads - responseBaseline.usefulResponses;
const noResponseRate = percentage(noResponseCount, responseBaseline.newLeads);

// Se completa al autorizar la lectura de Meta Ads en la integración de GHL.
// Mantener null evita mostrar costos calculados con una inversión inventada.
const metaSpend: number | null = null;

const accounts: Account[] = [
  { name: 'Adolma', status: 'Por conectar', reportEnabled: true },
  { name: 'Alessandri', status: 'Por conectar', reportEnabled: true },
  {
    name: 'Capital Brokers (SUELO)',
    status: 'Conectada',
    note: 'Informe comercial disponible',
    metrics: capitalMetrics,
    reportEnabled: true,
  },
  {
    name: 'Capital Brokers - WOW 1',
    status: 'Excluida',
    note: 'Fuera del alcance de esta implementación',
    reportEnabled: false,
  },
  {
    name: 'El Salvaje',
    status: 'Bloqueada',
    note: 'Falta definir cuenta publicitaria',
    reportEnabled: true,
  },
  { name: 'Grupo CISA', status: 'Por conectar', reportEnabled: true },
  { name: 'Jorge Musa Remax', status: 'Por conectar', reportEnabled: true },
  { name: 'SUMA Group', status: 'Por conectar', reportEnabled: true },
  {
    name: 'Terracent',
    status: 'Excluida',
    note: 'Fuera del alcance de esta implementación',
    reportEnabled: false,
  },
  { name: 'Urbanika', status: 'Por conectar', reportEnabled: true },
  {
    name: 'YUD Desarrollos',
    status: 'Excluida',
    note: 'Fuera del alcance de esta implementación',
    reportEnabled: false,
  },
];
const capital = accounts[2];

// Se completa con el extracto quincenal. No se agregan contactos ficticios.
// Cada registro habilita el enlace directo al contacto real dentro de GHL.
const problemContacts: ProblemContact[] = [];

const periods: Period[] = [
  {
    id: '2026-09-h1',
    label: '1–15 sep 2026',
    cadence: 'Quincenal',
    available: true,
  },
  {
    id: '2026-08-h2',
    label: '16–31 ago 2026',
    cadence: 'Quincenal',
    available: false,
  },
  {
    id: '2026-08-h1',
    label: '1–15 ago 2026',
    cadence: 'Quincenal',
    available: false,
  },
  {
    id: '2026-09',
    label: 'Septiembre 2026',
    cadence: 'Mensual',
    available: false,
  },
  { id: '2026-08', label: 'Agosto 2026', cadence: 'Mensual', available: false },
];

const crmStages = [
  { label: 'Nuevo Lead', value: 294, note: 'Etapa CRM' },
  { label: 'Lead Calificado', value: 75, note: 'Etapa CRM' },
  {
    label: 'Visita Solicitada o posterior',
    value: 22,
    note: 'Agrupación temporal hasta recibir el desglose por etapa',
  },
];

const ageBuckets = [
  { label: '0–1 día', value: 27 },
  { label: '2–7 días', value: 26 },
  { label: '8–30 días', value: 124 },
  { label: '+30 días', value: 192 },
];

const themes = [
  ['Disponibilidad y tipología', 127],
  ['Ubicación y zona', 113],
  ['Precio', 62],
  ['Día u horario', 47],
  ['Entrega y estado de obra', 44],
  ['Financiación', 32],
] as const;

const objections: Array<DetailItem & { meaning: string }> = [
  {
    title: 'No interesado',
    count: 19,
    criteria:
      'La conversación contiene un rechazo explícito al proyecto o a continuar.',
    meaning:
      'Puede ser desajuste real o una salida rápida ante una conversación poco relevante.',
    action:
      'Separar rechazo al proyecto, al momento y a la propuesta antes de cerrar.',
    owner: 'EQUIPO COMERCIAL',
  },
  {
    title: 'No es el momento',
    count: 9,
    criteria: 'El contacto posterga la decisión o expresa una ventana futura.',
    meaning:
      'Existe una ventana futura que hoy no queda estructurada en el CRM.',
    action: 'Registrar fecha concreta de retomada y motivo.',
    owner: 'EQUIPO COMERCIAL',
  },
  {
    title: 'Desajuste de presupuesto',
    count: 5,
    criteria:
      'El contacto declara que precio, anticipo o cuota exceden su posibilidad.',
    meaning:
      'El precio aparece antes de confirmar rango, anticipo o flexibilidad.',
    action: 'Validar rango, anticipo y alternativas antes de descartar.',
    owner: 'EQUIPO COMERCIAL',
  },
  {
    title: 'Necesita financiación',
    count: 4,
    criteria: 'El contacto solicita una estructura de pago o financiación.',
    meaning:
      'No siempre es una objeción; puede ser una variable de calificación.',
    action:
      'Capturar anticipo, plazo y cuota objetivo; ajustar la respuesta del bot.',
    owner: 'PIXEL',
  },
];

const sourceRows = [
  {
    source: 'RBDD 07/2026',
    volume: 176,
    response: 95.5,
    commercial: 23.9,
    advanced: 5,
    reading: 'Reactivación; no comparar con adquisición.',
  },
  {
    source: 'Armenia 2327',
    volume: 63,
    response: 50.8,
    commercial: 19,
    advanced: 0,
    reading: 'Volumen alto, sin avance visible a visita.',
  },
  {
    source: 'Charcas',
    volume: 32,
    response: 40.6,
    commercial: 18.8,
    advanced: 1,
    reading: 'Respuesta baja; revisar anuncio y apertura.',
  },
  {
    source: 'Zonaprop · normalizado',
    volume: 30,
    response: 53.3,
    commercial: 26.7,
    advanced: 3,
    reading: 'Variable comercial detectable razonable.',
  },
  {
    source: 'WhatsApp directo',
    volume: 26,
    response: 100,
    commercial: 53.8,
    advanced: 2,
    reading: 'Mayor intención; muestra distinta a pauta.',
  },
  {
    source: 'Salguero',
    volume: 19,
    response: 31.6,
    commercial: 10.5,
    advanced: 0,
    reading: 'Lectura más débil entre fuentes con volumen.',
  },
  {
    source: 'Lead Ads SUELO',
    volume: 18,
    response: 55.6,
    commercial: 22.2,
    advanced: 0,
    reading: 'Auditar por qué no está asociada a su campaña.',
  },
];

const actionPlan = [
  {
    horizon: '48 horas',
    title: 'Recuperar valor inmediato',
    items: [
      {
        text: 'Revisar los 50 casos con variable comercial detectable.',
        owner: 'EQUIPO COMERCIAL',
      },
      {
        text: 'Reasignar los 25 handoffs demorados.',
        owner: 'EQUIPO COMERCIAL',
      },
      {
        text: 'Resolver los 20 casos sin primer saliente exitoso.',
        owner: 'PIXEL',
      },
      {
        text: 'Corregir la regla de asignación de oportunidades.',
        owner: 'PIXEL',
      },
    ],
  },
  {
    horizon: '7 días',
    title: 'Corregir la conversación',
    items: [
      { text: 'Probar una apertura menor a 220 caracteres.', owner: 'PIXEL' },
      { text: 'Guardar finalidad, rango y plazo como campos.', owner: 'PIXEL' },
      {
        text: 'Ofrecer dos opciones concretas de visita.',
        owner: 'EQUIPO COMERCIAL',
      },
      { text: 'Reasignar automáticamente a los 30 minutos.', owner: 'PIXEL' },
    ],
  },
  {
    horizon: 'Próximo corte',
    title: 'Medir el cambio',
    items: [
      { text: 'Cargar historial de etapa por fecha.', owner: 'PIXEL' },
      { text: 'Separar reactivación de adquisición.', owner: 'PIXEL' },
      {
        text: 'Validar motivos de descarte de la quincena.',
        owner: 'EQUIPO COMERCIAL',
      },
      { text: 'Documentar resultado y próxima decisión.', owner: 'PIXEL' },
    ],
  },
] as const;

const clientFaq = [
  {
    q: '¿Dónde está hoy el principal cuello de botella?',
    a: 'En el corte actual, 294 oportunidades figuran como Nuevo Lead y 75 como Lead Calificado. El siguiente paso es reconstruir el movimiento entre etapas por quincena para distinguir backlog de conversión real.',
  },
  {
    q: '¿Qué significa una respuesta útil?',
    a: 'Es una respuesta del contacto con contenido relevante. No equivale a una etapa del CRM ni a un lead calificado.',
  },
  {
    q: '¿Qué significa una variable comercial detectable?',
    a: 'La conversación menciona precio, financiación, disponibilidad, finalidad, plazo u otra variable útil. Es una cola de revisión, no una calificación automática.',
  },
  {
    q: '¿Qué período cubre el reporte?',
    a: 'Esta versión corresponde al corte base del 1 al 15 de septiembre de 2026. El histórico quincenal y el agregado mensual quedan preparados para completarse con los próximos cortes.',
  },
  {
    q: '¿Por qué todavía no aparecen costos por etapa?',
    a: 'El corte entregado no contiene el gasto publicitario. Al sincronizar el gasto de Meta desde GHL se calcularán costo por lead, Lead Calificado y Visita Solicitada.',
  },
];

const reviewQueues: DetailItem[] = [
  {
    title: 'Sin primer saliente exitoso',
    count: 20,
    criteria:
      'Creada hace más de 30 minutos, en Nuevo Lead y sin mensaje saliente exitoso.',
    action: 'Revisar teléfono, workflow, webhook y estado de entrega.',
    owner: 'PIXEL',
  },
  {
    title: 'Entrante sin respuesta +30 min',
    count: 25,
    criteria:
      'Existe mensaje entrante y no hubo respuesta posterior dentro del SLA.',
    action: 'Responder, reasignar o cerrar con motivo.',
    owner: 'EQUIPO COMERCIAL',
  },
  {
    title: 'Nuevo Lead con variable comercial',
    count: 50,
    criteria:
      'Está en Nuevo Lead y el texto contiene una variable comercial detectable.',
    action: 'Calificar, nutrir o descartar aplicando el criterio acordado.',
    owner: 'EQUIPO COMERCIAL',
  },
  {
    title: 'Solo automatización',
    count: 61,
    criteria: 'No se registra intervención humana en una oportunidad temprana.',
    action: 'Validar el disparador de handoff y su necesidad comercial.',
    owner: 'PIXEL',
  },
  {
    title: 'Calificados sin variable detectable',
    count: 44,
    criteria:
      'Figura como Lead Calificado, pero la auditoría no encuentra una variable comercial en el texto.',
    action: 'Confirmar el criterio o corregir la etapa.',
    owner: 'PIXEL',
  },
];

function percentage(value: number, total: number) {
  return total ? (value / total) * 100 : 0;
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function accountHealth(account: Account): Health {
  if (!account.metrics) return 'pending';
  const rate = percentage(
    account.metrics.qualified,
    account.metrics.opportunities,
  );
  if (rate > 25) return 'green';
  if (rate >= 15) return 'yellow';
  return 'red';
}

function healthLabel(health: Health) {
  return {
    green: 'Salud verde',
    yellow: 'Salud amarilla',
    red: 'Salud roja',
    pending: 'Sin datos',
  }[health];
}

function Status({ status }: { status: AccountStatus }) {
  return (
    <Badge
      variant={status === 'Bloqueada' ? 'destructive' : 'outline'}
      className="status"
    >
      <span className="dot" />
      {status}
    </Badge>
  );
}

function SectionHeader({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note?: string;
}) {
  return (
    <header className="section-header">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {note && <p>{note}</p>}
    </header>
  );
}

function EvidenceTag({
  children,
  tone = 'confirmed',
}: {
  children: React.ReactNode;
  tone?: 'confirmed' | 'inferred' | 'pending';
}) {
  return (
    <span className={`evidence-tag ${tone}`}>
      <i />
      {children}
    </span>
  );
}

export default function Page() {
  const [selected, setSelected] = useState<Account | null>(null);
  const [filter, setFilter] = useState('Todas');
  const [reportView, setReportView] = useState<ReportView>('client');
  const [periodId, setPeriodId] = useState(periods[0].id);
  const visible = useMemo(
    () =>
      accounts.filter((account) => {
        if (filter === 'Todas') return true;
        if (filter === 'Habilitadas') return account.reportEnabled;
        if (filter === 'Sin datos')
          return account.reportEnabled && !account.metrics;
        return !account.reportEnabled;
      }),
    [filter],
  );
  const isCapital = selected?.name === capital.name;
  const hasReport = Boolean(selected?.reportEnabled);
  const period = periods.find((item) => item.id === periodId) ?? periods[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selected, reportView]);

  if (selected) {
    return (
      <main className="shell">
        <header className="topbar">
          <button
            className="brand"
            onClick={() => setSelected(null)}
            aria-label="Volver a la cartera"
          >
            <span>PS</span>
            <div>
              PIXELSTATE<small>INTELIGENCIA COMERCIAL</small>
            </div>
          </button>
          <div className="top-actions">
            <span className="sync">
              <RefreshCw /> Corte base: 17 sep 2026 · 10:01
            </span>
            <Button variant="outline" onClick={() => setSelected(null)}>
              <ArrowLeft /> Cartera
            </Button>
          </div>
        </header>
        <section className="report-heading">
          <div>
            <div className="eyebrow">Informe comercial preliminar</div>
            <h1>{selected.name}</h1>
            <div className="inline-meta">
              <Status status={selected.status} />
              {isCapital ? (
                <Badge variant="outline">
                  391 oportunidades · 7.603 mensajes
                </Badge>
              ) : hasReport ? (
                <Badge variant="outline">
                  Plantilla habilitada · primer corte pendiente
                </Badge>
              ) : null}
            </div>
          </div>
          {hasReport && (
            <aside className="decision-card">
              <span>Decisión recomendada</span>
              <strong>
                {isCapital
                  ? 'Ordenar el pipeline y construir una base quincenal comparable.'
                  : 'Completar el primer corte y convertir hallazgos en acciones enlazadas a GHL.'}
              </strong>
            </aside>
          )}
        </section>
        {hasReport && (
          <ModeSwitcher value={reportView} onChange={setReportView} />
        )}
        {hasReport && <PeriodControl value={periodId} onChange={setPeriodId} />}
        {hasReport ? (
          period.available ? (
            isCapital ? (
              <CapitalReport audience={reportView} />
            ) : (
              <PendingAccountReport account={selected} audience={reportView} />
            )
          ) : (
            <PeriodUnavailable period={period} />
          )
        ) : (
          <ExcludedAccount account={selected} />
        )}
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span>PS</span>
          <div>
            PIXELSTATE<small>INTELIGENCIA COMERCIAL</small>
          </div>
        </div>
        <span className="portfolio-date">Cartera · corte quincenal</span>
      </header>
      <section className="portfolio-head">
        <div>
          <div className="eyebrow">Panorama central</div>
          <h1>Salud comercial por cuenta.</h1>
          <p>
            Tres métricas para priorizar la revisión quincenal y preparar el
            agregado mensual.
          </p>
        </div>
        <div className="health-legend" aria-label="Criterio de salud">
          <strong>Criterio: avance a Lead Calificado</strong>
          <span>
            <i className="green" /> Verde: más de 25%
          </span>
          <span>
            <i className="yellow" /> Amarillo: 15%–25%
          </span>
          <span>
            <i className="red" /> Rojo: menos de 15%
          </span>
        </div>
      </section>
      <section className="toolbar">
        <div>
          {['Todas', 'Habilitadas', 'Sin datos', 'Excluidas'].map((value) => (
            <button
              key={value}
              className={filter === value ? 'selected' : ''}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <span>Los colores se calculan; no son una valoración manual.</span>
      </section>
      <section className="account-grid">
        {visible.map((account) => (
          <AccountCard
            key={account.name}
            account={account}
            onOpen={() => setSelected(account)}
          />
        ))}
      </section>
      <AccessModel />
    </main>
  );
}

function AccountCard({
  account,
  onOpen,
}: {
  account: Account;
  onOpen: () => void;
}) {
  const health = accountHealth(account);
  const metrics = account.metrics;
  const qualifiedRate = metrics
    ? percentage(metrics.qualified, metrics.opportunities)
    : null;
  const visitRate = metrics
    ? percentage(metrics.visitOrLater, metrics.opportunities)
    : null;
  return (
    <button
      className={`account-card health-${health} ${account.reportEnabled ? '' : 'excluded'}`}
      onClick={onOpen}
    >
      <div className="account-card-head">
        <Status status={account.status} />
        <span className={`health-badge ${health}`}>
          <i /> {healthLabel(health)}
        </span>
      </div>
      <strong>{account.name}</strong>
      <p>
        {metrics?.scope ?? account.note ?? 'Configuración de lectura pendiente'}
      </p>
      <div className="account-metrics">
        <div>
          <span>{metrics?.opportunities ?? '—'}</span>
          <small>Leads del corte</small>
        </div>
        <div>
          <span>
            {qualifiedRate === null ? '—' : formatPercent(qualifiedRate)}
          </span>
          <small>
            {metrics
              ? `${metrics.qualified} calificados`
              : 'Avance a calificado'}
          </small>
        </div>
        <div>
          <span>{visitRate === null ? '—' : formatPercent(visitRate)}</span>
          <small>
            {metrics
              ? `${metrics.visitOrLater} visita o posterior`
              : 'Avance a visita'}
          </small>
        </div>
      </div>
      <span className="account-link">
        {metrics
          ? 'Abrir informe'
          : account.reportEnabled
            ? 'Preparar primer corte'
            : 'Fuera de alcance'}{' '}
        <ArrowRight />
      </span>
    </button>
  );
}

function ModeSwitcher({
  value,
  onChange,
}: {
  value: ReportView;
  onChange: (value: ReportView) => void;
}) {
  return (
    <section className="view-switcher" aria-label="Tipo de informe">
      <div>
        <span>Modo de lectura</span>
        <strong>
          {value === 'client'
            ? 'Presentación mensual para el cliente'
            : 'Revisión quincenal interna'}
        </strong>
        <p>
          {value === 'client'
            ? 'Evolución, inversión, costos y decisiones para el PM.'
            : 'Riesgos, acciones y colas de trabajo para CRM y Campañas.'}
        </p>
      </div>
      <div className="view-toggle" aria-label="Seleccionar modo">
        <button
          className={value === 'client' ? 'active' : ''}
          onClick={() => onChange('client')}
        >
          <Presentation /> Cliente
        </button>
        <button
          className={value === 'internal' ? 'active' : ''}
          onClick={() => onChange('internal')}
        >
          <ShieldCheck /> Interno
        </button>
      </div>
    </section>
  );
}

function PeriodControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const current = periods.find((period) => period.id === value) ?? periods[0];
  return (
    <section className="period-control">
      <div>
        <CalendarClock />
        <span>Período</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Período del reporte"
        >
          <optgroup label="Quincenal · uso interno">
            {periods
              .filter((period) => period.cadence === 'Quincenal')
              .map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                  {period.available ? '' : ' · pendiente de carga'}
                </option>
              ))}
          </optgroup>
          <optgroup label="Mensual · vista cliente">
            {periods
              .filter((period) => period.cadence === 'Mensual')
              .map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label} · pendiente de carga
                </option>
              ))}
          </optgroup>
        </select>
      </div>
      <p>
        <strong>{current.cadence}</strong>
        {current.available
          ? 'Corte base disponible. La comparación se activará con el próximo corte.'
          : 'Este período todavía no tiene una carga consolidada.'}
      </p>
    </section>
  );
}

function PeriodUnavailable({ period }: { period: Period }) {
  return (
    <section className="period-empty">
      <CalendarClock />
      <div>
        <div className="eyebrow">Histórico preparado</div>
        <h2>{period.label} todavía no tiene un corte cargado.</h2>
        <p>
          Cuando se incorpore el archivo quincenal, este período mostrará
          funnel, variación contra el corte anterior, inversión y costos por
          etapa sin modificar la interfaz.
        </p>
      </div>
    </section>
  );
}

function CapitalReport({ audience }: { audience: ReportView }) {
  return audience === 'client' ? <ClientReport /> : <InternalReport />;
}

function ClientReport() {
  return (
    <Tabs defaultValue="executive" className="report-tabs report-surface">
      <TabsList aria-label="Secciones para el cliente">
        <TabsTrigger value="executive">Resumen ejecutivo</TabsTrigger>
        <TabsTrigger value="messages">Conversaciones</TabsTrigger>
        <TabsTrigger value="sources">Fuentes</TabsTrigger>
        <TabsTrigger value="plan">Plan de acción</TabsTrigger>
        <TabsTrigger value="meeting">Guía de reunión</TabsTrigger>
      </TabsList>
      <TabsContent value="executive">
        <ClientExecutive />
      </TabsContent>
      <TabsContent value="messages">
        <ClientMessages />
      </TabsContent>
      <TabsContent value="sources">
        <ClientSources />
      </TabsContent>
      <TabsContent value="plan">
        <ClientPlan />
      </TabsContent>
      <TabsContent value="meeting">
        <MeetingKit />
      </TabsContent>
    </Tabs>
  );
}

function ClientExecutive() {
  const qualifiedRate = percentage(
    capitalMetrics.qualified,
    capitalMetrics.opportunities,
  );
  const visitRate = percentage(
    capitalMetrics.visitOrLater,
    capitalMetrics.opportunities,
  );
  return (
    <>
      <section className="executive-hero">
        <div className="hero-copy">
          <div className="hero-label">
            <Sparkles /> Lectura ejecutiva
          </div>
          <h2>
            El corte base muestra una cuenta en estado amarillo y un pipeline
            que necesita trazabilidad.
          </h2>
          <p>
            El 19,2% del stock figura como Lead Calificado. Antes de atribuir
            causas o hablar de conversión, el próximo corte debe registrar los
            movimientos por fecha, desglosar correctamente las etapas de visita
            y comparar la tasa de no respuesta, hoy en 33,3%.
          </p>
          <div className="talk-track">
            <span>Cómo decirlo</span>
            <blockquote>
              “Ya tenemos una línea base. En la próxima revisión vamos a mostrar
              cuánto avanzó cada etapa, si bajó la no respuesta, qué acciones se
              ejecutaron y cómo cambió el costo comercial.”
            </blockquote>
          </div>
        </div>
        <div className="hero-side">
          <div>
            <span>Salud</span>
            <strong>19,2%</strong>
          </div>
          <p>Avance del stock a Lead Calificado.</p>
          <EvidenceTag tone="inferred">Amarillo · línea base</EvidenceTag>
        </div>
      </section>
      <section className="metric-grid" aria-label="Indicadores principales">
        <Metric
          value="391"
          label="oportunidades"
          detail="Stock total del corte base"
        />
        <Metric
          value="75"
          label="Lead Calificado"
          detail={`${formatPercent(qualifiedRate)} del stock`}
        />
        <Metric
          value="22"
          label="visita o posterior"
          detail={`${formatPercent(visitRate)} · requiere desglose por etapa`}
        />
        <Metric
          value={formatPercent(noResponseRate)}
          label="sin respuesta útil"
          detail={`${noResponseCount} de ${responseBaseline.newLeads} oportunidades en Nuevo Lead`}
          tone="alert"
        />
        <Metric
          value="—"
          label="gasto publicitario"
          detail="Pendiente de sincronizar desde GHL / Meta"
          tone="pending"
        />
      </section>
      <section className="visual-grid">
        <article className="chart-card span-2">
          <SectionHeader
            kicker="Pipeline CRM"
            title="Etapas con el criterio del CRM"
            note="Stock al corte; no es todavía una tasa histórica"
          />
          <CrmFunnelChart />
        </article>
        <article className="insight-card">
          <span className="insight-number">22</span>
          <h3>oportunidades están en visita o una etapa posterior</h3>
          <p>
            El corte no trae el desglose exacto entre solicitada, agendada y
            realizada.
          </p>
          <div className="insight-action">
            <ArrowRight /> Pedir el conteo por cada etapa del pipeline.
          </div>
        </article>
      </section>
      <section className="executive-split">
        <article className="chart-card">
          <SectionHeader
            kicker="Evolución mensual"
            title="Septiembre queda como línea base"
            note="Los próximos cortes completarán la tendencia"
          />
          <EvolutionChart />
        </article>
        <article className="chart-card">
          <SectionHeader
            kicker="Inversión y eficiencia"
            title="Costos por etapa"
            note="Se calcularán con gasto publicitario sincronizado"
          />
          <CostGrid />
        </article>
      </section>
      <section>
        <SectionHeader
          kicker="Conclusiones del corte"
          title="Qué sabemos y qué falta confirmar"
          note="Sin convertir stock en conversión histórica"
        />
        <div className="conclusion-grid">
          <Conclusion
            index="01"
            title="La salud queda amarilla"
            evidence="75 de 391 oportunidades figuran como Lead Calificado."
            decision="Usar 19,2% como línea base del próximo corte."
          />
          <Conclusion
            index="02"
            title="Las visitas necesitan desglose"
            evidence="22 oportunidades están en Visita Solicitada o posterior."
            decision="Separar solicitada, agendada, realizada y reserva."
          />
          <Conclusion
            index="03"
            title="El costo aún no es calculable"
            evidence="El archivo actual no incluye gasto de Meta."
            decision="Sincronizar inversión antes del agregado mensual."
          />
        </div>
      </section>
      <MethodNote />
    </>
  );
}

function Metric({
  value,
  label,
  detail,
  tone = 'default',
}: {
  value: string;
  label: string;
  detail: string;
  tone?: 'default' | 'positive' | 'alert' | 'pending';
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{value}</span>
      <strong>{label}</strong>
      <p>{detail}</p>
    </article>
  );
}

function CrmFunnelChart() {
  const maxWidth = 650;
  return (
    <div className="chart-wrap">
      <svg
        className="journey-chart"
        viewBox="0 0 760 270"
        aria-labelledby="funnel-title funnel-desc"
      >
        <title id="funnel-title">Pipeline actual de Capital Brokers</title>
        <desc id="funnel-desc">
          294 oportunidades en Nuevo Lead, 75 en Lead Calificado y 22 en Visita
          Solicitada o una etapa posterior.
        </desc>
        {crmStages.map((item, index) => {
          const width = maxWidth - index * 150;
          const x = 55 + (maxWidth - width) / 2;
          const y = 18 + index * 82;
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={width}
                height="62"
                rx="10"
                className={`journey-step step-${index}`}
              />
              <text x={x + 18} y={y + 25} className="journey-label">
                {item.label}
              </text>
              <text x={x + 18} y={y + 46} className="journey-note">
                {item.note}
              </text>
              <text
                x={x + width - 18}
                y={y + 39}
                textAnchor="end"
                className="journey-value"
              >
                {item.value}
              </text>
              {index < crmStages.length - 1 && (
                <path
                  d={`M 380 ${y + 62} L 380 ${y + 80}`}
                  className="journey-line"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-caption">
        <EvidenceTag>Conteos CRM</EvidenceTag>
        <span>
          La última fila agrupa etapas hasta recibir el desglose exacto.
        </span>
      </div>
    </div>
  );
}

function EvolutionChart() {
  const monthlyRows = [
    ['Oportunidades', '—', '—', String(capitalMetrics.opportunities)],
    ['Nuevo Lead', '—', '—', String(responseBaseline.newLeads)],
    ['Lead Calificado', '—', '—', String(capitalMetrics.qualified)],
    ['Visita o posterior', '—', '—', String(capitalMetrics.visitOrLater)],
    ['Sin respuesta útil', '—', '—', formatPercent(noResponseRate)],
  ];

  return (
    <div
      className="evolution-chart"
      aria-label="Evolución mensual pendiente de histórico"
    >
      <div className="evolution-legend">
        <span>
          <i className="leads" /> Oportunidades
        </span>
        <span>
          <i className="qualified" /> Lead Calificado
        </span>
        <span>
          <i className="visit" /> Visita o posterior
        </span>
      </div>
      <div className="evolution-plot">
        <div className="month pending">
          <span>Jul</span>
          <i>Sin corte</i>
        </div>
        <div className="month pending">
          <span>Ago</span>
          <i>Sin corte</i>
        </div>
        <div className="month current">
          <span>Sep</span>
          <div style={{ height: '100%' }}>
            <b>391</b>
          </div>
          <div style={{ height: '19.2%' }}>
            <b>75</b>
          </div>
          <div style={{ height: '5.6%' }}>
            <b>22</b>
          </div>
        </div>
      </div>
      <p>
        La comparación aparecerá cuando existan al menos dos cortes homogéneos.
      </p>
      <div className="evolution-table-wrap">
        <table className="evolution-table">
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Jul</th>
              <th>Ago</th>
              <th>Sep</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map(([label, july, august, september]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{july}</td>
                <td>{august}</td>
                <td>{september}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="evolution-basis">
        No respuesta = Nuevo Lead sin respuesta útil ÷ total de Nuevo Lead del
        mismo corte.
      </p>
    </div>
  );
}

function CostGrid() {
  const formatMoney = (value: number | null) =>
    value === null
      ? '—'
      : new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 2,
        }).format(value);
  const costPerOpportunity =
    metaSpend === null ? null : metaSpend / capitalMetrics.opportunities;
  const costPerQualified =
    metaSpend === null ? null : metaSpend / capitalMetrics.qualified;
  const costPerVisit =
    metaSpend === null ? null : metaSpend / capitalMetrics.visitOrLater;

  return (
    <>
      <div className="cost-grid">
        {[
          ['Gasto Meta', formatMoney(metaSpend), 'Amount Spent de GHL'],
          [
            'Costo por oportunidad',
            formatMoney(costPerOpportunity),
            'Gasto ÷ oportunidades del corte',
          ],
          [
            'Costo por calificado',
            formatMoney(costPerQualified),
            'Gasto ÷ Lead Calificado',
          ],
          [
            'Costo por visita',
            formatMoney(costPerVisit),
            'Gasto ÷ Visita Solicitada',
          ],
        ].map(([label, value, note]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <p className="cost-source-note">
        Fuente prevista: Meta Ads → Amount Spent en GHL, usando exactamente el
        mismo período del corte. Falta autorizar esa lectura en la integración.
      </p>
    </>
  );
}

function Conclusion({
  index,
  title,
  evidence,
  decision,
}: {
  index: string;
  title: string;
  evidence: string;
  decision: string;
}) {
  return (
    <article className="conclusion-card">
      <span>{index}</span>
      <h3>{title}</h3>
      <p>{evidence}</p>
      <div>
        <strong>Decisión</strong>
        {decision}
      </div>
    </article>
  );
}

function ClientMessages() {
  const [selectedObjection, setSelectedObjection] = useState<DetailItem | null>(
    null,
  );
  return (
    <>
      <SectionHeader
        kicker="Inteligencia de conversaciones"
        title="Qué quieren saber los leads y cómo llevarlos al siguiente paso"
        note="7.603 mensajes analizados · señales agregadas y anonimizadas"
      />
      <section className="message-story">
        <article className="chart-card">
          <h3>La conversación gira alrededor de decisiones concretas</h3>
          <div className="theme-list">
            {themes.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <i>
                  <b style={{ width: `${(value / 127) * 100}%` }} />
                </i>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="micro-note">
            Una conversación puede contener más de un tema.
          </p>
        </article>
        <article className="narrative-card">
          <div className="eyebrow">Lectura comercial</div>
          <h3>Una mención no equivale a una señal positiva.</h3>
          <p>
            Los temas sirven para priorizar revisión. La calificación requiere
            necesidad, viabilidad y un siguiente paso explícito.
          </p>
          <ul>
            <li>
              <Check /> Responder la pregunta concreta.
            </li>
            <li>
              <Check /> Capturar finalidad, rango y momento.
            </li>
            <li>
              <Check /> Guardar la variable en GHL.
            </li>
            <li>
              <Check /> Cerrar con una acción verificable.
            </li>
          </ul>
        </article>
      </section>
      <section className="message-flow">
        <SectionHeader
          kicker="Arquitectura recomendada"
          title="Cada respuesta debe mover una decisión"
        />
        <div className="flow-track">
          <FlowStep
            icon={<MessageCircle />}
            index="01"
            title="Contexto"
            copy="Proyecto consultado y motivo de contacto."
          />
          <FlowStep
            icon={<FileSearch />}
            index="02"
            title="Necesidad"
            copy="Vivir o invertir, tipología, zona y plazo."
          />
          <FlowStep
            icon={<BriefcaseBusiness />}
            index="03"
            title="Viabilidad"
            copy="Rango, anticipo y financiación."
          />
          <FlowStep
            icon={<CalendarClock />}
            index="04"
            title="Siguiente paso"
            copy="Dos opciones de visita o fecha de retomada."
          />
        </div>
      </section>
      <section>
        <SectionHeader
          kicker="Objeciones detectadas"
          title="Cada segmento debe abrir una lista de trabajo"
          note="Los conteos son heurísticos; la lista nominal requiere IDs en el corte"
        />
        <div className="objection-grid">
          {objections.map((item) => (
            <button
              key={item.title}
              className="objection-card"
              onClick={() => setSelectedObjection(item)}
            >
              <div>
                <strong>{item.count}</strong>
                <span>{item.title}</span>
                <ArrowUpRight />
              </div>
              <p>{item.meaning}</p>
              <blockquote>{item.action}</blockquote>
              <small>Ver criterio y listado</small>
            </button>
          ))}
        </div>
      </section>
      <section className="script-lab">
        <div>
          <span>Disparador QA</span>
          <h3>Apertura demasiado larga.</h3>
          <p>86,8% de los primeros mensajes supera 240 caracteres.</p>
        </div>
        <blockquote>
          Hola [Nombre], vi que consultaste por [Proyecto]. ¿Buscás para vivir o
          para invertir?
        </blockquote>
        <div>
          <EvidenceTag tone="inferred">Acción PIXEL</EvidenceTag>
          <p>
            Crear versión corta y comparar respuesta útil en el siguiente corte.
          </p>
        </div>
      </section>
      <OpportunityDialog
        item={selectedObjection}
        onClose={() => setSelectedObjection(null)}
      />
    </>
  );
}

function FlowStep({
  icon,
  index,
  title,
  copy,
}: {
  icon: React.ReactNode;
  index: string;
  title: string;
  copy: string;
}) {
  return (
    <article>
      <div className="flow-icon">{icon}</div>
      <span>{index}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
      <ChevronRight className="flow-arrow" />
    </article>
  );
}

function ClientSources() {
  return (
    <>
      <SectionHeader
        kicker="Rendimiento por fuente"
        title="La calidad de conversación cambia según el origen"
        note="Lectura del stock; no equivale todavía a rentabilidad ni conversión de cohorte"
      />
      <section className="visual-grid source-visual">
        <article className="chart-card span-2">
          <h3>Variable comercial detectable por fuente</h3>
          <SourceSignalChart />
        </article>
        <article className="insight-card blue">
          <span className="insight-number">53,8%</span>
          <h3>WhatsApp directo concentra la mayor señal textual</h3>
          <p>
            Es una muestra distinta a pauta y no debe usarse como comparación
            causal.
          </p>
          <div className="insight-action">
            <Target /> Separar intención por tipo de origen.
          </div>
        </article>
      </section>
      <section
        className="definition-strip"
        aria-label="Definiciones de la tabla"
      >
        <div>
          <strong>Respuesta útil</strong>
          <span>El contacto respondió con contenido relevante.</span>
        </div>
        <div>
          <strong>Variable comercial</strong>
          <span>
            Menciona necesidad, precio, financiación, disponibilidad o plazo.
          </span>
        </div>
        <div>
          <strong>Visita o posterior</strong>
          <span>
            Etapa CRM actual en Visita Solicitada o una etapa posterior.
          </span>
        </div>
      </section>
      <div className="source-table-wrap">
        <table className="source-table">
          <thead>
            <tr>
              <th>Fuente</th>
              <th>Volumen</th>
              <th>Respuesta útil</th>
              <th>Variable comercial</th>
              <th>Visita o posterior</th>
              <th>Lectura</th>
            </tr>
          </thead>
          <tbody>
            {sourceRows.map((row) => (
              <tr key={row.source}>
                <td>
                  <strong>{row.source}</strong>
                </td>
                <td>{row.volume}</td>
                <td>{formatPercent(row.response)}</td>
                <td>{formatPercent(row.commercial)}</td>
                <td>{row.advanced}</td>
                <td>{row.reading}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="source-action">
        <AlertTriangle />
        <div>
          <span>Acción para PIXEL</span>
          <h3>Auditar “Lead Ads SUELO”.</h3>
          <p>
            Confirmar por qué aparece como fuente genérica y no asociada a la
            campaña correspondiente. Corregir normalización y atribución antes
            del próximo corte.
          </p>
        </div>
      </section>
      <section className="project-panel">
        <SectionHeader
          kicker="Proyecto consultado"
          title="Distribución por etiqueta de oportunidad"
          note="El gráfico se alimentará con las etiquetas de GHL"
        />
        <ProjectChart />
      </section>
    </>
  );
}

function SourceSignalChart() {
  const rows = sourceRows.slice().sort((a, b) => b.commercial - a.commercial);
  return (
    <div className="chart-wrap">
      <svg
        className="source-chart"
        viewBox="0 0 720 360"
        aria-labelledby="source-title source-desc"
      >
        <title id="source-title">
          Variable comercial detectable por fuente
        </title>
        <desc id="source-desc">
          WhatsApp directo muestra 53,8 por ciento; las demás fuentes se ubican
          entre 10,5 y 26,7 por ciento.
        </desc>
        {rows.map((row, index) => {
          const y = 25 + index * 46;
          const width = row.commercial * 7.5;
          return (
            <g key={row.source}>
              <text x="10" y={y + 18} className="source-label">
                {row.source}
              </text>
              <rect
                x="190"
                y={y}
                width="420"
                height="24"
                rx="5"
                className="source-track"
              />
              <rect
                x="190"
                y={y}
                width={width}
                height="24"
                rx="5"
                className={index === 0 ? 'source-bar leader' : 'source-bar'}
              />
              <text x="625" y={y + 18} className="source-value">
                {formatPercent(row.commercial)}
              </text>
            </g>
          );
        })}
        <line x1="377" y1="12" x2="377" y2="345" className="reference-line" />
        <text x="383" y="14" className="reference-label">
          25%
        </text>
      </svg>
      <div className="chart-caption">
        <EvidenceTag>Señal textual</EvidenceTag>
        <span>Prioriza revisión; no reemplaza la etapa CRM.</span>
      </div>
    </div>
  );
}

function ProjectChart() {
  return (
    <div className="project-chart-empty">
      <Database />
      <div>
        <strong>Datos de etiquetas no incluidos en el corte</strong>
        <p>
          Agregar `opportunity_id` y etiquetas permitirá contar el proyecto
          consultado y abrir su lista de oportunidades.
        </p>
      </div>
      <span>Campo requerido: tags</span>
    </div>
  );
}

function ClientPlan() {
  return (
    <>
      <SectionHeader
        kicker="Plan de intervención"
        title="Un plan corto, con dos responsables posibles"
        note="PIXEL implementa; el EQUIPO COMERCIAL ejecuta o valida"
      />
      <section className="plan-grid">
        {actionPlan.map((phase, index) => (
          <article key={phase.horizon}>
            <div className="plan-head">
              <span>0{index + 1}</span>
              <div>
                <small>{phase.horizon}</small>
                <h3>{phase.title}</h3>
              </div>
            </div>
            <ul>
              {phase.items.map((item) => (
                <li key={item.text}>
                  <CheckCircle2 />
                  <span>
                    {item.text}
                    <b>{item.owner}</b>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className="success-panel">
        <div>
          <Route />
          <span>Resultado esperado</span>
        </div>
        <h3>
          El próximo corte debe mostrar acciones ejecutadas, variación y una
          decisión.
        </h3>
        <div className="success-grid">
          <p>
            <strong>Pipeline</strong>Etapas con nombres del CRM.
          </p>
          <p>
            <strong>Comparación</strong>Variación contra la quincena anterior.
          </p>
          <p>
            <strong>Responsable</strong>PIXEL o EQUIPO COMERCIAL.
          </p>
          <p>
            <strong>Economía</strong>Gasto y costo por etapa.
          </p>
        </div>
      </section>
    </>
  );
}

function MeetingKit() {
  return (
    <>
      <SectionHeader
        kicker="Arma comercial"
        title="Guía para que Sofía o Juan conduzcan la reunión"
        note="La vista Cliente presenta decisiones; la interna conserva el trabajo operativo"
      />
      <section className="meeting-agenda">
        <article>
          <span>00–03 min</span>
          <h3>Abrir con la salud</h3>
          <p>
            “La cuenta queda amarilla: 19,2% del stock figura como Lead
            Calificado.”
          </p>
        </article>
        <article>
          <span>03–10 min</span>
          <h3>Mostrar pipeline</h3>
          <p>
            Separar conteos CRM, señales conversacionales y datos pendientes.
          </p>
        </article>
        <article>
          <span>10–17 min</span>
          <h3>Explicar acciones</h3>
          <p>Qué hará PIXEL y qué necesita del equipo comercial.</p>
        </article>
        <article>
          <span>17–20 min</span>
          <h3>Cerrar el corte</h3>
          <p>Responsables, fechas y criterio del próximo reporte.</p>
        </article>
      </section>
      <section className="speaker-note">
        <Presentation />
        <div>
          <span>Frase de control</span>
          <blockquote>
            “Este es el corte base. No vamos a llamar conversión al stock: vamos
            a comparar movimientos reales desde la próxima quincena.”
          </blockquote>
        </div>
      </section>
      <Accordion className="client-faq">
        {clientFaq.map((item, index) => (
          <AccordionItem key={item.q} value={`faq-${index}`}>
            <AccordionTrigger>
              <span>
                <b>{String(index + 1).padStart(2, '0')}</b>
                {item.q}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p>{item.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <section className="meeting-close">
        <UserRoundCheck />
        <div>
          <span>Acuerdos requeridos</span>
          <h3>La reunión debe terminar con cuatro definiciones.</h3>
        </div>
        <ol>
          <li>Etapas y criterios CRM.</li>
          <li>Desglose exacto de visitas.</li>
          <li>Sincronización del gasto Meta.</li>
          <li>Responsables del próximo corte.</li>
        </ol>
      </section>
      <MethodNote />
    </>
  );
}

function InternalReport() {
  return (
    <Tabs
      defaultValue="control"
      className="report-tabs report-surface internal-surface"
    >
      <TabsList aria-label="Secciones internas">
        <TabsTrigger value="control">Sala de control</TabsTrigger>
        <TabsTrigger value="qa">QA de conversaciones</TabsTrigger>
        <TabsTrigger value="queues">Acciones y contactos</TabsTrigger>
        <TabsTrigger value="sop">Auditoría SOP</TabsTrigger>
        <TabsTrigger value="playbook">Playbook</TabsTrigger>
      </TabsList>
      <TabsContent value="control">
        <InternalControl />
      </TabsContent>
      <TabsContent value="qa">
        <InternalConversationQA />
      </TabsContent>
      <TabsContent value="queues">
        <InternalQueues />
      </TabsContent>
      <TabsContent value="sop">
        <InternalAudit />
      </TabsContent>
      <TabsContent value="playbook">
        <InternalPlaybook />
      </TabsContent>
    </Tabs>
  );
}

function InternalControl() {
  const risks = [
    {
      level: 'P0',
      value: '209',
      title: 'Sin dueño visible',
      detail: 'Ni la oportunidad ni el contacto muestran responsable.',
      action: 'Corregir asignación automática.',
      owner: 'PIXEL' as const,
    },
    {
      level: 'P0',
      value: '25',
      title: 'Entrantes demorados',
      detail: 'Más de 30 minutos sin respuesta posterior.',
      action: 'Responder o reasignar hoy.',
      owner: 'EQUIPO COMERCIAL' as const,
    },
    {
      level: 'P0',
      value: '20',
      title: 'Sin saliente exitoso',
      detail: 'Revisar dato, workflow, webhook o teléfono.',
      action: 'Diagnosticar y reparar flujo.',
      owner: 'PIXEL' as const,
    },
    {
      level: 'P1',
      value: '61',
      title: 'Solo automatización',
      detail: 'Sin mensaje humano en oportunidades tempranas.',
      action: 'Revisar disparador de handoff.',
      owner: 'PIXEL' as const,
    },
    {
      level: 'P1',
      value: '51',
      title: 'Fallos de entrega',
      detail: 'Históricos, distribuidos en todas las etapas.',
      action: 'Clasificar causa y reintentar.',
      owner: 'PIXEL' as const,
    },
    {
      level: 'P2',
      value: '44/75',
      title: 'Calificación dudosa',
      detail: 'Sin variable comercial detectable en el texto.',
      action: 'Auditar criterio de etapa.',
      owner: 'PIXEL' as const,
    },
  ];
  return (
    <>
      <section className="internal-banner">
        <div>
          <ShieldCheck />
          <span>Uso interno · revisión quincenal</span>
        </div>
        <p>
          Cada riesgo muestra disparador, acción y responsable. La comparación
          se completará cuando exista un segundo corte.
        </p>
      </section>
      <SectionHeader
        kicker="Sala de control"
        title="Riesgos que deben terminar en una acción"
        note="La referencia anterior queda visible aunque aún no haya histórico"
      />
      <section className="risk-grid">
        {risks.map((risk) => (
          <RiskCard key={risk.title} {...risk} />
        ))}
      </section>
      <section className="visual-grid age-section">
        <article className="chart-card span-2">
          <SectionHeader
            kicker="Backlog por antigüedad"
            title="Cuánto tiempo llevan sin resolverse"
            note="Días desde creación, no tiempo desde el último mensaje"
          />
          <AgeChart />
        </article>
        <article className="insight-card alert">
          <span className="insight-number">192</span>
          <h3>superan 30 días desde su creación</h3>
          <p>Es una cola de saneamiento, no una señal de conversión.</p>
          <div className="insight-action">
            <Clock3 /> EQUIPO COMERCIAL: recuperar o cerrar con motivo. PIXEL:
            evitar que vuelva a acumularse.
          </div>
        </article>
      </section>
      <section className="age-actions">
        <div>
          <strong>0–7 días</strong>
          <span>Seguimiento normal del equipo comercial.</span>
        </div>
        <div>
          <strong>8–30 días</strong>
          <span>Priorizar por etapa, señal y próximo paso.</span>
        </div>
        <div>
          <strong>+30 días</strong>
          <span>Campaña de recuperación o cierre con motivo.</span>
        </div>
      </section>
    </>
  );
}

function RiskCard({
  level,
  value,
  title,
  detail,
  action,
  owner,
}: {
  level: string;
  value: string;
  title: string;
  detail: string;
  action: string;
  owner: 'PIXEL' | 'EQUIPO COMERCIAL';
}) {
  return (
    <article className={`risk-card ${level.toLowerCase()}`}>
      <div>
        <Badge variant={level === 'P0' ? 'destructive' : 'outline'}>
          {level}
        </Badge>
        <span className="trend pending">Sin corte anterior</span>
      </div>
      <strong>{value}</strong>
      <h3>{title}</h3>
      <p>{detail}</p>
      <div className="risk-action">
        <span>Acción</span>
        <b>{action}</b>
        <em>{owner}</em>
      </div>
    </article>
  );
}

function AgeChart() {
  const max = Math.max(...ageBuckets.map((item) => item.value));
  return (
    <div className="chart-wrap">
      <svg
        className="age-chart"
        viewBox="0 0 720 300"
        aria-labelledby="age-title age-desc"
      >
        <title id="age-title">Backlog por días desde creación</title>
        <desc id="age-desc">
          27 oportunidades tienen hasta un día, 26 entre dos y siete días, 124
          entre ocho y treinta días y 192 más de treinta días.
        </desc>
        <line x1="70" y1="240" x2="680" y2="240" className="axis" />
        {ageBuckets.map((item, index) => {
          const height = (item.value / max) * 180;
          const x = 100 + index * 145;
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={240 - height}
                width="88"
                height={height}
                rx="8"
                className={`age-bar age-${index}`}
              />
              <text
                x={x + 44}
                y={225 - height}
                textAnchor="middle"
                className="age-value"
              >
                {item.value}
              </text>
              <text
                x={x + 44}
                y="268"
                textAnchor="middle"
                className="age-label"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-caption">
        <EvidenceTag>Fecha de creación</EvidenceTag>
        <span>369 oportunidades en Nuevo Lead o Lead Calificado.</span>
      </div>
    </div>
  );
}

function InternalConversationQA() {
  const qa = [
    {
      number: '01',
      title: 'Apertura',
      trigger: 'Primer mensaje mayor a 240 caracteres.',
      action: 'Crear versión breve y prueba A/B.',
      owner: 'PIXEL',
      check: 'Respuesta útil por versión.',
    },
    {
      number: '02',
      title: 'Detección',
      trigger: 'La conversación menciona una variable que no llega a un campo.',
      action: 'Ajustar prompt y mapeo de campos.',
      owner: 'PIXEL',
      check: 'Campos completos en muestra.',
    },
    {
      number: '03',
      title: 'Calificación',
      trigger: 'Etapa y evidencia conversacional no coinciden.',
      action: 'Revisar regla y muestra de calificados.',
      owner: 'PIXEL',
      check: 'Concordancia etapa–criterio.',
    },
    {
      number: '04',
      title: 'Cierre',
      trigger: 'Hay interés, pero no fecha ni siguiente paso.',
      action: 'Proponer dos opciones concretas.',
      owner: 'EQUIPO COMERCIAL',
      check: 'Visitas solicitadas y agendadas.',
    },
  ];
  return (
    <>
      <SectionHeader
        kicker="QA accionable"
        title="Cada observación debe disparar un cambio verificable"
        note="Se revisa el sistema y el proceso; no se puntúa subjetivamente a una persona"
      />
      <section className="qa-action-grid">
        {qa.map((item) => (
          <article key={item.number}>
            <span>{item.number}</span>
            <h3>{item.title}</h3>
            <dl>
              <dt>Disparador</dt>
              <dd>{item.trigger}</dd>
              <dt>Acción</dt>
              <dd>{item.action}</dd>
              <dt>Responsable</dt>
              <dd>
                <b>{item.owner}</b>
              </dd>
              <dt>Verificación</dt>
              <dd>{item.check}</dd>
            </dl>
          </article>
        ))}
      </section>
      <section className="qa-principle">
        <CircleAlert />
        <div>
          <strong>Regla de uso</strong>
          <p>
            Los indicadores conversacionales seleccionan una muestra. La acción
            se aprueba después de revisar conversaciones reales y se mide en el
            corte siguiente.
          </p>
        </div>
      </section>
      <section className="message-matrix">
        <div>
          <span>Momento</span>
          <span>Objetivo</span>
          <span>Dato a guardar</span>
          <span>Salida correcta</span>
        </div>
        <div>
          <strong>Apertura</strong>
          <p>Obtener una respuesta simple.</p>
          <p>Proyecto + vivir/invertir.</p>
          <p>Continuar o fallback.</p>
        </div>
        <div>
          <strong>Exploración</strong>
          <p>Entender necesidad y viabilidad.</p>
          <p>Tipología, rango, plazo, anticipo.</p>
          <p>Calificar o nutrir.</p>
        </div>
        <div>
          <strong>Resolución</strong>
          <p>Responder dudas y objeciones.</p>
          <p>Interés, freno y alternativa.</p>
          <p>Visita o retomada fechada.</p>
        </div>
        <div>
          <strong>Handoff</strong>
          <p>Transferir sin perder contexto.</p>
          <p>Resumen + dueño + SLA.</p>
          <p>Respuesta humana medible.</p>
        </div>
      </section>
    </>
  );
}

function InternalQueues() {
  const [selectedQueue, setSelectedQueue] = useState<DetailItem | null>(null);
  return (
    <>
      <SectionHeader
        kicker="Centro de acción"
        title="Del hallazgo al contacto dentro de GHL"
        note="Sofía puede abrir el registro exacto, revisar la evidencia y ejecutar la acción"
      />
      <ContactActionTable accountName={capital.name} />
      <SectionHeader
        kicker="Criterios agregados"
        title="Colas que generan la lista de contactos"
        note="El conteo explica la magnitud; el centro de acción identifica a quién revisar"
      />
      <section className="queue-list">
        {reviewQueues.map((item, index) => (
          <article key={item.title}>
            <div className="queue-priority">
              <Badge variant={index < 2 ? 'destructive' : 'outline'}>
                {index < 2 ? 'P0' : index < 4 ? 'P1' : 'P2'}
              </Badge>
              <strong>{item.count}</strong>
            </div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.criteria}</p>
            </div>
            <div>
              <span>Responsable</span>
              <strong>{item.owner}</strong>
            </div>
            <div>
              <span>Acción</span>
              <strong>{item.action}</strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedQueue(item)}
            >
              Ver criterio <ArrowUpRight />
            </Button>
          </article>
        ))}
      </section>
      <section className="sla-panel">
        <div>
          <Gauge />
          <span>Cadencia operativa</span>
        </div>
        <p>
          <strong>09:00</strong> Revisar P0
        </p>
        <p>
          <strong>13:00</strong> Verificar reasignaciones
        </p>
        <p>
          <strong>17:00</strong> Cerrar pendientes y motivos
        </p>
        <p>
          <strong>Quincena</strong> Comparar resultado
        </p>
      </section>
      <OpportunityDialog
        item={selectedQueue}
        onClose={() => setSelectedQueue(null)}
      />
    </>
  );
}

function ContactActionTable({ accountName }: { accountName: string }) {
  const rows = problemContacts.filter(
    (contact) => contact.accountName === accountName,
  );

  return (
    <section
      className="contact-action-panel"
      aria-label="Contactos con acción pendiente"
    >
      <header>
        <div>
          <span>Contactos señalados</span>
          <h3>
            {rows.length
              ? `${rows.length} contactos requieren revisión`
              : 'Listado preparado para datos reales'}
          </h3>
        </div>
        <Badge variant="outline">Cuenta: {accountName}</Badge>
      </header>
      {rows.length ? (
        <div className="contact-table-wrap">
          <table className="contact-table">
            <thead>
              <tr>
                <th>Contacto</th>
                <th>Problema</th>
                <th>Evidencia</th>
                <th>Responsable</th>
                <th>Prioridad</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((contact) => (
                <tr key={`${contact.accountName}-${contact.ghlUrl}`}>
                  <td>
                    <strong>{contact.contactName}</strong>
                  </td>
                  <td>{contact.problem}</td>
                  <td>{contact.evidence}</td>
                  <td>{contact.owner}</td>
                  <td>
                    <Badge
                      variant={
                        contact.priority === 'P0' ? 'destructive' : 'outline'
                      }
                    >
                      {contact.priority}
                    </Badge>
                  </td>
                  <td>
                    <a href={contact.ghlUrl} target="_blank" rel="noreferrer">
                      Abrir en GHL <ArrowUpRight />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="contact-action-empty">
          <Database />
          <div>
            <strong>Faltan los identificadores del contacto</strong>
            <p>
              El corte actual solo contiene totales. Para activar los enlaces
              necesitamos `contact_name`, `contact_id`, `opportunity_id`,
              problema detectado y URL del registro en GHL. No se mostrarán
              contactos inventados.
            </p>
          </div>
          <span>Próximo extracto</span>
        </div>
      )}
    </section>
  );
}

function OpportunityDialog({
  item,
  onClose,
}: {
  item: DetailItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="opportunity-dialog">
        <DialogHeader>
          <DialogTitle>{item?.title}</DialogTitle>
          <DialogDescription>
            {item?.count} oportunidades detectadas en el corte.
          </DialogDescription>
        </DialogHeader>
        <div className="dialog-facts">
          <div>
            <span>Criterio</span>
            <p>{item?.criteria}</p>
          </div>
          <div>
            <span>Acción</span>
            <p>{item?.action}</p>
          </div>
          <div>
            <span>Responsable</span>
            <p>
              <b>{item?.owner}</b>
            </p>
          </div>
        </div>
        <div className="identity-pending">
          <Database />
          <div>
            <strong>Listado nominal pendiente</strong>
            <p>
              El consolidado actual contiene conteos, pero no `opportunity_id`,
              nombre ni URL de GHL. Esos campos se incorporarán al próximo corte
              para abrir la lista real sin inventar registros.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InternalAudit() {
  return (
    <>
      <section className="tool-banner">
        <ListChecks />
        <div>
          <strong>Herramienta de trabajo interna</strong>
          <p>
            Esta sección documenta cómo se midió el corte, qué cambió y qué
            todavía no debe presentarse como resultado.
          </p>
        </div>
      </section>
      <SectionHeader
        kicker="Gobierno del SOP"
        title="Qué puede medirse hoy y qué debemos instrumentar"
        note="Evita presentar precisión que los datos todavía no sostienen"
      />
      <section className="measurement-grid">
        <article>
          <EvidenceTag>Disponible</EvidenceTag>
          <h3>Volumen y stock</h3>
          <p>
            Oportunidades por etapa, fuente, antigüedad y asignación actual.
          </p>
        </article>
        <article>
          <EvidenceTag>Disponible</EvidenceTag>
          <h3>Mensajería</h3>
          <p>Dirección, entrega, tiempos, temas y variables agregadas.</p>
        </article>
        <article>
          <EvidenceTag tone="inferred">Heurístico</EvidenceTag>
          <h3>Intención comercial</h3>
          <p>
            Reglas lingüísticas para priorizar, no para calificar
            automáticamente.
          </p>
        </article>
        <article>
          <EvidenceTag tone="pending">Pendiente</EvidenceTag>
          <h3>Conversión y costos</h3>
          <p>Requieren historial de etapas, cohortes y gasto publicitario.</p>
        </article>
      </section>
      <section className="audit-framework">
        <div className="audit-title">
          <ListChecks />
          <div>
            <span>Minuta quincenal</span>
            <h3>Un entregable que documenta aprendizaje.</h3>
          </div>
        </div>
        <div>
          <strong>Calibración IA</strong>
          <p>Preguntas, respuestas, campos y fallbacks modificados.</p>
        </div>
        <div>
          <strong>Ejecución humana</strong>
          <p>SLA, reasignaciones y correcciones de guion.</p>
        </div>
        <div>
          <strong>Causa comercial</strong>
          <p>Objeciones, descarte y pérdida por etapa.</p>
        </div>
        <div>
          <strong>Decisión</strong>
          <p>Qué se mantiene, qué cambia y qué se probará.</p>
        </div>
      </section>
      <MethodNote />
    </>
  );
}

function InternalPlaybook() {
  return (
    <>
      <section className="tool-banner">
        <Waypoints />
        <div>
          <strong>Herramienta de trabajo interna</strong>
          <p>
            El playbook explica cómo preparar la revisión y cómo traducirla a
            una conversación con el cliente.
          </p>
        </div>
      </section>
      <SectionHeader
        kicker="Playbook Sofía + Juan"
        title="Qué preparar, qué decir y qué evitar"
        note="Consulta rápida antes y durante una reunión"
      />
      <section className="playbook-grid">
        <article>
          <div className="playbook-icon">
            <FileSearch />
          </div>
          <span>Antes de la reunión</span>
          <h3>Preparación de 10 minutos</h3>
          <ol>
            <li>Confirmar período y corte.</li>
            <li>Validar nombres de etapas.</li>
            <li>Elegir dos gráficos.</li>
            <li>Separar dato, hipótesis y pendiente.</li>
          </ol>
        </article>
        <article>
          <div className="playbook-icon">
            <Presentation />
          </div>
          <span>Durante la reunión</span>
          <h3>Conducir hacia decisiones</h3>
          <ol>
            <li>Abrir con la salud.</li>
            <li>Mostrar evidencia y limitación.</li>
            <li>Explicar acción y responsable.</li>
            <li>Cerrar fecha de verificación.</li>
          </ol>
        </article>
        <article>
          <div className="playbook-icon">
            <ShieldCheck />
          </div>
          <span>Control del relato</span>
          <h3>Evitar afirmaciones débiles</h3>
          <ol>
            <li>No llamar conversión al stock.</li>
            <li>No llamar positiva a una mención.</li>
            <li>No comparar fuentes incompatibles.</li>
            <li>No mostrar costos sin gasto.</li>
          </ol>
        </article>
      </section>
      <section className="battlecard">
        <header>
          <div>
            <span>Pregunta del cliente</span>
            <h3>“¿Por qué hay más visitas que las que muestra el análisis?”</h3>
          </div>
          <Badge variant="outline">Respuesta recomendada</Badge>
        </header>
        <div className="battlecard-grid">
          <p>
            <strong>Reconocer</strong>“El conteo anterior medía menciones con
            fecha, no la etapa CRM.”
          </p>
          <p>
            <strong>Corregir</strong>“Ahora separamos conversación y pipeline.”
          </p>
          <p>
            <strong>Mostrar</strong>“Hay 22 oportunidades en visita o una etapa
            posterior.”
          </p>
          <p>
            <strong>Comprometer</strong>“El próximo corte traerá el desglose por
            cada etapa.”
          </p>
        </div>
      </section>
      <section className="internal-close">
        <Waypoints />
        <div>
          <span>La función del reporte</span>
          <h3>
            Convertir datos del CRM en una decisión, una acción y un
            responsable.
          </h3>
        </div>
      </section>
    </>
  );
}

function MethodNote() {
  return (
    <section className="method-note">
      <Database />
      <div>
        <strong>Alcance y confianza</strong>
        <p>
          Se analizaron 391 oportunidades y 7.603 mensajes. Los conteos de etapa
          son stock al corte. Las variables textuales son heurísticas y deben
          validarse con muestra manual. El corte aún no contiene gasto
          publicitario, historial de movimientos ni IDs para listados nominales.
        </p>
      </div>
      <div className="evidence-legend">
        <EvidenceTag>Confirmado</EvidenceTag>
        <EvidenceTag tone="inferred">Inferido</EvidenceTag>
        <EvidenceTag tone="pending">Por instrumentar</EvidenceTag>
      </div>
    </section>
  );
}

function PendingAccountReport({
  account,
  audience,
}: {
  account: Account;
  audience: ReportView;
}) {
  return (
    <>
      <section className="report-ready-banner">
        <div className="empty-icon">
          {account.status === 'Bloqueada' ? <LockKeyhole /> : <Database />}
        </div>
        <div>
          <div className="eyebrow">Plantilla habilitada</div>
          <h2>
            {audience === 'client'
              ? 'Vista Cliente lista para el primer corte'
              : 'Vista Interno lista para operar'}
          </h2>
          <p>
            {account.status === 'Bloqueada'
              ? `${account.note}. El reporte ya está creado, pero no podrá cargar métricas hasta resolver esta dependencia.`
              : 'La estructura ya está disponible para esta cuenta. Las métricas permanecerán vacías hasta recibir el primer extracto quincenal.'}
          </p>
        </div>
        <EvidenceTag tone="pending">Sin datos del corte</EvidenceTag>
      </section>
      {audience === 'internal' && (
        <ContactActionTable accountName={account.name} />
      )}
      <section className="setup-grid">
        <article>
          <span>01</span>
          <strong>Acceso</strong>
          <p>Confirmar subcuenta GHL y pipeline correcto.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Datos</strong>
          <p>Cargar etapas, mensajes, fuentes, etiquetas e inversión.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Acción</strong>
          <p>Incluir IDs y URLs para abrir cada contacto señalado.</p>
        </article>
        <article>
          <span>04</span>
          <strong>Corte</strong>
          <p>Publicar la quincena y preparar el agregado mensual.</p>
        </article>
      </section>
    </>
  );
}

function ExcludedAccount({ account }: { account: Account }) {
  return (
    <section className="empty-state excluded-state">
      <div className="empty-icon">
        <LockKeyhole />
      </div>
      <div>
        <div className="eyebrow">Fuera de alcance</div>
        <h2>Esta cuenta no recibirá el reporte.</h2>
        <p>
          {account.name} fue excluida de esta implementación. No se habilitarán
          cortes, acciones ni enlaces a contactos.
        </p>
      </div>
      <div className="checklist">
        <p>
          <i>1</i>Sin plantilla activa
        </p>
        <p>
          <i>2</i>Sin extracción quincenal
        </p>
        <p>
          <i>3</i>Sin acceso para cliente
        </p>
      </div>
    </section>
  );
}

function AccessModel() {
  return (
    <section className="access-model">
      <div>
        <div className="eyebrow">Modelo de uso</div>
        <h2>Una fuente, dos cadencias.</h2>
        <p>
          El equipo opera cada quincena. El PM consolida el mes y comparte solo
          la vista Cliente.
        </p>
      </div>
      <div className="access-roles">
        <article>
          <span>01</span>
          <strong>CRM + Campañas</strong>
          <p>Vista Interno · revisión quincenal.</p>
        </article>
        <article>
          <span>02</span>
          <strong>PM</strong>
          <p>Vista Cliente · consolidado mensual.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Cliente</strong>
          <p>Solo su cuenta y métricas aprobadas.</p>
        </article>
      </div>
    </section>
  );
}

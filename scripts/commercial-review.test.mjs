import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewCommercialCase,
  summarizeCommercialCases,
} from './commercial-review.mjs';
const cutoff = Date.parse('2026-10-06T23:59:59-04:00');
const base = {
  opportunity: {
    id: 'o',
    contactId: 'c',
    createdAt: '2026-10-01T04:00:00Z',
    status: 'open',
  },
  stageName: 'Nuevo Lead',
  locationId: 'l',
  cutoff,
  coverage: { messages: true, tasks: true, appointments: true },
  messages: [],
};
const msg = (body, direction = 'inbound', status = 'delivered', day = 2) => ({
  id: `${body}-${day}`,
  body,
  direction,
  status,
  messageType: 'TYPE_WHATSAPP',
  dateAdded: `2026-10-0${day}T10:00:00Z`,
});
test('prefilled advert greeting is not commercial interest', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [msg('Hola! Quisiera más información sobre El Salvaje.')],
    }).category,
    null,
  ));
test('commercial dialogue in initial stage is a candidate, not confirmed bot failure', () => {
  const c = reviewCommercialCase({
    ...base,
    messages: [
      msg('Busco dos ambientes para invertir, qué financiación tienen?'),
    ],
  });
  assert.equal(c.category, 'qualification_mismatch');
  assert.match(c.contextStatus, /Candidato/);
  assert.equal(c.meaningfulInbound, 1);
});
test('explicit visit outranks a delivery failure', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [
        msg('Quiero coordinar una visita'),
        msg('hola', 'outbound', 'failed', 3),
      ],
    }).category,
    'visit_without_followup',
  ));
test('día/hora alone does not become a visit', () =>
  assert.equal(
    reviewCommercialCase({ ...base, messages: [msg('A qué hora cierran?')] })
      .category,
    null,
  ));
test('negative interest never becomes recoverable', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [
        msg('Quiero conocer la obra'),
        msg('No me interesa, no me escribas', 'inbound', 'delivered', 3),
      ],
    }).category,
    'explicit_rejection',
  ));
test('a future assigned task prevents missing-step claim', () => {
  const c = reviewCommercialCase({
    ...base,
    messages: [msg('Quiero coordinar una visita')],
    tasks: [
      {
        completed: false,
        dueDate: '2026-10-08T14:00:00Z',
        assignedTo: 'seller',
      },
    ],
  });
  assert.equal(c.category, null);
  assert.equal(c.nextStepVisible, true);
});
test('unknown task access is visibly partial', () =>
  assert.match(
    reviewCommercialCase({
      ...base,
      messages: [msg('Qué financiación tienen?')],
      coverage: { messages: true, tasks: false, appointments: true },
    }).contextStatus,
    /parcial/,
  ));
test('sent is not delivered; three sends do not prove attempts delivered', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [2, 3, 4].map((d) => msg('hola', 'outbound', 'sent', d)),
    }).category,
    null,
  ));
test('no-response is distinct from active interest', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [2, 3, 4].map((d) => msg('hola', 'outbound', 'delivered', d)),
    }).category,
    'no_response_after_attempts',
  ));
test('incomplete history cannot establish no-response', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [2, 3, 4].map((d) => msg('hola', 'outbound', 'delivered', d)),
      coverage: { messages: false, tasks: true, appointments: true },
    }).category,
    null,
  ));
test('terminal leads are not placed in recovery queue', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      opportunity: { ...base.opportunity, status: 'lost' },
      messages: [msg('Qué financiación tienen?')],
    }).category,
    null,
  ));
test('post-cutoff signals do not affect report', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [msg('Quiero coordinar una visita', 'inbound', 'delivered', 7)],
    }).category,
    null,
  ));
test('same contact appears only once in queue; all opportunities counted', () => {
  const c = reviewCommercialCase({
    ...base,
    messages: [msg('Quiero coordinar una visita')],
  });
  const s = summarizeCommercialCases([c, { ...c, opportunityId: 'o2' }]);
  assert.equal(s.actions.length, 1);
  assert.equal(s.commercialReview.reviewedOpportunities, 2);
  assert.equal(s.commercialReview.reviewedContacts, 1);
});
test('no age-only stale candidates', () =>
  assert.equal(reviewCommercialCase({ ...base, messages: [] }).category, null));
test('overdue and completed tasks are not upcoming steps', () =>
  assert.equal(
    reviewCommercialCase({
      ...base,
      messages: [msg('Qué financiación tienen?')],
      tasks: [
        { completed: true, dueDate: '2026-10-08T14:00:00Z' },
        { completed: false, dueDate: '2026-10-03T14:00:00Z' },
      ],
    }).nextStepVisible,
    false,
  ));

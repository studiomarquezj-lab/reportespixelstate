import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync(
  new URL('../app/data/ghl-report.json', import.meta.url),
  'utf8',
);
const report = JSON.parse(raw);
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('published snapshot excludes credentials and raw personal conversation fields', () => {
  assert.equal(
    /pit-|"body"\s*:|"phone"\s*:|"email"\s*:|"token"\s*:/.test(raw),
    false,
  );
  assert.equal(
    report.accounts.some((a) => a.name.includes('SUMA')),
    false,
  );
});

test('commercial queues are complete, unique and carry actionable evidence', () => {
  for (const account of report.accounts) {
    assert.equal(
      account.actions.length,
      new Set(account.actions.map((c) => c.ghlUrl)).size,
    );
    assert.equal(
      account.commercialReview.reviewedOpportunities,
      account.metrics.opportunities,
    );
    for (const candidate of account.actions) {
      assert.match(candidate.contactName, /^Contacto …/);
      assert.equal(new URL(candidate.ghlUrl).hostname, 'app.gohighlevel.com');
      assert.ok(
        candidate.action && candidate.contextStatus && candidate.acceptance,
      );
    }
    assert.equal(
      account.actionBreakdown.reduce((n, g) => n + g.count, 0),
      account.actions.length,
    );
  }
});

test('snapshot declares time zone and bounded cohort methodology', () => {
  assert.match(report.cutoffDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(report.timeZone, 'America/Caracas');
  assert.match(report.methodology, /cohorte/i);
  assert.match(report.methodology, /no demuestran error del bot/i);
});

test('contact table aligns priority and action with their own columns', () => {
  const table = page.slice(
    page.indexOf('function ContactActionTable'),
    page.indexOf('function OpportunityDialog'),
  );
  const row = table.slice(
    table.indexOf('<tr key='),
    table.indexOf('</tr>', table.indexOf('<tr key=')),
  );
  const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  assert.equal(cells.length, 6);
  assert.match(cells[4], /contact.priority/);
  assert.doesNotMatch(cells[4], /contact.action/);
  assert.match(cells[5], /contact.action/);
  assert.match(cells[5], /contact.acceptance/);
  assert.match(cells[5], /contact.ghlUrl/);
});

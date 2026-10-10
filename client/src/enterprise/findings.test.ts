import test from "node:test";
import assert from "node:assert/strict";
import { filterFindings, paginateFindings } from "./findings.ts";
import { seedIncidents } from "./domain.ts";
test("triage filters combine status, severity and normalized search", () => {
  const records = seedIncidents();
  const selected = records[0];
  assert.deepEqual(
    filterFindings(
      records,
      `  ${selected.id.toLowerCase()}  `,
      selected.severity,
      selected.status,
    ),
    [selected],
  );
  assert.equal(filterFindings(records, selected.id, "Safe", "All").length, 0);
  assert.equal(
    filterFindings(records, "", "All", "All").length,
    records.length,
  );
});
test("findings pagination bounds 100 records and clamps after filtering", () => {
  const records = Array.from({ length: 100 }, (_, i) => i);
  const last = paginateFindings(records, 9);
  assert.deepEqual(last.items, [96, 97, 98, 99]);
  assert.equal(last.end, 100);
  assert.equal(paginateFindings(records.slice(0, 2), 9).page, 1);
  assert.deepEqual(paginateFindings([], 9), {
    items: [],
    page: 1,
    pages: 1,
    start: 0,
    end: 0,
  });
});

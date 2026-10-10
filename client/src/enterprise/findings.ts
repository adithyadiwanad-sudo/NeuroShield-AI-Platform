import type { Incident } from "./domain";
export function filterFindings(
  incidents: Incident[],
  query: string,
  severity: string,
  status: string,
) {
  const term = query.trim().toLowerCase();
  return incidents.filter(
    (i) =>
      `${i.title} ${i.id} ${i.source}`.toLowerCase().includes(term) &&
      (severity === "All" || i.severity === severity) &&
      (status === "All" || i.status === status),
  );
}
export function paginateFindings<T>(
  items: T[],
  requestedPage: number,
  size = 12,
) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, Math.max(1, requestedPage));
  const offset = (page - 1) * size;
  return {
    items: items.slice(offset, offset + size),
    page,
    pages,
    start: items.length ? offset + 1 : 0,
    end: Math.min(offset + size, items.length),
  };
}

/** Estate is “fresh” only when there is no operational data yet — not a filtered empty list. */
export function isFreshInstall(counts: {
  assets: number;
  employees: number;
  locations: number;
}): boolean {
  return counts.assets === 0 && counts.employees === 0 && counts.locations === 0;
}

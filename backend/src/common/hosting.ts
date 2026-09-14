/** Render/Postgres region. Singapore is the current demo host; India is available on request. */
export function hostingRegion(): string {
  return (process.env.HOSTING_REGION || 'singapore').trim().toLowerCase();
}

export function residencyNote(region = hostingRegion()): string {
  if (region === 'mumbai' || region === 'hyderabad' || region === 'india' || region === 'oregon') {
    if (region === 'india' || region === 'mumbai' || region === 'hyderabad') {
      return 'Hosted in India.';
    }
  }
  if (region === 'mumbai' || region === 'hyderabad') return 'Hosted in India.';
  return 'Singapore — demo only. India region (Mumbai/Hyderabad) on request.';
}

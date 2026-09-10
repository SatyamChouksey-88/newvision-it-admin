import { describe, expect, it } from '@jest/globals';
import { parseChatLinks } from './chat-links';

describe('parseChatLinks', () => {
  it('extracts ticket numbers and show URLs', () => {
    const refs = parseChatLinks('See TCK-000123 and /tickets/show/45');
    expect(refs.some((r) => r.kind === 'ticket' && r.id === 123)).toBe(true);
    expect(refs.some((r) => r.kind === 'ticket' && r.id === 45)).toBe(true);
  });

  it('extracts asset and employee codes', () => {
    const refs = parseChatLinks('Assign AST-BHO-0001 to EMP-PUN-0042');
    expect(refs.map((r) => r.kind).sort()).toEqual(['asset', 'employee']);
  });
});

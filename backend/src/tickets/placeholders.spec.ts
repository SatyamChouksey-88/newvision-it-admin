import { describe, expect, it } from '@jest/globals';
import { fillTicketPlaceholders } from './tickets.service';

describe('fillTicketPlaceholders', () => {
  it('replaces employee and asset tokens', () => {
    expect(
      fillTicketPlaceholders('Install Zoom on {{asset}} for {{employee}}', {
        employee: 'Asha Apte · EMP-00001',
        asset: 'AST-PUN-LAP-0001',
      }),
    ).toBe('Install Zoom on AST-PUN-LAP-0001 for Asha Apte · EMP-00001');
  });

  it('leaves empty when a var is missing', () => {
    expect(fillTicketPlaceholders('Hi {{employee}} / {{asset}}', {})).toBe('Hi  / ');
  });
});

import { describe, expect, it } from '@jest/globals';
import { reconcileSets } from './diff';

describe('reconciliation set-diff', () => {
  it('splits items into matched / in-file-only / in-system-only (case-insensitive)', () => {
    const diff = reconcileSets(
      [
        { key: 'EMP-1', label: 'Asha' },
        { key: 'emp-2', label: 'Bala' },
        { key: 'EMP-9', label: 'Only in HR' },
      ],
      [
        { key: 'EMP-1', label: 'Asha Apte' },
        { key: 'EMP-3', label: 'Only in AMS' },
      ],
    );
    expect(diff.matched.map((i) => i.key)).toEqual(['emp-1']);
    expect(diff.inFileOnly.map((i) => i.key)).toEqual(['emp-2', 'emp-9']);
    expect(diff.inSystemOnly.map((i) => i.key)).toEqual(['emp-3']);
  });

  it('ignores blank keys and de-duplicates within each side', () => {
    const diff = reconcileSets(
      [
        { key: '', label: 'blank' },
        { key: 'X', label: 'first' },
        { key: 'x', label: 'dup' },
      ],
      [{ key: 'X', label: 'sys' }],
    );
    expect(diff.matched).toHaveLength(1);
    expect(diff.inFileOnly).toHaveLength(0);
    expect(diff.inSystemOnly).toHaveLength(0);
  });
});

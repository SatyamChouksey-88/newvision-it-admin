import { useEffect, useMemo, useRef } from 'react';

/**
 * Returns a stable debounced wrapper around `fn`. The latest `fn` is always invoked, and any
 * pending call is cancelled on unmount so we never set state on an unmounted component.
 */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delayMs = 250) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useMemo(() => {
    const debounced = (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delayMs);
    };
    debounced.cancel = () => {
      if (timer.current) clearTimeout(timer.current);
    };
    return debounced;
  }, [delayMs]);
}

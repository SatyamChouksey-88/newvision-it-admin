import { useEffect, useState } from 'react';

const QUERY = '(max-width: 639px)';

/** Second breakpoint: Employee + lookup on a 390px phone. Not an admin rewrite. */
export function useNvPhone() {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setPhone(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

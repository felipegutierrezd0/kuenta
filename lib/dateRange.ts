import { endOfMonth, format, startOfMonth } from 'date-fns';

export function monthRange(reference: Date) {
  return {
    start: format(startOfMonth(reference), 'yyyy-MM-dd'),
    end: format(endOfMonth(reference), 'yyyy-MM-dd'),
  };
}

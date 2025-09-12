/* eslint-disable @typescript-eslint/no-restricted-imports */
import {
  format as dateFnsFormat,
  formatDistance as dateFnsFormatDistance,
  type DateArg,
  type FormatOptions,
  type FormatDistanceOptions,
} from 'date-fns';

export {
  addMilliseconds,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  isSameYear,
} from 'date-fns';
export { enUS } from 'date-fns/locale';

export const format = (
  date: DateArg<Date>,
  format: string,
  options?: Omit<FormatOptions, 'locale'>,
) => {
  return dateFnsFormat(date, format, {
    ...options,
  });
};

export const formatDistance = (
  laterDate: DateArg<Date>,
  earlierDate: DateArg<Date>,
  options?: Omit<FormatDistanceOptions, 'locale'>,
) => {
  return dateFnsFormatDistance(laterDate, earlierDate, {
    ...options,
  });
};

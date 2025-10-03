/* eslint-disable @typescript-eslint/no-restricted-imports */
import {
  format as dateFnsFormat,
  formatDistanceStrict as dateFnsFormatDistanceStrict,
  formatDuration as dateFnsFormatDuration,
  type DateArg,
  type FormatOptions,
  type FormatDistanceStrictOptions,
  type FormatDurationOptions,
  type Duration,
} from 'date-fns';

export {
  addMilliseconds,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  isSameYear,
  intervalToDuration,
  differenceInSeconds,
  isValid,
  max,
  min,
} from 'date-fns';

import { enUS, th, id } from 'date-fns/locale';
import { siteLocale } from './components/Locale/locale.svelte';

export const getDateFnsLocale = () => {
  const locale = siteLocale.l;
  switch (locale) {
    case 'th':
      return th;
    case 'id':
      return id;
    case 'en':
      return enUS;
  }
};

export const format = (
  date: DateArg<Date>,
  format: string,
  options?: Omit<FormatOptions, 'locale'>,
) => {
  return dateFnsFormat(date, format, {
    ...options,
    locale: getDateFnsLocale(),
  });
};

export const formatDistanceStrict = (
  laterDate: DateArg<Date>,
  earlierDate: DateArg<Date>,
  options?: Omit<FormatDistanceStrictOptions, 'locale'>,
) => {
  return dateFnsFormatDistanceStrict(laterDate, earlierDate, {
    ...options,
    locale: getDateFnsLocale(),
  });
};

export const formatDuration = (
  duration: Duration,
  options?: Omit<FormatDurationOptions, 'locale'>,
) => {
  return dateFnsFormatDuration(duration, {
    ...options,
    locale: getDateFnsLocale(),
  });
};

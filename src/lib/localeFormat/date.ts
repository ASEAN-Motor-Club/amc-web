import { m } from '$lib/paraglide/messages';
import { format as dateFnsFormat, type DateArg, type FormatOptions, type Locale } from 'date-fns';

const getLocaleConfig = (): Pick<Locale, 'localize' | 'options' | 'formatLong'> => {
  return {
    localize: {
      month: (n, options) => {
        switch (options?.width) {
          case 'narrow':
            return m[`config.months.narrow.${n}`]();
          case 'abbreviated':
            return m[`config.months.abbreviated.${n}`]();
          case 'wide':
          default:
            return m[`config.months.wide.${n}`]();
        }
      },
      day: (n, options) => {
        switch (options?.width) {
          case 'narrow':
            return m[`config.days.narrow.${n}`]();
          case 'short':
            return m[`config.days.short.${n}`]();
          case 'abbreviated':
            return m[`config.days.abbreviated.${n}`]();
          case 'wide':
          default:
            return m[`config.days.wide.${n}`]();
        }
      },
      ordinalNumber: () => '',
      era: () => '',
      dayPeriod: () => '',
      quarter: () => '',
    },
    options: {
      weekStartsOn: 0,
      firstWeekContainsDate: 1,
    },
    formatLong: {
      date: () => m['config.dateFormat'](),
      time: () => m['config.timeFormat'](),
      dateTime: () => m['config.dateTimeFormat'](),
    },
  };
};

export const format = (
  date: DateArg<Date>,
  format: string,
  options?: Omit<FormatOptions, 'locale'>,
) => {
  return dateFnsFormat(date, format, {
    ...options,
    locale: getLocaleConfig(),
  });
};

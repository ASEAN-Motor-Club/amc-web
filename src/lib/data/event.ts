export const enum EventType {
  Championship = 'championship',
  Warmup = 'warmup',
}

type EventData = {
  id: string;
  date: string;
  title: string;
  official: boolean;
  eventType: EventType;
  link: string;
  subEvent: {
    title: string;
    track?: string;
  }[];
};

const events: EventData[] = [
  {
    id: '1',
    date: '2025-07-19T20:00:00+07:00',
    title: 'Pre-Season 2 Aewol Rally',
    official: true,
    eventType: EventType.Warmup,
    link: 'https://discord.com/events/1341775494026231859/1395711626119872532',
    subEvent: [
      {
        title: 'Any car (up to 240HP)',
        track: 'https://www.aseanmotorclub.com/routes/1749642196.090451.json',
      },
      {
        title: 'Semi truck',
        track: 'https://www.aseanmotorclub.com/routes/1749642196.090451.json',
      },
    ],
  },
];

type EventMap = Map<number, Map<number, Map<number, EventData[]>>>;

const mappedEvents: EventMap = new Map();

events.forEach((event) => {
  const date = new Date(event.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are zero-indexed
  const day = date.getDate();

  if (!mappedEvents.has(year)) {
    mappedEvents.set(year, new Map());
  }

  // NOTE: The yearMap is guaranteed to exist here due to the previous check
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const yearMap = mappedEvents.get(year)!;

  if (!yearMap.has(month)) {
    yearMap.set(month, new Map());
  }

  // NOTE: The monthMap is guaranteed to exist here due to the previous check
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const monthMap = yearMap.get(month)!;

  if (!monthMap.has(day)) {
    monthMap.set(day, []);
  }

  // NOTE: The dayMap is guaranteed to exist here due to the previous check
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  monthMap.get(day)!.push(event);
});

export { events, mappedEvents };

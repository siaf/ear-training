// Visitors who press "keep training" in one of the free tools on fifths.io land straight in a
// lesson. Its intro is written for newcomers ("An interval is the distance between two
// notes"), which reads as a step backwards to someone who just did ten interval questions:
// on 2026-11-20 one such visitor left after 6 seconds. So the first intro says where they
// came from and what the app adds to the tool they were using.

export interface ArrivalNote {
  title: string;
  body: string;
}

const FREE = 'Free, no signup to start.';

const TOOL_NOTES: Record<string, ArrivalNote> = {
  'interval-ear-trainer': {
    title: 'Picking up from the Interval Ear Trainer.',
    body: `Same drill, one difference: Fifths remembers every interval you miss and brings it back until it sticks. ${FREE}`,
  },
  'vocal-range-test': {
    title: 'Picking up from the Vocal Range Test.',
    body: `Next step: Fifths plays a note and listens while you sing it back. ${FREE}`,
  },
  'circle-of-fifths': {
    title: 'Picking up from the Circle of Fifths.',
    body: `Now the listening side: short lessons that remember what you miss and bring it back. ${FREE}`,
  },
};

const ANY_TOOL: ArrivalNote = {
  title: 'Picking up from our free tool.',
  body: `Fifths turns it into short lessons that remember what you miss and bring it back. ${FREE}`,
};

/** The note for a visit that came from a fifths.io tool (utm_medium=tool), or null. */
export function toolArrival(search: string): ArrivalNote | null {
  const q = new URLSearchParams(search);
  if (q.get('utm_source') !== 'fifths.io' || q.get('utm_medium') !== 'tool') return null;
  return TOOL_NOTES[q.get('utm_campaign') ?? ''] ?? ANY_TOOL;
}

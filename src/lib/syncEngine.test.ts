import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileSnapshot } from './syncEngine';

type Cloud = { profile?: Record<string, unknown>; sessions?: Record<string, unknown>[] };

const USER = { id: 'user-1', email: 'learner@example.com' };

const LOCAL_PROFILE: ProfileSnapshot = {
  email: null,
  synth: 'piano',
  playbackSpeed: 1,
  drone: false,
  autoPlay: true,
  voiceRange: null,
  singDifficulty: null,
  completedLevels: ['found_higher_lower'],
  hasEverPracticed: true,
  mastery: {},
};

function localSession(id: string) {
  return {
    id,
    endedAt: 2000,
    startedAt: 1000,
    levelId: 'found_higher_lower',
    segmentId: 'foundations',
    totalQuestions: 8,
    correct: 7,
    accuracy: 87.5,
    avgResponseMs: 900,
    fastestMs: 400,
    items: {},
    confusions: [],
    unlocked: true,
  };
}

function fakeSupabase(cloud: Cloud) {
  const upserts: { table: string; rows: unknown }[] = [];
  const deletes: string[] = [];
  const updates: { table: string; values: unknown }[] = [];
  const client = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: { user: USER } } }),
    },
    from(table: string) {
      return {
        select: () => ({
          eq: () =>
            table === 'profiles'
              ? { maybeSingle: async () => ({ data: cloud.profile ?? null, error: null }) }
              : Promise.resolve({ data: cloud.sessions ?? [], error: null }),
        }),
        upsert: async (rows: unknown) => {
          upserts.push({ table, rows });
          return { error: null };
        },
        delete: () => ({
          eq: async () => {
            deletes.push(table);
            return { error: null };
          },
        }),
        update: (values: unknown) => ({
          eq: async () => {
            updates.push({ table, values });
            return { error: null };
          },
        }),
      };
    },
  };
  return { client, upserts, deletes, updates };
}

async function startSignedIn(cloud: Cloud, profile: ProfileSnapshot = LOCAL_PROFILE) {
  const fake = fakeSupabase(cloud);
  vi.doMock('./supabase', () => ({ supabase: fake.client, supabaseEnabled: () => true }));
  const engine = await import('./syncEngine');
  let local = profile;
  engine.startSyncEngine({
    getProfile: () => local,
    applyProfile: (p) => {
      local = { ...local, completedLevels: Array.from(new Set([...local.completedLevels, ...p.completedLevels])) };
    },
  });
  await vi.waitFor(() => expect(engine.getSyncState()).toBe('idle'));
  return { ...fake, engine };
}

const pushedTo = (upserts: { table: string; rows: unknown }[], table: string) =>
  upserts.filter((u) => u.table === table).map((u) => u.rows);

describe('syncEngine', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    // Neither mock offers isPro: a free account has to back up like any other.
    vi.doMock('./billing', () => ({ identifyUser: async () => {}, logOutBilling: async () => {} }));
    vi.doMock('./attribution', () => ({ trackAccountSignup: () => {} }));
    vi.doMock('./posthog', () => ({ phCapture: () => {} }));
    vi.doMock('./reportError', () => ({ reportError: () => {} }));
  });

  it('never reports signed out for someone with a saved session', async () => {
    const fake = fakeSupabase({});
    vi.doMock('./supabase', () => ({ supabase: fake.client, supabaseEnabled: () => true }));
    const engine = await import('./syncEngine');
    const states: string[] = [];
    engine.subscribeSyncState((s) => states.push(s));

    engine.startSyncEngine({ getProfile: () => LOCAL_PROFILE, applyProfile: () => {} });
    await vi.waitFor(() => expect(engine.getSyncState()).toBe('idle'));

    expect(states).not.toContain('signed_out');
  });

  it('reports signed out once the check finds no session', async () => {
    const fake = fakeSupabase({});
    fake.client.auth.getSession = (async () => ({ data: { session: null } })) as never;
    vi.doMock('./supabase', () => ({ supabase: fake.client, supabaseEnabled: () => true }));
    const engine = await import('./syncEngine');

    engine.startSyncEngine({ getProfile: () => LOCAL_PROFILE, applyProfile: () => {} });

    await vi.waitFor(() => expect(engine.getSyncState()).toBe('signed_out'));
  });

  it('backs up a free account on sign-in', async () => {
    localStorage.setItem('fifths.sessions.v1', JSON.stringify([localSession('s_1')]));
    const { upserts } = await startSignedIn({});

    const [profile] = pushedTo(upserts, 'profiles') as { completed_levels: string[] }[];
    expect(profile.completed_levels).toEqual(['found_higher_lower']);
    const [sessions] = pushedTo(upserts, 'sessions') as { id: string }[][];
    expect(sessions.map((s) => s.id)).toEqual(['s_1']);
  });

  it('pulls before pushing, so a new device keeps what the cloud already has', async () => {
    const { upserts } = await startSignedIn(
      { profile: { ...LOCAL_PROFILE, completed_levels: ['found_beating'], playback_speed: 1, auto_play: true } },
      { ...LOCAL_PROFILE, completedLevels: [] },
    );

    const [profile] = pushedTo(upserts, 'profiles') as { completed_levels: string[] }[];
    expect(profile.completed_levels).toEqual(['found_beating']);
  });

  it('uploads each session once', async () => {
    localStorage.setItem('fifths.sessions.v1', JSON.stringify([localSession('s_1')]));
    const { upserts, engine } = await startSignedIn({});

    const store = await import('./sessionStore');
    store.replaceAllSessions([...store.getAllSessions(), localSession('s_2')]);
    await engine.flushNow();

    const uploads = pushedTo(upserts, 'sessions') as { id: string }[][];
    expect(uploads.map((batch) => batch.map((s) => s.id))).toEqual([['s_1'], ['s_2']]);
  });

  it('does not re-upload sessions it pulled from the cloud', async () => {
    const cloudRow = {
      id: 's_cloud',
      ended_at: new Date(2000).toISOString(),
      started_at: new Date(1000).toISOString(),
      level_id: 'found_higher_lower',
      segment_id: 'foundations',
      total_questions: 8,
      correct: 7,
      accuracy: 87.5,
      avg_response_ms: 900,
      fastest_ms: 400,
      items: {},
      confusions: [],
      unlocked: true,
    };
    const { upserts } = await startSignedIn({ sessions: [cloudRow] });

    expect(pushedTo(upserts, 'sessions')).toEqual([]);
  });

  it('clears the cloud copy when progress is reset', async () => {
    const { engine, deletes, updates } = await startSignedIn({});

    await engine.resetCloudProgress();

    expect(deletes).toEqual(['sessions']);
    expect(updates).toEqual([{ table: 'profiles', values: { completed_levels: [], mastery: {} } }]);
  });
});

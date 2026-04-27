import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from './supabase';
import {
  getAllSessions,
  PersistedSession,
  replaceAllSessions,
  subscribeSessions,
} from './sessionStore';
import { identifyUser, isPro, logOutBilling } from './billing';

const FLUSH_DEBOUNCE_MS = 2000;

export type ProfileSnapshot = {
  email: string | null;
  synth: string;
  playbackSpeed: number;
  drone: boolean;
  autoPlay: boolean;
  voiceRange: unknown | null;
  singDifficulty: string | null;
  completedLevels: string[];
  hasEverPracticed: boolean;
};

type GetProfile = () => ProfileSnapshot;
type ApplyProfile = (p: ProfileSnapshot) => void;

let getProfile: GetProfile | null = null;
let applyProfile: ApplyProfile | null = null;
let currentUser: User | null = null;
let pendingFlushId: ReturnType<typeof setTimeout> | null = null;
let unsubscribeSessions: (() => void) | null = null;
let unsubscribeAuth: (() => void) | null = null;
let started = false;

export type SyncState = 'disabled' | 'signed_out' | 'syncing' | 'idle' | 'error';

let state: SyncState = 'disabled';
const stateListeners = new Set<(s: SyncState) => void>();
function setState(next: SyncState) {
  state = next;
  stateListeners.forEach((fn) => fn(next));
}
export function subscribeSyncState(fn: (s: SyncState) => void): () => void {
  stateListeners.add(fn);
  fn(state);
  return () => { stateListeners.delete(fn); };
}
export function getSyncState(): SyncState { return state; }
export function getCurrentUser(): User | null { return currentUser; }

export function startSyncEngine(opts: { getProfile: GetProfile; applyProfile: ApplyProfile }) {
  if (started) return;
  started = true;
  getProfile = opts.getProfile;
  applyProfile = opts.applyProfile;

  if (!supabase || !supabaseEnabled()) {
    setState('disabled');
    return;
  }

  setState('signed_out');

  // React to auth changes (incl. magic link landing redirect).
  const sub = supabase.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });
  unsubscribeAuth = () => sub.data.subscription.unsubscribe();

  // Initial session check (page reload after magic link, etc.).
  void supabase.auth.getSession().then(({ data }) => handleSession(data.session));

  // Push on local writes (debounced).
  unsubscribeSessions = subscribeSessions(() => flushSoon());
}

export function stopSyncEngine() {
  unsubscribeSessions?.();
  unsubscribeAuth?.();
  unsubscribeSessions = null;
  unsubscribeAuth = null;
  if (pendingFlushId) { clearTimeout(pendingFlushId); pendingFlushId = null; }
  started = false;
}

function handleSession(session: Session | null) {
  const user = session?.user ?? null;
  const wasSignedIn = currentUser !== null;
  const isSignedIn = user !== null;
  currentUser = user;

  if (!isSignedIn) {
    setState('signed_out');
    void logOutBilling();
    return;
  }
  if (!wasSignedIn) {
    void identifyUser(user.id);
    void initialSync();
  }
}

async function initialSync() {
  if (!supabase || !currentUser) return;
  setState('syncing');
  try {
    await pullProfile();
    await pullSessions();
    await pushProfile();   // ensure server has the local profile if we just signed up
    await pushSessions();  // and the local session backlog
    setState('idle');
  } catch (e) {
    console.warn('[sync] initial sync failed', e);
    setState('error');
  }
}

async function pullProfile() {
  if (!supabase || !currentUser || !applyProfile) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  applyProfile({
    email: data.email ?? currentUser.email ?? null,
    synth: data.synth,
    playbackSpeed: data.playback_speed,
    drone: data.drone,
    autoPlay: data.auto_play,
    voiceRange: data.voice_range,
    singDifficulty: data.sing_difficulty,
    completedLevels: data.completed_levels ?? [],
    hasEverPracticed: data.has_ever_practiced,
  });
}

async function pullSessions() {
  if (!supabase || !currentUser) return;
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', currentUser.id);
  if (error) throw error;
  if (!data || data.length === 0) return;

  const local = getAllSessions();
  const merged = new Map<string, PersistedSession>();
  for (const s of local) merged.set(s.id, s);
  for (const row of data) {
    const cloud: PersistedSession = {
      id: row.id,
      endedAt: new Date(row.ended_at).getTime(),
      startedAt: new Date(row.started_at).getTime(),
      levelId: row.level_id,
      segmentId: row.segment_id,
      totalQuestions: row.total_questions,
      correct: row.correct,
      accuracy: row.accuracy,
      avgResponseMs: row.avg_response_ms,
      fastestMs: row.fastest_ms,
      items: row.items ?? {},
      confusions: row.confusions ?? [],
      unlocked: row.unlocked,
    };
    if (!merged.has(cloud.id)) merged.set(cloud.id, cloud);
  }
  const ordered = Array.from(merged.values()).sort((a, b) => a.endedAt - b.endedAt);
  replaceAllSessions(ordered);
}

async function pushProfile() {
  if (!supabase || !currentUser || !getProfile) return;
  if (!isPro()) return; // cloud sync push is a Pro feature; pull stays free for returning users

  const p = getProfile();
  const { error } = await supabase.from('profiles').upsert({
    user_id: currentUser.id,
    email: p.email ?? currentUser.email ?? null,
    synth: p.synth,
    playback_speed: p.playbackSpeed,
    drone: p.drone,
    auto_play: p.autoPlay,
    voice_range: p.voiceRange,
    sing_difficulty: p.singDifficulty,
    completed_levels: p.completedLevels,
    has_ever_practiced: p.hasEverPracticed,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function pushSessions() {
  if (!supabase || !currentUser) return;
  if (!isPro()) return; // see pushProfile
  const local = getAllSessions();
  if (local.length === 0) return;
  const rows = local.map((s) => ({
    user_id: currentUser!.id,
    id: s.id,
    level_id: s.levelId,
    segment_id: s.segmentId,
    started_at: new Date(s.startedAt).toISOString(),
    ended_at: new Date(s.endedAt).toISOString(),
    total_questions: s.totalQuestions,
    correct: s.correct,
    accuracy: s.accuracy,
    avg_response_ms: s.avgResponseMs,
    fastest_ms: s.fastestMs,
    items: s.items,
    confusions: s.confusions,
    unlocked: s.unlocked,
  }));
  // Chunked upsert keeps individual requests modest if a user has hundreds of sessions.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('sessions').upsert(slice, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}

export function flushSoon() {
  if (!currentUser) return;
  if (pendingFlushId) clearTimeout(pendingFlushId);
  pendingFlushId = setTimeout(() => {
    pendingFlushId = null;
    void flushNow();
  }, FLUSH_DEBOUNCE_MS);
}

export async function flushNow() {
  if (!supabase || !currentUser) return;
  setState('syncing');
  try {
    await pushProfile();
    await pushSessions();
    setState('idle');
  } catch (e) {
    console.warn('[sync] flush failed', e);
    setState('error');
  }
}

export async function signInWithMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  currentUser = null;
  setState('signed_out');
}

// An animated mascot: the drawing from src/mascots/, with a face, gentle idle life
// (breathing, blinks, ear flicks) and one-off actions such as "correct" or keeping time.
//
//   <Mascot name="pulse" face="happy" view="bust" size={80} />
//   <Mascot name="fable" act="wave" />           plays once when shown
//   ref.current.play('beat')                      plays on demand
//
// The drawing is inserted as markup so the shared animations (src/mascots/mascot.css)
// can move its parts. Motion stops for people who ask for reduced motion.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MASCOTS, TAP_MOVES, resolveAct } from '../mascots';
import type { MascotFace, MascotView } from '../mascots';
import type { Mascot as MascotName } from '../types';
import '../mascots/mascot.css';

export interface MascotHandle {
  /** Plays an action once (correct, wrong, beat, sing, wave…). Returns false if the mascot has nothing like it. */
  play: (act: string) => boolean;
}

interface Props {
  name: MascotName;
  face?: MascotFace;
  view?: MascotView;
  /** Breathing, blinks and ear flicks between actions. On by default. */
  idle?: boolean;
  /** An action to play once when the mascot appears (and again whenever it changes). */
  act?: string;
  /** Delay before `act`, so it can follow an entrance animation. */
  actDelayMs?: number;
  size?: number | string;
  /** Read out to screen readers. Leave out when the mascot is decoration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** A tap plays the mascot's moves in turn (TAP_MOVES). */
  playOnTap?: boolean;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function applyFace(svg: SVGSVGElement, def: (typeof MASCOTS)[MascotName], face: string, fx?: string) {
  const f = def.faces[face] ?? def.faces.neutral;
  svg.setAttribute('data-eyes', f.eyes);
  svg.setAttribute('data-mouth', f.mouth);
  svg.setAttribute('data-blush', f.blush ?? 'off');
  svg.setAttribute('data-fx', fx ?? f.fx ?? 'none');
  for (const [k, v] of Object.entries(f.extra ?? {})) svg.setAttribute(`data-${k}`, v);
}

const Mascot = forwardRef<MascotHandle, Props>(function Mascot(
  { name, face = 'neutral', view = 'full', idle = true, act, actDelayMs = 0, size = '100%', label, className, style, playOnTap = false },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  // Idle motion pauses while the mascot is off screen: the path shows one per section.
  const [onScreen, setOnScreen] = useState(true);
  const taps = useRef(0);
  const faceRef = useRef(face);
  faceRef.current = face;
  const def = MASCOTS[name];

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  // Restarts a CSS class so the same animation can play twice in a row.
  const flash = useCallback((cls: string, ms: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.classList.remove(cls);
    void svg.getBoundingClientRect();
    svg.classList.add(cls);
    later(() => svg.classList.remove(cls), ms);
  }, []);

  // Draw the mascot. Runs before paint so the first frame already has the right face.
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = def.svg;
    const svg = el.querySelector('svg');
    svgRef.current = svg;
    if (!svg) return;
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    busy.current = false;
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      svgRef.current = null;
    };
  }, [def]);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.setAttribute('viewBox', def.viewBox[view]);
    svg.setAttribute('data-view', view);
  }, [def, view]);

  useLayoutEffect(() => {
    if (svgRef.current && !busy.current) applyFace(svgRef.current, def, face);
  }, [def, face]);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const living = idle && onScreen;
  useEffect(() => {
    svgRef.current?.classList.toggle('idle', living);
  }, [def, living]);

  const play = useCallback((actName: string) => {
    const svg = svgRef.current;
    const a = resolveAct(name, actName);
    if (!svg || !a || busy.current) return false;
    busy.current = true;
    applyFace(svg, def, a.face, a.fx);
    flash(`anim-${a.anim}`, a.ms);
    later(() => {
      busy.current = false;
      if (svgRef.current) applyFace(svgRef.current, def, faceRef.current);
    }, a.ms + 150);
    return true;
  }, [def, flash, name]);

  useImperativeHandle(ref, () => ({ play }), [play]);

  useEffect(() => {
    if (!act || reducedMotion()) return;
    const t = window.setTimeout(() => play(act), actDelayMs);
    return () => clearTimeout(t);
  }, [act, actDelayMs, play]);

  // Idle life: a blink every few seconds (sometimes two), and now and then an ear flick.
  useEffect(() => {
    if (!living || reducedMotion()) return;
    let t: number;
    const tick = () => {
      t = window.setTimeout(() => {
        const svg = svgRef.current;
        if (svg && !busy.current && !document.hidden) {
          if (def.blinkEyes.includes(svg.getAttribute('data-eyes') ?? '')) {
            flash('blink', 170);
            if (Math.random() < 0.25) later(() => flash('blink', 170), 260);
          }
          if (Math.random() < 0.3) flash(Math.random() < 0.5 ? 'flick-l' : 'flick-r', 460);
        }
        tick();
      }, 1800 + Math.random() * 2600);
    };
    tick();
    return () => clearTimeout(t);
  }, [def, flash, living]);

  const onTap = () => {
    const moves = TAP_MOVES[name];
    if (play(moves[taps.current % moves.length])) taps.current += 1;
  };

  return (
    <div
      ref={host}
      className={className}
      onClick={playOnTap ? onTap : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-mascot={name}
      style={{ width: size, height: size, cursor: playOnTap ? 'pointer' : undefined, ...style }}
    />
  );
});

export default Mascot;

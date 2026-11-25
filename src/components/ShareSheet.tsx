import { useEffect, useRef, useState } from 'react';
import { Check, Download, Link2, Share2, X as Close } from 'lucide-react';
import { Bean } from './primitives';
import { redditShareUrl, trackShare, xShareUrl, type SharePayload, type ShareTarget } from '../lib/share';

interface Props {
  /** "Share your medal", "Share your week" */
  heading: string;
  payload: SharePayload;
  /** Draws the picture. Called once when the sheet opens. */
  makeImage: () => Promise<Blob>;
  /** File name for the saved picture, without extension. */
  fileName: string;
  onClose: () => void;
}

/**
 * Shares a picture and a link: the phone's own share menu where there is one, and X,
 * Reddit, copy link and save picture everywhere. Reddit gets a text post with the picture
 * saved first, so it reads as a person's progress post rather than a link drop.
 */
export default function ShareSheet({ heading, payload, makeImage, fileName, onClose }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    trackShare('share_opened', payload.kind);
    let url: string | null = null;
    let live = true;
    makeImage()
      .then((b) => {
        if (!live) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreview(url);
      })
      .catch((err) => console.warn('[share] picture failed', err));
    // preventDefault tells the medal behind this sheet that the Escape was ours.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => {
      live = false;
      window.removeEventListener('keydown', onKey);
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clicked = (target: ShareTarget) => trackShare('share_clicked', payload.kind, target);

  const savePicture = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const nativeShare = async () => {
    clicked('native');
    const url = payload.url('native');
    try {
      const file = blob ? new File([blob], `${fileName}.png`, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: payload.title, text: `${payload.text} ${url}` });
      } else {
        await navigator.share({ title: payload.title, text: payload.text, url });
      }
      trackShare('share_completed', payload.kind, 'native');
    } catch (err) {
      if ((err as { name?: string }).name !== 'AbortError') console.warn('[share] native share failed', err);
    }
  };

  const open = (target: 'x' | 'reddit') => {
    clicked(target);
    if (target === 'reddit') savePicture();
    window.open(target === 'x' ? xShareUrl(payload) : redditShareUrl(payload), '_blank', 'noopener');
    trackShare('share_completed', payload.kind, target);
  };

  const copy = async () => {
    clicked('copy');
    try {
      await navigator.clipboard.writeText(payload.url('copy'));
      setCopied(true);
      trackShare('share_completed', payload.kind, 'copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('[share] copy failed', err);
    }
  };

  const option = (label: string, icon: React.ReactNode, onClick: () => void, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 16,
        border: '2px solid var(--ink-1)',
        boxShadow: '0 3px 0 var(--ink-1)',
        background: 'var(--card)',
        color: 'var(--ink-1)',
        fontFamily: 'var(--ui)',
        fontWeight: 600,
        fontSize: 15,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(42,29,58,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--page)',
          border: '2px solid var(--ink-1)',
          boxShadow: '0 6px 0 var(--ink-1), 0 18px 40px rgba(42,29,58,0.25)',
          borderRadius: 28,
          padding: '22px 22px 20px',
          width: '100%',
          maxWidth: 460,
          maxHeight: '100%',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: 4 }}
        >
          <Close size={20} />
        </button>
        <h2 style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: 26, margin: '0 0 14px' }}>{heading}</h2>
        <div
          style={{
            aspectRatio: '1200 / 630',
            borderRadius: 16,
            border: '2px solid var(--ink-1)',
            overflow: 'hidden',
            background: 'var(--page-2)',
            marginBottom: 16,
          }}
        >
          {preview && <img src={preview} alt="The picture you'll share" style={{ width: '100%', height: '100%', display: 'block' }} />}
        </div>

        {canNativeShare && (
          <Bean tone="coral" size="lg" onClick={nativeShare} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Share2 size={18} aria-hidden /> share…</span>
          </Bean>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {option('Post on X', <span aria-hidden style={{ fontWeight: 800, width: 18, textAlign: 'center' }}>𝕏</span>, () => open('x'))}
          {option('Post on Reddit', <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', background: '#ff4500', display: 'inline-block' }} />, () => open('reddit'), !blob)}
          {option(copied ? 'Link copied' : 'Copy link', copied ? <Check size={18} aria-hidden /> : <Link2 size={18} aria-hidden />, copy)}
          {option('Save picture', <Download size={18} aria-hidden />, () => { clicked('image'); savePicture(); trackShare('share_completed', payload.kind, 'image'); }, !blob)}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, margin: '14px 2px 0' }}>
          Reddit opens a post with the words filled in, and the picture is saved for you to add. Pick a community where progress posts are welcome. Nothing personal is shared: no name, no email.
        </p>
      </div>
    </div>
  );
}

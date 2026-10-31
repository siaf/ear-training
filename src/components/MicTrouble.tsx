import { micHelpText, type MicProblem } from '../lib/micDiagnostics';

interface Props {
  problem: MicProblem;
  onRetry: () => void;
}

// Shown in place of the singing UI's status when the mic can't be used:
// device-specific steps to fix it, plus a retry that re-requests the mic.
export default function MicTrouble({ problem, onRetry }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, maxWidth: 320 }}>
      <div style={{ fontSize: 12, color: 'var(--coral-ink)', textAlign: 'center', lineHeight: 1.45 }}>
        {micHelpText(problem)}
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 16px',
          borderRadius: 999,
          background: 'var(--ink-1)',
          color: 'var(--page)',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        try again
      </button>
    </div>
  );
}

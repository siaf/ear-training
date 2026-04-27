/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        page: 'var(--page)',
        'page-2': 'var(--page-2)',
        'page-3': 'var(--page-3)',
        card: 'var(--card)',
        'ink-1': 'var(--ink-1)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        'ink-4': 'var(--ink-4)',
        'ink-5': 'var(--ink-5)',
        hairline: 'var(--hairline)',
        mint: 'var(--mint)',
        'mint-ink': 'var(--mint-ink)',
        coral: 'var(--coral)',
        'coral-ink': 'var(--coral-ink)',
        lav: 'var(--lav)',
        'lav-ink': 'var(--lav-ink)',
        butter: 'var(--butter)',
        'butter-ink': 'var(--butter-ink)',
        sky: 'var(--sky)',
        'sky-ink': 'var(--sky-ink)',
      },
      borderRadius: {
        'r-sm': '10px',
        'r-md': '18px',
        'r-lg': '26px',
        'r-xl': '34px',
      },
      boxShadow: {
        'sh-sm': '0 1px 2px rgba(42,29,58,0.06), 0 2px 6px rgba(42,29,58,0.05)',
        'sh-md': '0 4px 14px rgba(42,29,58,0.10), 0 2px 5px rgba(42,29,58,0.06)',
        'sh-lg': '0 16px 40px rgba(42,29,58,0.14), 0 6px 12px rgba(42,29,58,0.08)',
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: ['class', '[data-theme="dark"]'],
	theme: {
		extend: {
			colors: {
				bg: 'var(--bg)',
				surface: 'var(--surface)',
				'surface-2': 'var(--surface-2)',
				border: 'var(--border)',
				'border-strong': 'var(--border-strong)',
				ink: 'var(--ink)',
				'ink-soft': 'var(--ink-soft)',
				muted: 'var(--muted)',
				accent: 'var(--accent)',
				'accent-soft': 'var(--accent-soft)',
				'accent-fg': 'var(--accent-fg)',
				ok: 'var(--ok)',
				warn: 'var(--warn)',
				bad: 'var(--bad)'
			},
			fontFamily: {
				sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
			},
			boxShadow: {
				card: 'var(--shadow)'
			},
			borderRadius: {
				xl: '0.875rem',
				'2xl': '1.125rem'
			}
		}
	},
	plugins: []
} satisfies Config;

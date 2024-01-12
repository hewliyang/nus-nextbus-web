import type { Config } from 'tailwindcss';

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	plugins: [require('daisyui')],

	daisyui: {
		themes: ['light', 'halloween']
	},

	darkMode: ['class', '[data-theme="halloween"]']
} satisfies Config;

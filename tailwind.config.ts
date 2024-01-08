import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter Variable', ...defaultTheme.fontFamily.sans]
			}
		}
	},
	plugins: [require('daisyui')],

	daisyui: {
		themes: ['light', 'halloween']
	},

	darkMode: ['class', '[data-theme="halloween"]']
} satisfies Config;

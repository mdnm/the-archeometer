/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arch: {
          ether:     '#78bd79',
          fire:      '#cc58a1',
          mary:      '#e25b61',
          orange:    '#e96836',
          lime:      '#b7bd58',
          violet:    '#8f69a3',
          teal:      '#63a890',
          parchment: '#fffaf1',
          blush:     '#eba0be',
          sage:      '#d2e8df',
          cream:     '#fff3d4',
          navy:      '#1a1a2e',
          ink:       '#12122a',
        },
      },
      fontFamily: {
        serif: ['"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 
/**
 * UI design tokens adapted with unslop by Damir Sokolovsky (@heydamir, https://github.com/heydamir/unslop), CC BY 4.0.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        desk: {
          deep: '#0f0f10',
          bg: '#141415',
          card: '#19191b',
          raised: '#232325',
          text: '#ededed',
          secondary: '#a1a1a6',
          muted: '#85858b',
          up: '#4cc38a',
          down: '#e5484d',
          amber: '#d49b35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderColor: {
        hairline: 'rgba(237, 237, 237, 0.08)',
        'hairline-strong': 'rgba(237, 237, 237, 0.14)',
      },
      transitionTimingFunction: {
        desk: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        'inset-top': 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'inset-btn': 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      },
    },
  },
  plugins: [],
}

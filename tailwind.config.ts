import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#F9FAFB',
          800: '#F3F4F6',
          700: '#E5E7EB',
          600: '#D1D5DB',
          500: '#9CA3AF',
        },
        surface: '#FFFFFF',
        border: '#E5E7EB',
        primary: '#111827',
        amber: {
          DEFAULT: '#4F46E5',
          dim: 'rgba(79,70,229,0.08)',
          border: 'rgba(79,70,229,0.25)',
          400: '#6366F1',
        },
        ice: '#2563EB',
        success: '#16A34A',
        danger: '#DC2626',
        muted: '#9CA3AF',
        secondary: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

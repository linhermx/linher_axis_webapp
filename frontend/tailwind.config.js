/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: 'var(--primary)',
          'primary-hover': 'var(--primary-hover)',
          action: 'var(--action)',
          'action-hover': 'var(--action-hover)',
        },
        ui: {
          background: 'var(--background)',
          surface: 'var(--surface)',
          'surface-subtle': 'var(--surface-subtle)',
          'dark-navy': 'var(--dark-navy)',
          slate: 'var(--slate)',
          'light-slate': 'var(--light-slate)',
          'text-main': 'var(--text-main)',
          'text-secondary': 'var(--text-secondary)',
        },
        status: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          error: 'var(--error)',
          info: 'var(--info)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      spacing: {
        unit: 'var(--spacing-unit)',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

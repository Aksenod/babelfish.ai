/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          thick: {
            bg: 'rgba(255, 255, 255, 0.75)',
            border: 'rgba(255, 255, 255, 0.7)',
          },
          thin: {
            bg: 'rgba(255, 255, 255, 0.5)',
            border: 'rgba(255, 255, 255, 0.6)',
          },
          active: {
            bg: 'rgba(219, 234, 254, 0.7)',
            border: 'rgba(255, 255, 255, 0.8)',
          },
        },
        mesh: {
          base: '#f0f4f8',
        },
        status: {
          active: '#10b981',
          recording: '#ef4444',
          listening: '#eab308',
          paused: '#9ca3af',
        },
      },
      boxShadow: {
        'glass-thick': `
          inset 0 1px 0 0 rgba(255, 255, 255, 0.9),
          0 20px 40px -10px rgba(0, 80, 150, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.3)
        `,
        'glass-thin': 'inset 0 0.5px 0 0 rgba(255, 255, 255, 0.8)',
        'glass-active': `
          inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
          0 4px 15px -3px rgba(37, 99, 235, 0.15)
        `,
      },
      backdropBlur: {
        'glass-thick': '40px',
        'glass-thin': '20px',
      },
      borderRadius: {
        'glass': '1.5rem',
        'glass-lg': '2rem',
        'glass-xl': '3rem',
      },
      transitionDuration: {
        'glass': '200ms',
        'glass-slow': '300ms',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}


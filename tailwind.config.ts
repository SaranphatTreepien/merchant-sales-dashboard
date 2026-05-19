import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#40BEB6',
          dark: '#2EA39C',
          light: '#6DD4CF',
        },
      },
    },
  },
}

export default config

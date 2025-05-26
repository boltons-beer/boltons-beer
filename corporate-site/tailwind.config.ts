import { type Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'maple-red': '#D04A36',
        'maple-orange': '#F18D5E',
        'maple-light': '#FFF5F0',
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
} satisfies Config;

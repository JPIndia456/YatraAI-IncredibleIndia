import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        saffron: "var(--primary-saffron)",
        green: "var(--primary-green)",
        "primary-teal": "var(--primary-teal)",
        "accent-amber": "var(--accent-amber)",
        "forest": "var(--foreground-forest)",
        "sage-white": "var(--bg-sage-white)",
        "cyan-500": "var(--primary-saffron)", // Sync legacy cyan to saffron
        "emerald-500": "var(--primary-green)", // Sync legacy emerald to green
        "amber-500": "var(--accent-amber)",
        zinc: {
          950: "#030712",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "slow-zoom": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.1)" },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "left center" },
          "50%": { "background-position": "right center" },
        },
      },
      animation: {
        "slow-zoom": "slow-zoom 20s infinite alternate ease-in-out",
        "gradient-x": "gradient-x 15s ease infinite",
      },
      fontSize: {
        "2xs":  "var(--text-xs)",
        "micro": "var(--text-11)",
        "11":   "var(--text-11)",
      },
      fontFamily: {
        "serif": ["var(--font-noto-serif)", "serif"],
        "sans": ["var(--font-inter)", "system-ui", "sans-serif"],
        "dm":      ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        "jakarta": ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [tailwindAnimate],
};
export default config;

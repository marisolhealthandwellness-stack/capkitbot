import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marisol brand guide, V2 Final — every value sourced from the guide, not invented.
        claret: "#8B2942", // primary / personality — carries the bot's voice
        plum: "#2A1622", // ink
        slate: "#5A6E80", // capable / secondary
        mint: "#A8C7B6", // soft tint — the person's own messages
        bone: "#FBF7F0", // canvas
        rose: "#B5526A", // claret tint
        spark: "#FF6A1A", // orange — buttons and calls to action only
      },
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        sans: ["var(--font-montserrat)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

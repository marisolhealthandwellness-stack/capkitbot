import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bubbleUser: "#0b84fe",
        bubbleBot: "#e9e9eb",
      },
    },
  },
  plugins: [],
};

export default config;

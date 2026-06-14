import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        abyss:   "#0D1117",   // deepest background
        void:    "#10161E",   // input background
        fortress:"#1C2333",   // card surface

        // Borders / strokes
        wall:    "#2D3748",   // default border
        stone:   "#4A5568",   // hover border / subtle text

        // Text
        parchment: "#E8E6E0", // primary text
        muted:     "#6B7280", // placeholder / secondary text

        // Brand accent
        ember:      "#E8673A",
        "ember-dark":"#C95528",

        // Gold (available for future use)
        gold: "#C9A84C",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
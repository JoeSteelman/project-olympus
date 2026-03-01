import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        olympus: "0 30px 80px rgba(0, 0, 0, 0.45)"
      },
      colors: {
        storm: "#08111e",
        marble: "#d7cfbf",
        ember: "#f6c35c"
      }
    }
  },
  plugins: []
};

export default config;

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "charts",
              test: /node_modules\/(recharts|d3-|victory|es-toolkit)/,
              priority: 20,
            },
            {
              name: "react",
              test: /node_modules\/(react|react-dom|scheduler)\//,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: { "/api": process.env.MERIDIAN_API_URL || "http://127.0.0.1:8017" },
  },
});

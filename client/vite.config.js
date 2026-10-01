import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
export default defineConfig({
  plugins: [solid()],
  base: "./",
  server: {
    proxy: process.env.CAMX_DEVICE
      ? Object.fromEntries(
          [
            "/status",
            "/arm",
            "/move",
            "/home",
            "/stop",
            "/disarm",
            "/calibration",
            "/heartbeat",
          ].map((path) => [
            path,
            { target: process.env.CAMX_DEVICE, changeOrigin: true },
          ]),
        )
      : {},
  },
  build: { target: "es2022", assetsInlineLimit: 0 },
});

import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
const device = process.env.CAMX_DEVICE_URL || process.env.CAMX_DEVICE;
export default defineConfig({
  plugins: [solid()],
  base: "./",
  server: {
    proxy: device
      ? Object.fromEntries(
          [
            "/status",
            "/arm",
            "/move",
            "/jog",
            "/home",
            "/stop",
            "/disarm",
            "/calibration",
            "/heartbeat",
          ].map((path) => [path, { target: device, changeOrigin: true }]),
        )
      : {},
  },
  build: { target: "es2022", assetsInlineLimit: 0 },
});

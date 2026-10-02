import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "#": resolve(process.cwd(), "src"),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/test/**/*.test.ts"],
    server: {
      deps: {
        inline: true,
      },
    },
  },
});

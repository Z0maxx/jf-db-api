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
    mockReset: true,
    globals: true,
    environment: "node",
    include: ["src/test/unit/**/*.test.ts"],
    server: {
      deps: {
        inline: true,
      },
    },
  },
});

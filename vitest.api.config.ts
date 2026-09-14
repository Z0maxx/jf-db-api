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
    include: ["src/test/**/*.test.ts"],
    globalSetup: ["./src/test/api/setup.ts"],
    server: {
      deps: {
        inline: true,
      },
    },
  },
});

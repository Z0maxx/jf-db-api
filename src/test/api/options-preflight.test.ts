import supertest from "supertest";
import { assert, describe, it } from "vitest";

import { app } from "#/app";
import { envConfig } from "#/env-config";

describe("OPTIONS preflight", () => {
  it("returns 204 with CORS headers before the database middleware", async () => {
    const res = await supertest(app)
      .options("/divisions")
      .set("Origin", "https://example.com")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "Authorization");

    assert.equal(res.statusCode, 204);
    assert.equal(res.text, "");
    assert.equal(res.headers["access-control-allow-origin"], envConfig.CORS_ALLOW_ORIGIN);
    assert.equal(
      res.headers["access-control-allow-headers"],
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    assert.equal(res.headers["access-control-allow-methods"], "GET, POST, PUT, DELETE, OPTIONS");
  });
});

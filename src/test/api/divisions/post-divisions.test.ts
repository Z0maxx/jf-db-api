import { app } from "#/app";
import { ctx } from "#/db-context";
import { BaseEntity, colors } from "@mikro-orm/core";
import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { DivisionType } from "#/db-entities/Division";
import { divisionDuplicateValidator } from "#/divisions/validators/division-duplicate.validator";

const entities: BaseEntity[] = [];
describe("POST /divisions", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("sets divisions", async () => {
    const otherDivisions = await ctx.divisions.findAll();
    const [divisionToDelete, divisionToUpdate] = await ctx.divisions.upsertMany([
      {
        type: "soldier",
        name: "division to delete",
        color: "000000",
      },
      {
        type: "demoman",
        name: "division to update",
        color: "111111",
      },
    ]);
    entities.push(divisionToUpdate);
    const divisionToCreate = {
      type: DivisionType.SOLDIER,
      name: "division to create",
      color: "222222",
    };
    const updatedColor = "222222";
    const divisions = [
      ...otherDivisions.map(({ type, name, color }) => ({ type, name, color })),
      divisionToCreate,
      {
        type: divisionToUpdate.type,
        name: divisionToUpdate.name,
        color: updatedColor,
      },
    ];

    const res = await loginAs(request(app).post("/divisions").send(divisions), testHeadAdmin);

    assert.equal(res.statusCode, 204);
    const deletedDivision = await ctx.divisions.findOne({ id: divisionToDelete.id });
    assert.isNull(deletedDivision);
    const createdDivision = await ctx.divisions.findOne({ name: divisionToCreate.name });
    assert.isNotNull(createdDivision);
    entities.push(createdDivision)
    assert.containSubset(createdDivision.serialize(), divisionToCreate);
    assert.containSubset(divisionToUpdate!.serialize(), {
      color: updatedColor,
    });
  });

  it("returns a validation error when there are multiple divisions with same name", async () => {
    const duplicateDivision = {
      type: DivisionType.SOLDIER,
      name: "duplicate division",
      color: "000000",
    };
    const divisions = [duplicateDivision, duplicateDivision];

    const res = await loginAs(request(app).post("/divisions").send(divisions), testHeadAdmin);

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: divisionDuplicateValidator.getMessages([duplicateDivision]),
    });
  });

  it("returns forbidden when the user cannot manage divisions", async () => {
    const res = await loginAs(request(app).post("/divisions").send([]), testUser1);

    assert.equal(res.statusCode, 403);
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).post("/divisions").send([]);

    assert.equal(res.statusCode, 401);
  });
});

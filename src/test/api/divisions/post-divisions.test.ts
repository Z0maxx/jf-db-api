import { app } from "#/app";
import { ctx } from "#/db-context";
import { DivisionType } from "#/db-entities/Division";
import { divisionDuplicateValidator } from "#/divisions/validators/division-duplicate.validator";
import { UnassignedDivisionsDeletedError } from "#/errors";
import { BaseEntity } from "@mikro-orm/core";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

const entities: BaseEntity[] = [];
describe("POST /divisions", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("sets divisions", async () => {
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
    const otherDivisions = (await ctx.divisions.findAll()).filter(
      (d) =>
        ![divisionToCreate.name, divisionToUpdate.name, divisionToDelete.name].includes(d.name),
    );
    const updatedColor = "333333";
    const divisions = [
      ...otherDivisions.map(({ type, name, color }) => ({ type, name, color })),
      divisionToCreate,
      {
        type: divisionToUpdate.type,
        name: divisionToUpdate.name,
        color: updatedColor,
      },
    ];

    const res = await loginAs(request(app).post("/divisions"), testHeadAdmin).send(divisions);

    assert.equal(res.statusCode, 204);
    const deletedDivision = await ctx.divisions.findOne({ id: divisionToDelete.id });
    assert.notExists(deletedDivision?.id);
    const createdDivision = await ctx.divisions.findOne({ name: divisionToCreate.name });
    assert.isNotNull(createdDivision);
    entities.push(createdDivision);
    assert.containsSubset(createdDivision.serialize(), divisionToCreate);
    assert.equal(divisionToUpdate!.serialize().color, updatedColor);
  });

  it("returns a validation error when there are multiple divisions with same name", async () => {
    const division = {
      type: DivisionType.SOLDIER,
      name: "duplicate division",
      color: "000000",
    };
    const divisions = [division, division];

    const res = await loginAs(request(app).post("/divisions"), testHeadAdmin).send(divisions);

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: divisionDuplicateValidator.getMessages([division]),
    });
  });

  it("returns unassigned divisions deleted error when trying to delete unassigned divisions", async () => {
    const res = await loginAs(request(app).post("/divisions"), testHeadAdmin).send([]);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "UnassignedDivisionsDeletedError",
      errorMessages: new UnassignedDivisionsDeletedError([
        "Unassigned Soldier",
        "Unassigned Demoman",
      ]).messages,
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(request(app).post("/divisions"), testHeadAdmin).send([{}]);

    assert.equal(res.status, 400);
  });

  it("returns forbidden when the user cannot manage divisions", async () => {
    const res = await loginAs(request(app).post("/divisions"), testUser1).send([]);

    assert.equal(res.statusCode, 403);
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).post("/divisions").send([]);

    assert.equal(res.statusCode, 401);
  });
});

import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { app } from "#/app";
import { claimNames } from "#/claim-names";
import { testHeadAdmin } from "../test-entities";
import { ctx } from "#/db-context";

describe("POST /roles", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("sets roles", async () => {
    const [roleToDelete, roleToUpdate] = await ctx.roles.upsertMany([
      {
        name: "role to delete",
      },
      {
        name: "role to update",
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
    assert.containsSubset(divisionToUpdate!.serialize(), {
      color: updatedColor,
    });
  })
})
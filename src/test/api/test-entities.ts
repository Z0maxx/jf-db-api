import { ctx } from "#/db-context";
import { Division, DivisionType } from "#/db-entities/Division";
import { Role } from "#/db-entities/Role";
import { User } from "#/db-entities/User";

export let testSoldierDivision: Division;
export let testDemomanDivision: Division;
export let testUser1: User;
export let testUser2: User;
export let testHeadAdmin: User;

export async function createTestEntitiesAsync() {
  [testSoldierDivision, testDemomanDivision] = await ctx.divisions.upsertMany([
    {
      id: 100_001,
      name: "test soldier division",
      color: "111111",
      type: DivisionType.SOLDIER,
    },
    {
      id: 100_002,
      name: "test demoman division",
      color: "222222",
      type: DivisionType.DEMOMAN,
    },
  ]);

  const headAdminRole = await ctx.roles.findOne({ name: "head admin" });
  const userRole = await ctx.roles.findOne({ name: "user" });
  [testUser1, testUser2, testHeadAdmin] = await ctx.users.upsertMany([
    {
      id: 100_001,
      steam64Id: "76561198167723343",
      tempusId: 107696,
      role: userRole,
    },
    {
      id: 100_002,
      steam64Id: "76561198046214898",
      tempusId: 94512,
      role: userRole,
    },
    {
      id: 100_003,
      steam64Id: "00000000000000000",
      tempusId: 0,
      role: headAdminRole,
    },
  ]);

  testUser1.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  testUser2.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  await ctx.saveAsync();
}

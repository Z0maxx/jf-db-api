import { ctx } from "#/db-context";
import { Division, DivisionType } from "#/db-entities/Division";
import { Role } from "#/db-entities/Role";
import { User } from "#/db-entities/User";

export let testSoldierDivision: Division;
export let testDemomanDivision: Division;
export let testRole: Role;
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

  testRole = await ctx.roles.upsert({
    id: 100_000,
    name: "test role",
    level: 9999,
  });

  const headAdminRole = await ctx.roles.findOne({ name: "head admin" });
  [testUser1, testUser2, testHeadAdmin] = await ctx.users.upsertMany([
    {
      id: 100_001,
      steamId64: "76561198167723343",
      tempusId: 107696,
      role: testRole,
    },
    {
      id: 100_002,
      steamId64: "76561198046214898",
      tempusId: 94512,
      role: testRole,
    },
    {
      id: 100_003,
      steamId64: "00000000000000000",
      tempusId: 0,
      role: headAdminRole,
    },
  ]);

  testUser1.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  testUser2.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  await ctx.saveAsync();
}

import { ctx } from "#/db-context";
import { Division, DivisionType } from "#/db-entities/Division";
import { UserTempusIdStatus } from "#/db-entities/User";
import { headAdminRole, userRole } from "#/default-entities";
import { LoadedUser } from "#/types";

export let testSoldierDivision: Division;
export let testDemomanDivision: Division;
export let testUser1: LoadedUser;
export let testUser2: LoadedUser;
export let testHeadAdmin: LoadedUser;

export async function createTestEntitiesAsync() {
  [testSoldierDivision, testDemomanDivision] = await ctx.divisions.upsertMany([
    {
      id: 100_001,
      name: "soldier division",
      color: "111111",
      type: DivisionType.SOLDIER,
    },
    {
      id: 100_002,
      name: "demoman division",
      color: "222222",
      type: DivisionType.DEMOMAN,
    },
  ]);

  const [user1, user2, headAdmin] = await ctx.users.upsertMany([
    {
      id: 100_001,
      steam64Id: "76561198167723343",
      tempusId: 47849,
      tempusIdStatus: UserTempusIdStatus.VERIFIED,
      role: userRole,
    },
    {
      id: 100_002,
      steam64Id: "76561198046214898",
      tempusId: 94512,
      tempusIdStatus: UserTempusIdStatus.VERIFIED,
      role: userRole,
    },
    {
      id: 100_003,
      steam64Id: "76561198049588377",
      tempusId: 0,
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: headAdminRole,
    },
  ]);

  user1.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  user2.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  headAdmin.divisionCollection.set([testSoldierDivision, testDemomanDivision]);

  await ctx.saveAsync();

  [testUser1, testUser2, testHeadAdmin] = await ctx.users.find(
    { id: { $in: [user1.id, user2.id, headAdmin.id] } },
    { populate: ["divisionCollection", "role.claimCollection"] },
  );
}

export type BountyGroupsDto = {
  id: number;
  division: string;
  keyPrize: number;
  eventId: number;
};

export type BountyMapDto = {
  id: number;
  groupId: number;
  name: string;
};

export type BountyCompletionDto = {
  id: number;
  steam64Id: string;
  mapId: number;
};
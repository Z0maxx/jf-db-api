import { ctx } from "#/db-context";
import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { Division } from "#/db-entities/Division";
import { setMapsAsync } from "#/helpers/map.helper";
import { getLeaderboardFilter } from "#/mikro-filters";
import {
  CreateAllOutEventDto,
  UpdateAllOutEventDto,
  LeaderboardQuery,
  Registration,
  CreateEventMapDto,
  CreateTimeLimitedEventMapDto,
} from "#/types";
import { wrap } from "@mikro-orm/core";

export const allOutRepository = {
  async getAllEventsAsync(): Promise<AllOutEvent[]> {
    return await ctx.allOut.events.findAll();
  },

  async getEventByIdAsync(eventId: number) {
    return await ctx.allOut.events.findOne(
      { id: eventId },
      {
        populate: [
          "allOutStage1MapCollection.division",
          "allOutStage2MapCollection.division",
          "allOutStage3MapCollection.division",
        ],
      },
    );
  },

  async getParticipantAsync(eventId: number, userId: number) {
    return await ctx.allOut.participants.findOne({ event: eventId, user: userId });
  },

  async getAllEventParticipantsAsync(eventId: number) {
    return await ctx.allOut.participants.find(
      { event: eventId },
      { populate: ["user", "divisionCollection"] },
    );
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery) {
    const filter = getLeaderboardFilter(query, { prSeconds: "ASC" });
    const [items] = await ctx.allOut.stage1Leaderboard.findAndCount(filter.query, filter.options);
    return items;
  },

  async getStage2LeaderboardAsync(query: LeaderboardQuery) {
    const filter = getLeaderboardFilter(query, { lapCount: "DESC" });
    const [items] = await ctx.allOut.stage2Leaderboard.findAndCount(filter.query, filter.options);
    return items;
  },

  async getStage3LeaderboardAsync(query: LeaderboardQuery) {
    const filter = getLeaderboardFilter(query, { prSeconds: "ASC" });
    const [items] = await ctx.allOut.stage3Leaderboard.findAndCount(filter.query, filter.options);
    return items;
  },

  async eventExistsAsync(eventId: number) {
    return (await ctx.allOut.events.findOne({ id: eventId })) !== null;
  },

  async stage1MapExistsAsync(mapId: number) {
    return (await ctx.allOut.stage1Maps.findOne({ id: mapId })) !== null;
  },

  async stage2MapExistsAsync(mapId: number) {
    return (await ctx.allOut.stage2Maps.findOne({ id: mapId })) !== null;
  },

  async stage3MapExistsAsync(mapId: number) {
    return (await ctx.allOut.stage3Maps.findOne({ id: mapId })) !== null;
  },

  async registrationExistsAsync(registration: Registration) {
    return !!(await ctx.allOut.participants.findOne({
      user: registration.userId,
      event: registration.eventId,
    }));
  },

  async usersHaveEventDivisionsAsync(eventId: number, userIds: number[]) {
    const event = await ctx.allOut.events.findOneOrFail(
      { id: eventId },
      {
        populate: [
          "allOutStage1MapCollection.division.id",
          "allOutStage2MapCollection.division.id",
          "allOutStage3MapCollection.division.id",
        ],
      },
    );

    const divisionIds = new Set<number>([
      ...event.allOutStage1MapCollection.$.map((m) => m.division.id),
      ...event.allOutStage1MapCollection.$.map((m) => m.division.id),
      ...event.allOutStage1MapCollection.$.map((m) => m.division.id),
    ]);

    const users = await ctx.users.find(
      { id: { $in: userIds } },
      { populate: ["divisionCollection"] },
    );
    return new Map<number, boolean>(
      users.map((u) => [u.id, u.divisionCollection.$.exists((d) => divisionIds.has(d.id))]),
    );
  },

  async userHasEventDivisionsAsync(eventId: number, userId: number) {
    const result = await this.usersHaveEventDivisionsAsync(eventId, [userId]);
    return result.get(userId)!;
  },

  async createEventAsync(event: CreateAllOutEventDto) {
    const createdEvent = ctx.allOut.events.create(mapToDbAllOutEvent(event));
    await setStageMapsAsync(createdEvent, event);
    await ctx.saveAsync();
    return createdEvent.id;
  },

  async updateEventAsync(event: UpdateAllOutEventDto) {
    const existingEvent = await ctx.allOut.events.findOneOrFail({ id: event.id });
    wrap(existingEvent).assign(mapToDbAllOutEvent(event));
    await setStageMapsAsync(existingEvent, event);
    await updateEventParticipantsAsync(existingEvent);
    await ctx.saveAsync();
  },

  async registerAsync(registration: Registration) {
    if (await this.registrationExistsAsync(registration)) {
      return;
    }

    const user = await ctx.users.findOneOrFail(
      { id: registration.userId },
      { populate: ["divisionCollection"] },
    );
    const participant = ctx.allOut.participants.create({
      event: registration.eventId,
      user,
    });

    participant.divisionCollection.set(user.divisionCollection);
    await ctx.saveAsync();
  },

  async deleteRegistrationAsync(registration: Registration) {
    const participant = await ctx.allOut.participants.findOneOrFail({
      user: registration.userId,
      event: registration.eventId,
    });

    ctx.em.remove(participant);
    await ctx.saveAsync();
  },

  async resignAsync(registration: Registration) {
    const participant = await ctx.allOut.participants.findOneOrFail({
      user: registration.userId,
      event: registration.eventId,
    });

    participant.resigned = true;
    await ctx.saveAsync();
  },

  async deleteEventAsync(event: AllOutEvent) {
    ctx.em.remove(event);
    await ctx.saveAsync();
  },

  async cancelEventAsync(event: AllOutEvent) {
    event.canceled = true;
    await ctx.saveAsync();
  },
};

function mapToDbAllOutEvent(event: CreateAllOutEventDto | UpdateAllOutEventDto) {
  const { stage1, stage2, stage3 } = event;
  return {
    description: event.description,

    stage1Description: stage1.description ?? "",
    stage1Start: stage1.start,
    stage1End: stage1.end,

    stage2Description: stage2.description ?? "",
    stage2Start: stage2.start,
    stage2End: stage2.end,

    stage3Description: stage3.description ?? "",
    stage3Start: stage3.start,
    stage3End: stage3.end,
  };
}

async function setStageMapsAsync(
  event: AllOutEvent,
  newEvent: CreateAllOutEventDto | UpdateAllOutEventDto,
) {
  const divisionIds = [
    ...newEvent.stage1.maps.map((m) => m.divisionId),
    ...newEvent.stage2.maps.map((m) => m.divisionId),
    ...newEvent.stage3.maps.map((m) => m.divisionId),
  ];

  const divisions = await ctx.divisions.find({ id: { $in: divisionIds } });
  const divisionsMap = new Map(divisions.map((d) => [d.id, d]));
  await setStage1MapsAsync(event, newEvent.stage1.maps, divisionsMap);
  await setStage2MapsAsync(event, newEvent.stage2.maps, divisionsMap);
  await setStage3MapsAsync(event, newEvent.stage3.maps, divisionsMap);
}

async function setStage1MapsAsync(
  event: AllOutEvent,
  maps: CreateTimeLimitedEventMapDto[],
  divisionsMap: Map<number, Division>,
) {
  const transformFn = (m: CreateTimeLimitedEventMapDto) => ({
    name: m.name,
    timeLimit: m.timeLimit,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setMapsAsync(ctx.allOut.stage1Maps, event, maps, transformFn, transformFn);
}

async function setStage2MapsAsync(
  event: AllOutEvent,
  maps: CreateEventMapDto[],
  divisionsMap: Map<number, Division>,
) {
  const transformFn = (m: CreateEventMapDto) => ({
    name: m.name,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setMapsAsync(ctx.allOut.stage2Maps, event, maps, transformFn, transformFn);
}

async function setStage3MapsAsync(
  event: AllOutEvent,
  maps: CreateEventMapDto[],
  divisionsMap: Map<number, Division>,
) {
  const transformFn = (m: CreateEventMapDto) => ({
    name: m.name,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setMapsAsync(ctx.allOut.stage3Maps, event, maps, transformFn, transformFn);
}

async function updateEventParticipantsAsync(event: AllOutEvent) {
  const participants = await ctx.allOut.participants.find({ event }, { populate: ["user.id"] });
  const canParticipate = await allOutRepository.usersHaveEventDivisionsAsync(
    event.id,
    participants.map((p) => p.user.id),
  );

  participants.forEach(async (p) => {
    if (!canParticipate.get(p.user.id)) {
      ctx.em.remove(p);
    }
  });
}

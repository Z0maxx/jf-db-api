import { ctx } from "#/db-context";
import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { Division } from "#/db-entities/Division";
import { transformDbMaps, setMapsAsync } from "#/helpers/map.helper";
import { getLeaderboardFilter } from "#/mikro-filters";
import { steamUsers } from "#/steam/steam-users";
import {
  AllOutEventDetails,
  AllOutEventPreview,
  CreateAllOutEvent,
  CreateEventMap,
  CreateTimeLimitedEventMap,
  LapLeaderboardItem,
  LeaderboardItem,
  LeaderboardQuery,
  Participant,
  Registration,
  UpdateAllOutEvent,
} from "#/types";
import { wrap } from "@mikro-orm/core";

export const allOutRepository = {
  async getEventByIdAsync(eventId: number) {
    return ctx.allOut.events.findOneOrFail({ id: eventId });
  },

  async getAllEventPreviewsAsync(): Promise<AllOutEventPreview[]> {
    const events = await ctx.allOut.events.findAll();

    return events.map((e) => ({
      id: e.id,
      start: e.stage1Start,
      end: e.stage3End,
    }));
  },

  async getEventDetailsAsync(eventId: number): Promise<AllOutEventDetails> {
    const event = await ctx.allOut.events.findOneOrFail(
      { id: eventId },
      {
        populate: [
          "allOutStage1MapCollection.division",
          "allOutStage2MapCollection.division",
          "allOutStage3MapCollection.division",
        ],
      },
    );

    const stage1Maps = transformDbMaps(event.allOutStage1MapCollection, (map) => ({
      id: map.id,
      name: map.name,
      timeLimit: map.timeLimit,
      division: {
        name: map.division.$.name,
        type: map.division.$.type,
        color: map.division.$.color,
      },
    }));

    const stage2Maps = transformDbMaps(event.allOutStage2MapCollection, (map) => ({
      id: map.id,
      name: map.name,
      division: {
        name: map.division.$.name,
        type: map.division.$.type,
        color: map.division.$.color,
      },
    }));

    const stage3Maps = transformDbMaps(event.allOutStage3MapCollection, (map) => ({
      id: map.id,
      name: map.name,
      division: {
        name: map.division.$.name,
        type: map.division.$.type,
        color: map.division.$.color,
      },
    }));

    return {
      id: event.id,
      description: event.description,
      stage1: {
        description: event.stage1Description,
        start: event.stage1Start,
        end: event.stage1End,
        maps: stage1Maps,
      },
      stage2: {
        description: event.stage2Description,
        start: event.stage2Start,
        end: event.stage2End,
        maps: stage2Maps,
      },
      stage3: {
        description: event.stage3Description,
        start: event.stage3Start,
        end: event.stage3End,
        maps: stage3Maps,
      },
    };
  },

  async getAllEventParticipantsAsync(eventId: number): Promise<Participant[]> {
    const participants = await ctx.allOut.participants.find(
      { event: eventId },
      { populate: ["user"] },
    );

    const users = await steamUsers.getUsersAsync(participants.map((p) => p.user.$.steamId64));
    const allDivisions = await ctx.allOut.participantDivisions.find(
      { participant: { $in: participants.map((p) => p.id) } },
      { populate: ["participant", "division"] },
    );

    return participants.map((p) => ({
      id: p.id,
      ...users.get(p.user.$.steamId64)!,
      divisions: allDivisions
        .filter((d) => d.participant.$.id === p.id)
        .map((d) => ({
          type: d.division.$.type,
          name: d.division.$.name,
          color: d.division.$.color,
        })),
    }));
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery): Promise<LeaderboardItem[]> {
    const filter = getLeaderboardFilter(query, { prSeconds: "ASC" });
    const [items] = await ctx.allOut.stage1Leaderboard.findAndCount(filter.query, filter.options);
    const users = await steamUsers.getUsersAsync(
      items.map((i) => i.participant.$.user.$.steamId64),
    );
    return items.map((i) => ({
      id: i.id,
      user: users.get(i.participant.$.user.$.steamId64)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
    }));
  },

  async getStage2LeaderboardAsync(query: LeaderboardQuery): Promise<LapLeaderboardItem[]> {
    const filter = getLeaderboardFilter(query, { lapCount: "DESC" });
    const [items] = await ctx.allOut.stage2Leaderboard.findAndCount(filter.query, filter.options);
    const users = await steamUsers.getUsersAsync(
      items.map((i) => i.participant.$.user.$.steamId64),
    );

    return items.map((i) => ({
      id: i.id,
      user: users.get(i.participant.$.user.$.steamId64)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
      lap: {
        count: i.lapCount,
        lastTimestamp: i.lastLapTimestamp,
      },
    }));
  },

  async getStage3LeaderboardAsync(query: LeaderboardQuery): Promise<LeaderboardItem[]> {
    const filter = getLeaderboardFilter(query, { prSeconds: "ASC" });
    const [items] = await ctx.allOut.stage3Leaderboard.findAndCount(filter.query, filter.options);
    const users = await steamUsers.getUsersAsync(
      items.map((i) => i.participant.$.user.$.steamId64),
    );
    return items.map((i) => ({
      id: i.id,
      user: users.get(i.participant.$.user.$.steamId64)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
    }));
  },

  async eventExistsAsync(eventId: number): Promise<boolean> {
    return !!(await ctx.allOut.events.findOne({ id: eventId }));
  },

  async stage1MapExistsAsync(mapId: number): Promise<boolean> {
    return !!(await ctx.allOut.stage1Maps.findOne({ id: mapId }));
  },

  async stage2MapExistsAsync(mapId: number): Promise<boolean> {
    return !!(await ctx.allOut.stage2Maps.findOne({ id: mapId }));
  },

  async stage3MapExistsAsync(mapId: number): Promise<boolean> {
    return !!(await ctx.allOut.stage3Maps.findOne({ id: mapId }));
  },

  async registrationExistsAsync(registration: Registration): Promise<boolean> {
    return !!(await ctx.allOut.participants.findOne({
      user: registration.userId,
      event: registration.eventId,
    }));
  },

  async canUsersRegister(eventId: number, userIds: number[]) {
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

    const userDivisions = await ctx.userDivisions.find({ user: { $in: userIds } });
    const userDivisionsMap = new Map<number, number[]>();
    userDivisions.forEach((ud) => {
      const userId = ud.user.id;
      let arr = userDivisionsMap.get(userId);
      if (!arr) {
        arr = [];
        userDivisionsMap.set(userId, arr);
      }

      arr.push(ud.division.id);
    });

    return new Map(
      userIds.map((uId) => [uId, userDivisionsMap.get(uId)!.some((dId) => divisionIds.has(dId))]),
    );
  },

  async canUserRegister(registration: Registration) {
    const userId = registration.userId;
    const result = await this.canUsersRegister(registration.eventId, [userId]);
    return result.get(userId)!;
  },

  async createEventAsync(event: CreateAllOutEvent): Promise<AllOutEventDetails> {
    const createdEvent = ctx.allOut.events.create(mapToDbAllOutEvent(event));
    await setStageMapsAsync(createdEvent, event);
    await ctx.saveAsync();
    return await this.getEventDetailsAsync(createdEvent.id);
  },

  async updateEventAsync(event: UpdateAllOutEvent): Promise<AllOutEventDetails> {
    const existingEvent = await ctx.allOut.events.findOneOrFail({ id: event.id });
    wrap(existingEvent).assign(mapToDbAllOutEvent(event));
    await setStageMapsAsync(existingEvent, event);
    await updateEventParticipantsAsync(existingEvent);
    await ctx.saveAsync();
    return await this.getEventDetailsAsync(existingEvent.id);
  },

  async registerAsync(registration: Registration): Promise<void> {
    if (await this.registrationExistsAsync(registration)) {
      return;
    }

    const participant = ctx.allOut.participants.create({
      user: registration.userId,
      event: registration.eventId,
    });

    const userDivisions = await ctx.userDivisions.find({ user: registration.userId });
    userDivisions.forEach((ud) => {
      ctx.allOut.participantDivisions.create({
        participant,
        division: ud.division,
      });
    });

    await ctx.saveAsync();
  },

  async deleteRegistrationAsync(registration: Registration): Promise<void> {
    const participant = await ctx.allOut.participants.findOneOrFail({
      user: registration.userId,
      event: registration.eventId,
    });

    ctx.em.remove(participant);
    await ctx.saveAsync();
  },

  async deleteEventAsync(eventId: number): Promise<void> {
    ctx.em.remove(await ctx.allOut.events.findOneOrFail({ id: eventId }));
    await ctx.saveAsync();
  },
};

function mapToDbAllOutEvent(event: CreateAllOutEvent | UpdateAllOutEvent) {
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
  newEvent: CreateAllOutEvent | UpdateAllOutEvent,
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
  maps: CreateTimeLimitedEventMap[],
  divisionsMap: Map<number, Division>,
) {
  const transformFn = (m: CreateTimeLimitedEventMap) => ({
    name: m.name,
    timeLimit: m.timeLimit,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setMapsAsync(ctx.allOut.stage1Maps, event, maps, transformFn, transformFn);
}

async function setStage2MapsAsync(
  event: AllOutEvent,
  maps: CreateEventMap[],
  divisionsMap: Map<number, Division>,
) {
  const transformFn = (m: CreateEventMap) => ({
    name: m.name,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setMapsAsync(ctx.allOut.stage2Maps, event, maps, transformFn, transformFn);
}

async function setStage3MapsAsync(
  event: AllOutEvent,
  maps: CreateEventMap[],
  divisionsMap: Map<number, Division>,
) {
  const transformFn = (m: CreateEventMap) => ({
    name: m.name,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setMapsAsync(ctx.allOut.stage3Maps, event, maps, transformFn, transformFn);
}

async function updateEventParticipantsAsync(event: AllOutEvent) {
  const participants = await ctx.allOut.participants.find({ event }, { populate: ["user.id"] });
  const canRegisterMap = await allOutRepository.canUsersRegister(
    event.id,
    participants.map((p) => p.user.id),
  );
  participants.forEach(async (p) => {
    if (!canRegisterMap.get(p.user.id)) {
      ctx.em.remove(p);
    }
  });
}

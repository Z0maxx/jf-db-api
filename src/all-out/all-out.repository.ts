import ctx from "@/db-context";
import { AllOutStage1Map } from "@/db-entities/AllOutStage1Map";
import { AllOutStage2Map } from "@/db-entities/AllOutStage2Map";
import { AllOutStage3Map } from "@/db-entities/AllOutStage3Map";
import { getLeaderboardFilter } from "@/mikro-filters";
import steamUsers from "@/steam/steam-users";
import {
  AllOutEventDetails,
  AllOutEventPreview,
  CreateAllOutEvent,
  CreateEventMap,
  CreateTimeLimitedEventMap,
  LapLeaderboardItem,
  LeaderboardItem,
  LeaderboardQuery,
  Registration,
  SteamUser,
  UpdateAllOutEvent,
} from "@/types";
import { EntityClass, wrap } from "@mikro-orm/core";

const allOutRepository = {
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
          "allOutStage1MapCollection.division.name",
          "allOutStage2MapCollection.division.name",
          "allOutStage3MapCollection.division.name",
        ],
      },
    );

    return {
      id: event.id,
      description: event.description,
      stage1: {
        description: event.stage1Description,
        start: event.stage1Start,
        end: event.stage1End,
        maps: event.allOutStage1MapCollection.getItems().map((m) => ({
          id: m.id,
          name: m.name,
          division: m.division.getEntity().name,
          timeLimit: m.timeLimit,
        })),
      },
      stage2: {
        description: event.stage2Description,
        start: event.stage2Start,
        end: event.stage2End,
        maps: event.allOutStage2MapCollection.getItems().map((m) => ({
          id: m.id,
          name: m.name,
          division: m.division.getEntity().name,
        })),
      },
      stage3: {
        description: event.stage3Description,
        start: event.stage3Start,
        end: event.stage3End,
        maps: event.allOutStage3MapCollection.getItems().map((m) => ({
          id: m.id,
          name: m.name,
          division: m.division.getEntity().name,
        })),
      },
    };
  },

  async getAllEventParticipantsAsync(eventId: number): Promise<SteamUser[]> {
    const participants = await ctx.allOut.participants.find(
      { event: eventId },
      { populate: ["user"] },
    );
    return await steamUsers.getUsersAsync(participants.map((p) => p.user.$.steamId64));
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery): Promise<LeaderboardItem[]> {
    const filter = getLeaderboardFilter(query, { prSeconds: "ASC" });
    const [items] = await ctx.allOut.stage1Leaderboard.findAndCount(filter.query, filter.options);
    const users = await steamUsers.getUsersAsync(items.map((i) => i.participant.$.user.$.steamId64));
    return items.map((i) => ({
      id: i.id,
      user: users.find((u) => i.participant.$.user.$.steamId64 === u.steamId64)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
    }));
  },

  async getStage2LeaderboardAsync(query: LeaderboardQuery): Promise<LapLeaderboardItem[]> {
    const filter = getLeaderboardFilter(query, { lapCount: "DESC" });
    const [items] = await ctx.allOut.stage2Leaderboard.findAndCount(filter.query, filter.options);
    const users = await steamUsers.getUsersAsync(items.map((i) => i.participant.$.user.$.steamId64));
    return items.map((i) => ({
      id: i.id,
      user: users.find((u) => i.participant.$.user.$.steamId64 === u.steamId64)!,
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
    const users = await steamUsers.getUsersAsync(items.map((i) => i.participant.$.user.$.steamId64));
    return items.map((i) => ({
      id: i.id,
      user: users.find((u) => i.participant.$.user.$.steamId64 === u.steamId64)!,
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

  async createEventAsync(event: CreateAllOutEvent): Promise<AllOutEventDetails> {
    const createdEvent = ctx.allOut.events.create(mapToDbAllOutEvent(event));
    await ctx.saveAsync();
    await setStage1MapsAsync(createdEvent.id, event.stage1.maps);
    await setStage2MapsAsync(createdEvent.id, event.stage2.maps);
    await setStage3MapsAsync(createdEvent.id, event.stage3.maps);
    await ctx.saveAsync();
    return await this.getEventDetailsAsync(createdEvent.id);
  },

  async updateEventAsync(event: UpdateAllOutEvent): Promise<AllOutEventDetails> {
    const existingEvent = await ctx.allOut.events.findOneOrFail({ id: event.id });
    wrap(existingEvent).assign(mapToDbAllOutEvent(event));
    await setStage1MapsAsync(existingEvent.id, event.stage1.maps);
    await setStage2MapsAsync(existingEvent.id, event.stage2.maps);
    await setStage3MapsAsync(existingEvent.id, event.stage3.maps);
    await ctx.saveAsync();
    return await this.getEventDetailsAsync(existingEvent.id);
  },

  async registerAsync(registration: Registration): Promise<void> {
    if (await this.registrationExistsAsync(registration)) {
      return;
    }

    const event = await ctx.allOut.events.findOneOrFail({ id: registration.eventId });
    const participant = ctx.allOut.participants.create({ user: registration.userId, event });
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
    ctx.em.remove(ctx.allOut.events.findOneOrFail({ id: eventId }));
    await ctx.saveAsync();
  },
};

export default allOutRepository;

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

async function setStage1MapsAsync(
  eventId: number,
  maps: CreateTimeLimitedEventMap[],
): Promise<void> {
  await setMapsAsync(eventId, AllOutStage1Map, maps);
}

async function setStage2MapsAsync(eventId: number, maps: CreateEventMap[]): Promise<void> {
  await setMapsAsync(eventId, AllOutStage2Map, maps);
}

async function setStage3MapsAsync(eventId: number, maps: CreateEventMap[]): Promise<void> {
  await setMapsAsync(eventId, AllOutStage3Map, maps);
}

async function setMapsAsync(eventId: number, EntityClass: EntityClass, maps: { name: string }[]) {
  const event = await ctx.allOut.events.findOneOrFail({ id: eventId });
  const existingMaps = await ctx.em.find(EntityClass, { event: eventId });
  const mapNames = maps.map((m) => m.name);
  const removedMaps = existingMaps.filter((m) => !mapNames.includes(m.name));
  removedMaps.forEach((r) => ctx.em.remove(r));
  const updatedMaps = existingMaps.filter((m) => mapNames.includes(m.name));
  updatedMaps.forEach((u) => {
    wrap(u).assign(maps.find((m) => m.name === u.name)!);
  });

  const updatedMapNames = updatedMaps.map((u) => u.name);
  const newMaps = maps.filter((m) => !updatedMapNames.includes(m.name));
  newMaps.forEach((n) =>
    ctx.em.create(EntityClass, {
      ...n,
      event,
    }),
  );

  await ctx.saveAsync();
}

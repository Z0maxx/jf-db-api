import { Loaded, Reference, wrap } from "@mikro-orm/core";

import { ctx } from "#/db-context";
import { Division } from "#/db-entities/Division";
import { MonthlyEvent } from "#/db-entities/MonthlyEvent";
import { MonthlyMap } from "#/db-entities/MonthlyMap";
import { MonthlyParticipant } from "#/db-entities/MonthlyParticipant";
import { User } from "#/db-entities/User";
import { setDivisionMapsAsync } from "#/helpers/division-map.helper";
import { CreateDivisionMapDto, Registration } from "#/types";

import { CreateMonthlyEventDto } from "./monthlies.types";

export const monthliesRepository = {
  async getAllEventsAsync() {
    return await ctx.monthlies.events.findAll();
  },

  async getEventByIdAsync(eventId: number) {
    return await ctx.monthlies.events.findOne(
      { id: eventId },
      { populate: ["monthlyMapCollection.division"] },
    );
  },

  async getParticipantAsync(eventId: number, user: User) {
    return await ctx.monthlies.participants.findOne({ event: eventId, user });
  },

  async getAllEventParticipantsAsync(eventId: number) {
    return await ctx.monthlies.participants.find(
      { event: eventId },
      { populate: ["division", "user"] },
    );
  },

  async getLeaderboardAsync(mapId: number) {
    const [items] = await ctx.monthlies.leaderboard.findAndCount(
      { map: mapId, participant: { resigned: false } },
      {
        populate: ["participant.user.steam64Id"],
        orderBy: { prSeconds: "ASC" },
      },
    );

    return items;
  },

  async mapExistsAsync(mapId: number) {
    return (await ctx.monthlies.maps.findOne({ id: mapId })) !== null;
  },

  async registrationExistsAsync(registration: Registration) {
    return !!(await ctx.monthlies.participants.findOne({
      user: registration.user,
      event: registration.eventId,
    }));
  },

  async usersHaveEventDivisionsAsync(eventId: number, users: Loaded<User, "divisionCollection">[]) {
    const event = await ctx.monthlies.events.findOneOrFail(
      { id: eventId },
      {
        populate: ["monthlyMapCollection.division.id"],
      },
    );

    const divisionIds = new Set<number>(event.monthlyMapCollection.$.map((m) => m.division.id));
    return new Map<number, boolean>(
      users.map(
        (u) => [u.id, u.divisionCollection.$.exists((d) => divisionIds.has(d.id))] as const,
      ),
    );
  },

  async userHasEventDivisionsAsync(eventId: number, user: Loaded<User, "divisionCollection">) {
    const result = await this.usersHaveEventDivisionsAsync(eventId, [user]);
    return result.get(user.id)!;
  },

  async createEventAsync(event: CreateMonthlyEventDto) {
    const createdEvent = ctx.monthlies.events.create(transformToDbMonthlyEvent(event));
    await setMapsAsync(createdEvent, event.maps);
    await ctx.saveAsync();
    return createdEvent.id;
  },

  async updateEventAsync(originalEvent: MonthlyEvent, event: CreateMonthlyEventDto) {
    wrap(originalEvent).assign(transformToDbMonthlyEvent(event));
    await setMapsAsync(originalEvent, event.maps);
    await updateEventParticipantsAsync(originalEvent);
    await ctx.saveAsync();
  },

  async registerAsync(registration: Registration) {
    if (await this.registrationExistsAsync(registration)) {
      return;
    }

    const user = registration.user;
    const event = await ctx.monthlies.events.findOneOrFail({ id: registration.eventId });
    const division = user.divisionCollection.$.find((d) => d.type === event.type)!;
    const participant = ctx.monthlies.participants.create({
      event,
      user,
      division,
    });

    this.setParticipantDivisionAsync(participant, division);
    await ctx.saveAsync();
  },

  async setLeaderboardItemAsync(item: {
    verified: boolean;
    map: MonthlyMap;
    participant: MonthlyParticipant;
    prSeconds: number;
    prTimestamp: Date;
  }) {
    const originalItem = await ctx.monthlies.leaderboard.findOne({
      map: item.map,
      participant: item.participant,
    });

    if (originalItem) {
      wrap(originalItem).assign(item);
    } else {
      ctx.monthlies.leaderboard.create(item);
    }

    await ctx.saveAsync();
  },

  async setParticipantDivisionAsync(participant: MonthlyParticipant, division: Division) {
    participant.division = Reference.create(division);
    await ctx.saveAsync();
  },

  async deleteRegistrationAsync(registration: Registration) {
    const participant = await ctx.monthlies.participants.findOneOrFail({
      user: registration.user,
      event: registration.eventId,
    });

    ctx.em.remove(participant);
    await ctx.saveAsync();
  },

  async resignAsync(registration: Registration) {
    const participant = await ctx.monthlies.participants.findOneOrFail({
      user: registration.user,
      event: registration.eventId,
    });

    participant.resigned = true;
    await ctx.saveAsync();
  },

  async deleteEventAsync(event: MonthlyEvent) {
    ctx.em.remove(event);
    await ctx.saveAsync();
  },

  async cancelEventAsync(event: MonthlyEvent) {
    event.canceled = true;
    await ctx.saveAsync();
  },
};

function transformToDbMonthlyEvent(event: CreateMonthlyEventDto) {
  return {
    type: event.type,
    description: event.description,
    start: event.start,
    end: event.end,
  };
}

async function setMapsAsync(event: MonthlyEvent, maps: CreateDivisionMapDto[]) {
  const divisionIds = maps.map((m) => m.divisionId);
  const divisions = await ctx.divisions.find({ id: { $in: divisionIds } });
  const divisionsMap = new Map(divisions.map((d) => [d.id, d]));
  const transformFn = (m: CreateDivisionMapDto) => ({
    name: m.name,
    division: divisionsMap.get(m.divisionId)!,
    event,
  });

  await setDivisionMapsAsync(ctx.monthlies.maps, event, maps, transformFn, transformFn);
}

async function updateEventParticipantsAsync(event: MonthlyEvent) {
  const participants = await ctx.monthlies.participants.find(
    { event },
    { populate: ["user.divisionCollection"] },
  );

  const canParticipate = await monthliesRepository.usersHaveEventDivisionsAsync(
    event.id,
    participants.map((p) => p.user.$),
  );

  participants.forEach(async (p) => {
    if (!canParticipate.get(p.user.id)) {
      ctx.em.remove(p);
    }
  });
}

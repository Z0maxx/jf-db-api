import { ctx } from "#/db-context";
import { LanEvent } from "#/db-entities/LanEvent";
import { LanMapType, TLanMapType } from "#/db-entities/LanMap";
import { LanParticipant } from "#/db-entities/LanParticipant";
import { CreateLanEventDto, CreateLanParticipantDto } from "#/types";
import { wrap } from "@mikro-orm/core";

export const lanRepository = {
  async getAllEventsAsync() {
    return await ctx.lan.events.findAll();
  },

  async getEventByIdAsync(eventId: number) {
    return await ctx.lan.events.findOne(
      { id: eventId },
      { populate: ["lanMapCollection", "lanParticipantCollection.user.divisionCollection"] },
    );
  },

  async getParticipantByIdAsync(participantId: number) {
    return ctx.lan.participants.findOne({ id: participantId });
  },

  async createEventAsync(event: CreateLanEventDto) {
    const createdEvent = ctx.lan.events.create(transformToDbLanEvent(event));
    await setMapsAsync(createdEvent, event);
    await setParticipantsAsync(createdEvent, event.participants);
    await ctx.saveAsync();
    return createdEvent.id;
  },

  async updateEventAsync(originalEvent: LanEvent, event: CreateLanEventDto) {
    wrap(originalEvent).assign(transformToDbLanEvent(event));
    await setMapsAsync(originalEvent, event);
    await setParticipantsAsync(originalEvent, event.participants);
    await ctx.saveAsync();
  },

  async disqualifyParticipantAsync(participant: LanParticipant) {
    participant.disqualified = true;
    await ctx.saveAsync();
  },

  async cancelEventAsync(event: LanEvent) {
    event.canceled = true;
    await ctx.saveAsync();
  },
};

async function setMapsAsync(event: LanEvent, newEvent: CreateLanEventDto) {
  await setMapsByTypeAsync(event, newEvent.maps.soldier, LanMapType.SOLDIER);
  await setMapsByTypeAsync(event, newEvent.maps.demoman, LanMapType.DEMOMAN);
}

async function setMapsByTypeAsync(event: LanEvent, maps: string[], type: TLanMapType) {
  const mapsSet = new Set<string>(maps);
  const existing = await ctx.lan.maps.find({ event, type });
  const deleted = existing.filter((e) => !mapsSet.has(e.name));
  deleted.forEach((d) => ctx.em.remove(d));
  mapsSet.values().forEach((m) =>
    ctx.lan.maps.create({
      name: m,
      type,
      event,
    }),
  );
}

async function setParticipantsAsync(event: LanEvent, participants: CreateLanParticipantDto[]) {
  const participantsMap = new Map<number, CreateLanParticipantDto>(
    participants.map((p) => [p.userId, p]),
  );
  console.log(participantsMap);
  const existing = await ctx.lan.participants.find({ event }, { populate: ["user"] });
  console.log(existing.map((e) => e.user.id));
  const deleted = existing.filter((e) => !participantsMap.get(e.user.id));
  deleted.forEach((d) => ctx.em.remove(d));
  const updated = existing.filter((e) => !deleted.includes(e));
  updated.forEach((u) => {
    u.alias = participantsMap.get(u.user.id)!.alias ?? "";
    participantsMap.delete(u.user.id);
  });

  participantsMap.values().forEach((p) =>
    ctx.lan.participants.create({
      alias: p.alias ?? "",
      user: p.userId,
      event,
    }),
  );
}

function transformToDbLanEvent(event: CreateLanEventDto) {
  return {
    name: event.name,
    start: event.start,
    end: event.end ?? null,
    description: event.description,
    trailerUrl: event.trailerUrl ?? "",
    posterUrl: event.posterUrl ?? "",
  };
}

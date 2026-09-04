import {
  CreateAllOutEvent,
  CreateEventMap,
  CreateTimeLimitedEventMap,
  LeaderboardQuery,
  Registration,
  UpdateAllOutEvent,
} from "@/types";
import allOutRepository from "./all-out.repository";
import {
  EventNotFoundError,
  MapNotFoundError,
  RegistrationNotFoundError,
  ValidationError,
} from "@/errors";

const allOutService = {
  async getEventDetailsAsync(eventId: number) {
    await checkEventExistsAsync(eventId);
    return await allOutRepository.getEventDetailsAsync(eventId);
  },

  async getAllEventParticipantsAsync(eventId: number) {
    await checkEventExistsAsync(eventId);
    return await allOutRepository.getAllEventParticipantsAsync(eventId);
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery) {
    await checkStage1MapExistsAsync(query.mapId);
    return await allOutRepository.getStage1LeaderboardAsync(query);
  },

  async getStage2LeaderboardAsync(query: LeaderboardQuery) {
    await checkStage2MapExistsAsync(query.mapId);
    return await allOutRepository.getStage2LeaderboardAsync(query);
  },

  async getStage3LeaderboardAsync(query: LeaderboardQuery) {
    await checkStage3MapExistsAsync(query.mapId);
    return await allOutRepository.getStage3LeaderboardAsync(query);
  },

  async registrationExistsAsync(registration: Registration) {
    await checkEventExistsAsync(registration.eventId);
    return await allOutRepository.registrationExistsAsync(registration);
  },

  async createEventAsync(event: CreateAllOutEvent) {
    checkTimes(event);
    return await allOutRepository.createEventAsync(event);
  },

  async updateEventAsync(event: UpdateAllOutEvent) {
    await checkEventExistsAsync(event.id);
    checkTimes(event);
    return await allOutRepository.updateEventAsync(event);
  },

  async registerAsync(registration: Registration) {
    await checkEventExistsAsync(registration.eventId);
    await allOutRepository.registerAsync(registration);
  },

  async deleteRegistrationAsync(registration: Registration) {
    await checkEventExistsAsync(registration.eventId);
    await checkRegistrationExistsAsync(registration);
    await allOutRepository.deleteRegistrationAsync(registration);
  },

  async deleteEventAsync(eventId: number) {
    await checkEventExistsAsync(eventId);
    await allOutRepository.deleteEventAsync(eventId);
  },
};

export default allOutService;

function checkTimes(event: CreateAllOutEvent | UpdateAllOutEvent) {
  const { stage1, stage2, stage3 } = event;
  const order = [stage1, stage2, stage3]
    .map((stage, idx) => [
      { name: `Stage ${idx + 1} start time`, time: stage.start },
      { name: `Stage ${idx + 1} end time`, time: stage.end },
    ])
    .flat();

  console.log(order);

  for (let i = 0; i < order.length - 1; i++) {
    const before = order.slice(i + 1).find((other) => other.time < order[i].time);
    if (before) {
      throw new ValidationError(`${before.name} cannot be earlier than ${order[i].name}`);
    }
  }
}

async function checkEventExistsAsync(eventId: number) {
  if (!(await allOutRepository.eventExistsAsync(eventId))) {
    throw new EventNotFoundError(eventId);
  }
}

async function checkStage1MapExistsAsync(mapId: number) {
  if (!(await allOutRepository.stage1MapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkStage2MapExistsAsync(mapId: number) {
  if (!(await allOutRepository.stage2MapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkStage3MapExistsAsync(mapId: number) {
  if (!(await allOutRepository.stage3MapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkRegistrationExistsAsync(registration: Registration) {
  if (!(await allOutRepository.registrationExistsAsync(registration))) {
    throw new RegistrationNotFoundError(registration);
  }
}

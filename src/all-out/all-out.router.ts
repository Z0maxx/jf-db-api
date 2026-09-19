import {
  CreateAllOutEventSchema,
  LeaderboardQuerySchema,
  UpdateAllOutEventSchema,
} from "#/schemas";
import express from "express";
import { allOutService } from "./all-out.service";
import { allOutRepository } from "./all-out.repository";
import { id } from "#/middlewares/id.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { leaderboardQuery } from "#/middlewares/leaderboard-query.middleware";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import { userCan } from "#/middlewares/user-can.middleware";

export const allOutRouter = express.Router();

allOutRouter.get("/events", async (_, res) => {
  res.status(200).json(await allOutRepository.getAllEventPreviewsAsync());
});

allOutRouter.get("/events/:eventId", id("eventId"), async (req, res) => {
  res.status(200).json(await allOutService.getEventDetailsAsync(req.ids.eventId));
});

allOutRouter.get("/events/:eventId/participants", id("eventId"), async (req, res) => {
  res.status(200).json(await allOutService.getAllEventParticipantsAsync(req.ids.eventId));
});

allOutRouter.get("/events/:eventId/registration", loggedIn, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    userId: req.user!.id,
  };

  res.status(200).json(await allOutService.getRegistrationDetailsAsync(registration));
});

allOutRouter.get("/leaderboard/stage-1", leaderboardQuery, async (req, res) => {
  res
    .status(200)
    .json(await allOutService.getStage1LeaderboardAsync(LeaderboardQuerySchema.parse(req.query)));
});

allOutRouter.get("/leaderboard/stage-2", leaderboardQuery, async (req, res) => {
  res
    .status(200)
    .json(await allOutService.getStage2LeaderboardAsync(LeaderboardQuerySchema.parse(req.query)));
});

allOutRouter.get("/leaderboard/stage-3", leaderboardQuery, async (req, res) => {
  res
    .status(200)
    .json(await allOutService.getStage3LeaderboardAsync(LeaderboardQuerySchema.parse(req.query)));
});

allOutRouter.post(
  "/events",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateAllOutEventSchema),
  async (req, res) => {
    res
      .status(201)
      .json(await allOutService.createEventAsync(CreateAllOutEventSchema.parse(req.body)));
  },
);

allOutRouter.post(
  "/events/:eventId/cancel",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await allOutService.cancelEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

allOutRouter.post("/events/:eventId/registration", loggedIn, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    userId: req.user!.id,
  };

  await allOutService.registerAsync(registration);
  res.status(204).send();
});

allOutRouter.post("/events/:eventId/resign", loggedIn, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    userId: req.user!.id,
  };

  await allOutService.resignOrDeleteRegistrationAsync(registration);
  res.status(204).send();
});

allOutRouter.put(
  "/events",
  loggedIn,
  userCan("manage events"),
  bodySchema(UpdateAllOutEventSchema),
  async (req, res) => {
    res
      .status(200)
      .send(await allOutService.updateEventAsync(UpdateAllOutEventSchema.parse(req.body)));
  },
);

allOutRouter.delete(
  "/events/:eventId",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await allOutService.deleteEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

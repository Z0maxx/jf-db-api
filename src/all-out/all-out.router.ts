import {
  CreateAllOutEventSchema,
  LeaderboardQuerySchema,
  UpdateAllOutEventSchema,
} from "@/schemas";
import express from "express";
import allOutService from "./all-out.service";
import allOutRepository from "./all-out.repository";
import { id } from "@/middlewares/id.middleware";
import { authenticate } from "@/middlewares/authenticate.middleware";
import { leaderboardQuery } from "@/middlewares/leaderboard-query.middleware";
import { admin } from "@/middlewares/admin.middleware";
import { bodySchema } from "@/middlewares/body-schema.middleware";

const allOutRouter = express.Router();

allOutRouter.get("/events", async (_, res) => {
  res.status(200).json(await allOutRepository.getAllEventPreviewsAsync());
});

allOutRouter.get("/events/:eventId", id("eventId"), async (req, res) => {
  res.status(200).json(await allOutService.getEventDetailsAsync(req.ids.eventId));
});

allOutRouter.get("/events/:eventId/participants", id("eventId"), async (req, res) => {
  res.status(200).json(await allOutService.getAllEventParticipantsAsync(req.ids.eventId));
});

allOutRouter.get("/events/:eventId/registration", authenticate, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    userId: req.user!.id,
  };

  res.status(200).json({ isRegistered: await allOutService.registrationExistsAsync(registration) });
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
  authenticate,
  admin,
  bodySchema(CreateAllOutEventSchema),
  async (req, res) => {
    res
      .status(201)
      .json(await allOutService.createEventAsync(CreateAllOutEventSchema.parse(req.body)));
  },
);

allOutRouter.post(
  "/events/:eventId/registration",
  authenticate,
  id("eventId"),
  async (req, res) => {
    const registration = {
      eventId: req.ids.eventId,
      userId: req.user!.id,
    };

    await allOutService.registerAsync(registration);
    res.status(204).send();
  },
);

allOutRouter.put(
  "/events",
  authenticate,
  admin,
  bodySchema(UpdateAllOutEventSchema),
  async (req, res) => {
    res
      .status(200)
      .send(await allOutService.updateEventAsync(UpdateAllOutEventSchema.parse(req.body)));
  },
);

allOutRouter.delete(
  "/events/:eventId/registration",
  authenticate,
  id("eventId"),
  async (req, res) => {
    const registration = {
      eventId: req.ids.eventId,
      userId: req.user!.id,
    };

    await allOutService.deleteRegistrationAsync(registration);
    res.status(204).send();
  },
);

allOutRouter.delete("/events/:eventId", authenticate, admin, id("eventId"), async (req, res) => {
  await allOutService.deleteEventAsync(req.ids.eventId);
  res.status(204).send();
});

export default allOutRouter;

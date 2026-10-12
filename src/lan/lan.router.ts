import { bodySchema } from "#/middlewares/body-schema.middleware";
import { id } from "#/middlewares/id.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { CreateLanEventSchema } from "#/schemas";
import express from "express";

import { lanService } from "./lan.service";

export const lanRouter = express.Router();

lanRouter.get("/events", async (_, res) => {
  res.status(200).json(await lanService.getAllEventPreviewsAsync());
});

lanRouter.get("/events/:eventId", id("eventId"), async (req, res) => {
  res.status(200).json(await lanService.getEventDetailsAsync(req.ids.eventId));
});

lanRouter.post(
  "/events",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateLanEventSchema),
  async (req, res) => {
    res.status(201).json(await lanService.createEventAsync(CreateLanEventSchema.parse(req.body)));
  },
);

lanRouter.put(
  "/events/:eventId",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateLanEventSchema),
  id("eventId"),
  async (req, res) => {
    res
      .status(200)
      .json(
        await lanService.updateEventAsync(req.ids.eventId, CreateLanEventSchema.parse(req.body)),
      );
  },
);

lanRouter.post(
  "/events/:eventId/cancel",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await lanService.cancelEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

lanRouter.post(
  "/participants/:participantId/disqualify",
  loggedIn,
  userCan("manage events"),
  id("participantId"),
  async (req, res) => {
    await lanService.disqualifyParticipant(req.ids.participantId);
    res.status(204).send();
  },
);

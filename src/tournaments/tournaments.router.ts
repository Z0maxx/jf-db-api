import express from "express";

import { AppError } from "#/errors";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { id } from "#/middlewares/id.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { initSse } from "#/sse";

import {
  CreateTournamentEventSchema,
  SetTournamentMatchupsSchema,
  SetTournamentMatchupWinnerSchema,
} from "./tournaments.schemas";
import { tournamentsService } from "./tournaments.service";

export const tournamentsRouter = express.Router();

tournamentsRouter.get("/events", async (_, res) => {
  res.status(200).json(await tournamentsService.getAllEventPreviewsAsync());
});

tournamentsRouter.get("/events/:eventId", id("eventId"), async (req, res) => {
  res.status(200).json(await tournamentsService.getEventDetailsAsync(req.ids.eventId));
});

tournamentsRouter.get("/events/:eventId/brackets", id("eventId"), async (req, res) => {
  const sse = initSse(res);
  try {
    const subscriberId = await tournamentsService.subscribeToBracketsAsync(
      req.ids.eventId,
      (items) => {
        sse.send("Items", items);
      },
    );

    sse.onClose = () => tournamentsService.unsubscribeFromBrackets(subscriberId);
  } catch (err) {
    console.log(err);
    if (err instanceof AppError) {
      sse.send("Error", getAppError(err as AppError));
    } else {
      sse.send("Error", "Something went wrong");
    }

    sse.close();
  }
});

tournamentsRouter.post(
  "/events",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateTournamentEventSchema),
  async (req, res) => {
    res
      .status(201)
      .json(await tournamentsService.createEventAsync(CreateTournamentEventSchema.parse(req.body)));
  },
);

tournamentsRouter.post(
  "/events/:eventId/set-brackets",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  bodySchema(SetTournamentMatchupsSchema),
  async (req, res) => {
    await tournamentsService.setMatchupsAsync(
      req.ids.eventId,
      SetTournamentMatchupsSchema.parse(req.body),
    );
    return res.status(204).send();
  },
);

tournamentsRouter.post(
  "/set-matchup-winner",
  loggedIn,
  userCan("manage events"),
  bodySchema(SetTournamentMatchupWinnerSchema),
  async (req, res) => {
    await tournamentsService.setMatchupWinnerAsync(
      SetTournamentMatchupWinnerSchema.parse(req.body),
    );
    res.status(204).send();
  },
);

tournamentsRouter.post(
  "/events/:eventId/cancel",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await tournamentsService.cancelEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

tournamentsRouter.post(
  "/participants/:participantId/disqualify",
  loggedIn,
  userCan("manage events"),
  id("participantId"),
  async (req, res) => {
    await tournamentsService.disqualifyParticipantAsync(req.ids.participantId);
    res.status(204).send();
  },
);

tournamentsRouter.put(
  "/events/:eventId",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateTournamentEventSchema),
  id("eventId"),
  async (req, res) => {
    res
      .status(200)
      .json(
        await tournamentsService.updateEventAsync(
          req.ids.eventId,
          CreateTournamentEventSchema.parse(req.body),
        ),
      );
  },
);

tournamentsRouter.delete(
  "/events/:eventId",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await tournamentsService.deleteEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

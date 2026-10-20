import express from "express";

import { AppError } from "#/errors";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { id } from "#/middlewares/id.middleware";
import { leaderboardQuery } from "#/middlewares/leaderboard-query.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { LeaderboardQuerySchema } from "#/schemas";
import { initSse } from "#/sse";

import { CreateMonthlyEventSchema, MonthlyTimeSubmissionSchema } from "./monthlies.schemas";
import { monthliesService } from "./monthlies.service";

export const monthliesRouter = express.Router();

monthliesRouter.get("/events", async (_, res) => {
  res.status(200).json(await monthliesService.getAllEventPreviewsAsync());
});

monthliesRouter.get("/events/:eventId", id("eventId"), async (req, res) => {
  res.status(200).json(await monthliesService.getEventDetailsAsync(req.ids.eventId));
});

monthliesRouter.get("/events/:eventId/participants", id("eventId"), async (req, res) => {
  res.status(200).json(await monthliesService.getAllEventParticipantsAsync(req.ids.eventId));
});

monthliesRouter.get("/events/:eventId/registration", loggedIn, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    user: req.user!,
  };

  res.status(200).json(await monthliesService.getRegistrationDetailsAsync(registration));
});

monthliesRouter.get("/leaderboard", leaderboardQuery, async (req, res) => {
  const query = LeaderboardQuerySchema.parse(req.query);
  const sse = initSse(res);
  try {
    const subscriberId = await monthliesService.subscribeToLeaderboardAsync(query, (items) => {
      sse.send("Items", items);
    });

    sse.onClose = () => monthliesService.unsubscribeFromLeaderboard(subscriberId);
  } catch (err) {
    if (err instanceof AppError) {
      sse.send("Error", getAppError(err as AppError));
    } else {
      sse.send("Error", "Something went wrong");
    }

    sse.close();
  }
});

monthliesRouter.post(
  "/events",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateMonthlyEventSchema),
  async (req, res) => {
    res
      .status(201)
      .json(await monthliesService.createEventAsync(CreateMonthlyEventSchema.parse(req.body)));
  },
);

monthliesRouter.post(
  "/events/:eventId/cancel",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await monthliesService.cancelEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

monthliesRouter.post("/events/:eventId/registration", loggedIn, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    user: req.user!,
  };

  await monthliesService.registerAsync(registration);
  res.status(204).send();
});

monthliesRouter.post("/events/:eventId/resign", loggedIn, id("eventId"), async (req, res) => {
  const registration = {
    eventId: req.ids.eventId,
    user: req.user!,
  };

  await monthliesService.resignOrDeleteRegistrationAsync(registration);
  res.status(204).send();
});

monthliesRouter.post(
  "/events/:eventId/submit-time",
  loggedIn,
  id("eventId"),
  bodySchema(MonthlyTimeSubmissionSchema),
  async (req, res) => {
    const sse = initSse(res);
    const submission = {
      eventId: req.ids.eventId,
      timeSeconds: MonthlyTimeSubmissionSchema.parse(req.body).timeSeconds,
    };

    try {
      const result = await monthliesService.submitTimeAsync(req.user!, submission);
      sse.send("Result", result);
    } catch (err) {
      console.log(err);
      if (err instanceof AppError) {
        sse.send("Error", getAppError(err as AppError));
      } else {
        sse.send("Error", "Something went wrong");
      }
    }

    sse.close();
  },
);

monthliesRouter.put(
  "/events/:eventId",
  loggedIn,
  userCan("manage events"),
  bodySchema(CreateMonthlyEventSchema),
  id("eventId"),
  async (req, res) => {
    res
      .status(200)
      .json(
        await monthliesService.updateEventAsync(
          req.ids.eventId,
          CreateMonthlyEventSchema.parse(req.body),
        ),
      );
  },
);

monthliesRouter.delete(
  "/events/:eventId",
  loggedIn,
  userCan("manage events"),
  id("eventId"),
  async (req, res) => {
    await monthliesService.deleteEventAsync(req.ids.eventId);
    res.status(204).send();
  },
);

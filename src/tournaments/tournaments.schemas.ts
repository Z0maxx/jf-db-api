import z from "zod";

import { TournamentEventType } from "#/db-entities/TournamentEvent";

export const CreateTournamentParticipantSchema = z.object({
  userId: z.number().positive(),
  alias: z.string().max(30).optional(),
});

export const CreateTournamentEventSchema = z.object({
  type: z.enum(Object.values(TournamentEventType)),
  description: z.string().nonempty(),
  start: z.coerce.date(),
  maps: z.array(z.string().nonempty().max(100)),
  participants: z.array(CreateTournamentParticipantSchema),
});

export const SetTournamentMatchupsSchema = z.object({
  format: z.enum(["linear", "alternating"]),
  matchups: z.array(
    z.object({
      participantIds: z.array(z.number().positive()).length(2),
    }),
  ),
});

export const SetTournamentMatchupWinnerSchema = z.object({
  matchupId: z.number().positive(),
  winnerIndex: z.union([z.literal(0), z.literal(1)]),
});

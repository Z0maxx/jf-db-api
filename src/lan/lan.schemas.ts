import z from "zod";

export const CreateLanParticipantSchema = z.object({
  userId: z.number().positive(),
  alias: z.string().optional(),
});

export const CreateLanEventSchema = z.object({
  name: z.string().nonempty(),
  start: z.coerce.date(),
  end: z.coerce.date().optional(),
  description: z.string().nonempty(),
  trailerUrl: z.url().optional(),
  posterUrl: z.url().optional(),
  participants: z.array(CreateLanParticipantSchema),
  maps: z.object({
    soldier: z.array(z.string().nonempty()),
    demoman: z.array(z.string().nonempty()),
  }),
});

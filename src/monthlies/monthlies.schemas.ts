import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { CreateDivisionMapSchema } from "#/schemas";
import z from "zod";

export const CreateMonthlyEventSchema = z.object({
  type: z.enum(Object.values(MonthlyEventType)),
  description: z.string().nonempty(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  maps: z.array(CreateDivisionMapSchema),
});

export const MonthlyTimeSubmissionSchema = z.object({
  eventId: z.number().positive(),
  time: z.number().optional(),
});

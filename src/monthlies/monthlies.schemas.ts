import z from "zod";

import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { CreateDivisionMapSchema } from "#/schemas";

export const CreateMonthlyEventSchema = z.object({
  type: z.enum(Object.values(MonthlyEventType)),
  description: z.string().nonempty(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  maps: z.array(CreateDivisionMapSchema),
});

export const MonthlyTimeSubmissionSchema = z.object({
  details: z
    .object({
      timeSeconds: z.number().positive(),
      tempusServerId: z.number().positive(),
    })
    .optional(),
});

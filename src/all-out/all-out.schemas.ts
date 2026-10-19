import z from "zod";

import { CreateDivisionMapSchema, CreateTimeLimitedDivisionMapSchema } from "#/schemas";

function CreateAllOutEventStageSchema<T extends typeof CreateDivisionMapSchema>(map: T) {
  return z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    description: z.string().optional(),
    maps: z.array(map),
  });
}

export const CreateAllOutEventSchema = z.object({
  description: z.string().nonempty(),
  stage1: CreateAllOutEventStageSchema(CreateTimeLimitedDivisionMapSchema),
  stage2: CreateAllOutEventStageSchema(CreateDivisionMapSchema),
  stage3: CreateAllOutEventStageSchema(CreateDivisionMapSchema),
});

import z from "zod";
import { DivisionType } from "./db-entities/Division";

export const DivisionSchema = z.object({
  type: z.enum(Object.values(DivisionType)),
  name: z.string().nonempty(),
  color: z.string().length(6),
});

export const GeneralEventSchema = z.object({
  id: z.number().positive(),
  description: z.string().nonempty(),
  start: z.coerce.date(),
  end: z.coerce.date(),
});

export const CreateEventMapSchema = z.object({
  name: z.string().nonempty().max(50),
  divisionId: z.number().positive(),
});

export const CreateTimeLimitedEventMapSchema = z.object({
  ...CreateEventMapSchema.shape,
  timeLimit: z.number().positive(),
});

function CreateAllOutEventStageSchema<T extends typeof CreateEventMapSchema>(map: T) {
  return z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    description: z.string().optional(),
    maps: z.array(map),
  });
}

export const CreateAllOutEventSchema = z.object({
  description: z.string().nonempty(),
  stage1: CreateAllOutEventStageSchema(CreateTimeLimitedEventMapSchema),
  stage2: CreateAllOutEventStageSchema(CreateEventMapSchema),
  stage3: CreateAllOutEventStageSchema(CreateEventMapSchema),
});

export const UpdateAllOutEventSchema = z.object({
  id: z.number().positive(),
  ...CreateAllOutEventSchema.shape,
});

export const LeaderboardQuerySchema = z.object({
  mapId: z.coerce.number().positive(),
  page: z.coerce.number().positive(),
  pageSize: z.coerce.number().positive(),
});

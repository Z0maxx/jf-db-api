import z from "zod";

export const CreateDivisionMapSchema = z.object({
  name: z.string().nonempty().max(50),
  divisionId: z.number().positive(),
});

export const CreateTimeLimitedDivisionMapSchema = z.object({
  ...CreateDivisionMapSchema.shape,
  timeLimit: z.number().positive(),
});

export const LeaderboardQuerySchema = z.object({
  mapId: z.coerce.number().positive(),
  page: z.coerce.number().positive(),
  pageSize: z.coerce.number().positive(),
});

export const TempusIdSchema = z.object({
  tempusId: z.number().positive(),
});

export const UserQuerySchema = z.object({
  query: z.string().nonempty(),
});

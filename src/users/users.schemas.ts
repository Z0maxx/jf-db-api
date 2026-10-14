import z from "zod";

export const SetUserDivisionsSchema = z.object({
  userId: z.number().positive(),
  soldierDivisionId: z.number().positive(),
  demomanDivisionId: z.number().positive(),
});

export const SetUserRoleSchema = z.object({
  userId: z.number().positive(),
  roleId: z.number().positive(),
});

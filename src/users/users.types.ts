import { Division } from "#/db-entities/Division";
import z from "zod";

import { SetUserDivisionsSchema, SetUserRoleSchema } from "./users.schemas";

export type SetUserDivisions = z.infer<typeof SetUserDivisionsSchema>;

export type SetUserRole = z.infer<typeof SetUserRoleSchema>;

export type UserDivisions = {
  soldierDivision: Division;
  demomanDivision: Division;
};

import z from "zod";

import { ClaimDto } from "#/claims/claims.types";

import { CreateRoleSchema } from "./roles.schemas";

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export type RoleDto = {
  name: string;
  claims: ClaimDto[];
};

export type RoleValidator<T> = {
  validate(errors: string[], roles: CreateRoleDto[]): void;
  getMessages(items: T[]): string[];
};

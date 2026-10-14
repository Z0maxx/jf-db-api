import z from "zod";

import { DivisionSchema, DivisionsListSchema } from "./divisions.schemas";

export type DivisionDto = z.infer<typeof DivisionSchema>;

export type DivisionsListDto = z.infer<typeof DivisionsListSchema>;

export type DivisionValidator = {
  validate(errors: string[], divisions: DivisionsListDto): void;
  getMessages(divisions: DivisionsListDto): string[];
};

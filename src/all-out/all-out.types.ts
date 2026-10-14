import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { DivisionMapDto, MapsDto, TimeLimitedDivisionMapDto } from "#/types";
import z from "zod";

import { CreateAllOutEventSchema } from "./all-out.schemas";

export type AllOutEventPreviewDto = {
  id: number;
  start: Date;
  end: Date;
  canceled: boolean;
};

export type CreateAllOutEventDto = z.infer<typeof CreateAllOutEventSchema>;

export type AllOutStageDto<TDivisionMap extends DivisionMapDto> = {
  description: string;
  start: Date;
  end: Date;
  maps: MapsDto<TDivisionMap>;
};

export type AllOutEventDetailsDto = {
  id: number;
  canceled: boolean;
  description: string;
  stage1: AllOutStageDto<TimeLimitedDivisionMapDto>;
  stage2: AllOutStageDto<DivisionMapDto>;
  stage3: AllOutStageDto<DivisionMapDto>;
};

export type AllOutEventValidator<T> = {
  validate(errors: string[], event: CreateAllOutEventDto, originalEvent?: AllOutEvent): void;
  getMessages(items: T[]): string[];
};

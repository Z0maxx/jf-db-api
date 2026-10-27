import { TUserTempusIdStatus } from "#/db-entities/User";

export type TempusIdVerificationResult = {
  status: TUserTempusIdStatus;
  tempusId: number;
};

export type TempusCompletionQuery = {
  mapName: string;
  tempusId: number;
  type: "soldier" | "demoman";
};

export type TempusCompletionResult = {
  prSeconds: number;
  prTimestamp: Date;
};

export type TempusServer = {
  id: number;
  name: string;
};

export type TempusDemo = {
  start: Date;
  mapName: string;
  url: string | null;
  fileName: string;
};

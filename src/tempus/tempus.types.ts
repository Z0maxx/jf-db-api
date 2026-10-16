import { TUserTempusIdStatus } from "#/db-entities/User";

export type TempusIdVerificationResult = {
  status: TUserTempusIdStatus;
  tempusId: number;
};

export type TempusCompletionQuery = {
  mapName: string;
  tempusId: string;
  type: "soldier" | "demoman";
};

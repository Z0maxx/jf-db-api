import { TUserTempusIdStatus } from "#/db-entities/User";

export type TempusIdVerificationResult = {
  status: TUserTempusIdStatus;
  tempusId: number;
};

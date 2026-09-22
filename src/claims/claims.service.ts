import { ClaimDto } from "#/types";
import { claimsRepository } from "./claims.repository";

export const claimsService = {
  async getAllClaimsAsync(): Promise<ClaimDto[]> {
    const claims = await claimsRepository.getAllClaimsAsync();
    return claims.map(({ id, name }) => ({ id, name }));
  },
};

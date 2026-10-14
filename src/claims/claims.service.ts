import { claimsRepository } from "./claims.repository";
import { ClaimDto } from "./claims.types";

export const claimsService = {
  async getAllClaimsAsync(): Promise<ClaimDto[]> {
    const claims = await claimsRepository.getAllClaimsAsync();
    return claims.map(({ id, name }) => ({ id, name }));
  },
};

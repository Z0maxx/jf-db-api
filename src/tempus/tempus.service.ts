import { getCompletionAsync } from "./tempus-completion";
import { verifyTempusIdAsync } from "./tempus-id-verifier";

export const tempusService = {
  verifyTempusIdAsync,
  getCompletionAsync,
};

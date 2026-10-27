import { getCompletionAsync } from "./tempus-completion";
import { verifyTempusIdAsync } from "./tempus-id-verifier";
import { getServerDemosAsync } from "./tempus-server-demos";
import { getServersAsync } from "./tempus-servers";

export const tempusService = {
  verifyTempusIdAsync,
  getCompletionAsync,
  getServersAsync,
  getServerDemosAsync,
};

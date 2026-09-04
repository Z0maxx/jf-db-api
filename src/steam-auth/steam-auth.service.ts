import { AppUser } from "@/types";
import jwt from "jsonwebtoken";

const openIdEndpoint = "https://steamcommunity.com/openid/login";

const steamAuthService = {
  getLoginUrl(): string {
    const config = getConfig();
    const params = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": config.returnUrl,
      "openid.realm": new URL(config.returnUrl).origin,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });

    return `${openIdEndpoint}?${params}`;
  },

  async verifyCallbackAsync(query: URLSearchParams): Promise<string> {
    const config = getConfig();
    if (query.get("openid.mode") !== "id_res") {
      throw new Error("Steam login was cancelled or did not complete");
    }

    if (query.get("openid.return_to") !== config.returnUrl) {
      throw new Error("Steam login return URL does not match the configured URL");
    }

    const claimedId = query.get("openid.claimed_id") ?? "";
    const steamIdMatch = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})\/?$/.exec(claimedId);
    if (!steamIdMatch) {
      throw new Error("Steam did not return a valid SteamID64");
    }

    const verificationParams = new URLSearchParams(query);
    verificationParams.set("openid.mode", "check_authentication");
    const response = await fetch(openIdEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verificationParams,
    });

    if (!response.ok || !(await response.text()).includes("is_valid:true")) {
      throw new Error("Steam could not verify the login response");
    }

    return steamIdMatch[1];
  },

  createToken(user: AppUser): string {
    const config = getConfig();
    return jwt.sign(user, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  },
};

export default steamAuthService;

function getConfig() {
  return {
    returnUrl: process.env.API_URL + "/steam-auth/callback",
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as NonNullable<jwt.SignOptions["expiresIn"]>,
  };
}

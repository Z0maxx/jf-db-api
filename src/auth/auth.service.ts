import { envConfig } from "#/env-config";
import { steamUsersService } from "#/steam/steam-users.service";
import { AppUser, AuthResponse, JwtUser, SteamUser } from "#/types";
import { usersRepository } from "#/users/users.repository";
import { getAppUser } from "#/util";
import jwt from "jsonwebtoken";

const openIdEndpoint = "https://steamcommunity.com/openid/login";

export const authService = {
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
      throw new Error("Steam did not return a valid steam64Id");
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

  async getAuthResponseAsync(steam64Id: string): Promise<AuthResponse> {
    const steamUser = await steamUsersService.getUserAsync(steam64Id);
    const user = await getOrCreateAppUserAsync(steamUser);
    const token = this.getToken({ id: user.id });
    return {
      token,
      user,
    };
  },

  getToken(user: JwtUser) {
    const config = getConfig();
    return jwt.sign(user, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  },
};

function getConfig() {
  return {
    returnUrl: envConfig.API_URL + "/auth/callback",
    jwtSecret: envConfig.JWT_SECRET,
    jwtExpiresIn: envConfig.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions["expiresIn"]>,
  };
}

async function getOrCreateAppUserAsync(steamUser: SteamUser): Promise<AppUser> {
  let user = await usersRepository.getUserBySteamIdAsync(steamUser.steam64Id);
  if (!user) {
    user = await usersRepository.createUserAsync(steamUser.steam64Id);
  }

  return getAppUser(user, steamUser);
}

import { ctx } from "@/db-context";
import { envConfig } from "@/env-config";
import { steamUsers } from "@/steam/steam-users";
import { AppUser, AuthResponse, JwtUser, SteamUser } from "@/types";
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

  async getAuthResponseAsync(steamId64: string): Promise<AuthResponse> {
    const steamUser = await steamUsers.getUserAsync(steamId64);
    let user = await getUserAsync(steamUser);
    if (!user) {
      user = await createUserAsync(steamUser);
    }

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

async function getUserAsync(steamUser: SteamUser): Promise<AppUser | null> {
  const user = await ctx.users.findOne({ steamId64: steamUser.steamId64 }, { populate: ["role"] });
  if (!user) {
    return null;
  }

  const roleClaims = await ctx.roleClaims.find({ role: user.role.id }, { populate: ["claim"] });
  const userDivisions = await ctx.userDivisions.find({ user }, { populate: ["division"] });
  return {
    ...steamUser,
    id: user.id,
    tempusId: user.tempusId,
    role: user.role.$.name,
    claims: roleClaims.map((rc) => rc.claim.$.name),
    divisions: userDivisions.map((ud) => {
      const division = ud.division.$;
      return {
        type: division.type,
        name: division.name,
        color: division.color,
      };
    }),
  };
}

async function createUserAsync(steamUser: SteamUser): Promise<AppUser> {
  const role = await ctx.roles.findOne({ name: "user" });
  if (!role) {
    throw new Error("User role must exist");
  }

  const user = ctx.users.create({
    steamId64: steamUser.steamId64,
    tempusId: 0,
    role,
  });

  const divisions = await ctx.divisions.find({ name: "unassigned" });
  if (divisions.length < 2) {
    throw new Error("Unassigned divisions must exist");
  }

  divisions.forEach((division) => ctx.userDivisions.create({ user, division }));
  await ctx.saveAsync();
  return {
    ...steamUser,
    id: user.id,
    tempusId: 0,
    role: role.name,
    claims: [],
    divisions: divisions.map((d) => ({
      type: d.type,
      name: d.name,
      color: d.color,
    })),
  };
}

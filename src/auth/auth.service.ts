import ctx from "@/db-context";
import envConfig from "@/env-config";
import steamUsers from "@/steam/steam-users";
import { AppUser, AuthResponse, JwtUser } from "@/types";
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

  async getAuthResponseAsync(steamId64: string): Promise<AuthResponse> {
    const user = await getUserAsync(steamId64);
    const token = createToken({ id: user.id });
    return {
      token,
      user,
    };
  },
};

export default steamAuthService;

function getConfig() {
  return {
    returnUrl: envConfig.API_URL + "/auth/callback",
    jwtSecret: envConfig.JWT_SECRET,
    jwtExpiresIn: envConfig.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions["expiresIn"]>,
  };
}

function createToken(user: JwtUser) {
  const config = getConfig();
  return jwt.sign(user, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function getUserAsync(steamId64: string): Promise<AppUser> {
  const steamUser = await steamUsers.getUserAsync(steamId64);
  const user = await ctx.users.findOne({ steamId64 }, { populate: ["role"] });
  if (!user) {
    const role = await ctx.roles.findOne({ name: "user" });
    if (!role) {
      throw new Error("User role must exist");
    }

    const newUser = ctx.users.create({
      steamId64,
      tempusId: 0,
      role,
    });

    await ctx.saveAsync();
    return {
      ...steamUser,
      id: newUser.id,
      tempusId: 0,
      role: role.name,
      claims: [],
    };
  }

  const roleClaims = await ctx.roleClaims.find({ role: user.role.id }, { populate: ["claim"] });
  return {
    ...steamUser,
    id: user.id,
    tempusId: user.tempusId,
    role: user.role.$.name,
    claims: roleClaims.map((rc) => rc.claim.$.name),
  };
}

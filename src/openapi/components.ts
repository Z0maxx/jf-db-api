import z from "zod";

import { CreateAllOutEventSchema } from "#/all-out/all-out.schemas";
import { DivisionType } from "#/db-entities/Division";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { UserTempusIdStatus } from "#/db-entities/User";
import { DivisionSchema, DivisionsListSchema } from "#/divisions/divisions.schemas";
import { CreateLanEventSchema } from "#/lan/lan.schemas";
import {
  CreateMonthlyEventSchema,
  MonthlyTimeSubmissionSchema,
} from "#/monthlies/monthlies.schemas";
import { CreateRoleSchema } from "#/roles/roles.schemas";
import {
  CreateDivisionMapSchema,
  CreateTimeLimitedDivisionMapSchema,
  LeaderboardQuerySchema,
  TempusIdSchema,
  UserQuerySchema,
} from "#/schemas";
import { SetUserDivisionsSchema, SetUserRoleSchema } from "#/users/users.schemas";

const registry = z.registry<{ id: string }>();

function register<T extends z.ZodType>(id: string, schema: T) {
  registry.add(schema, { id });
  return schema;
}

const dateTime = register("DateTime", z.iso.datetime());
const division = register("Division", DivisionSchema);
const divisionWithId = register(
  "DivisionWithId",
  DivisionSchema.extend({
    id: z.number().int().positive(),
  }),
);
const divisionWithType = register(
  "DivisionWithType",
  DivisionSchema.extend({
    type: z.enum(Object.values(DivisionType)),
  }),
);
const steamUser = register(
  "SteamUser",
  z.object({
    steam64Id: z.string().length(17),
    name: z.string(),
    avatar: z.string(),
  }),
);
const appUser = register(
  "AppUser",
  steamUser.extend({
    id: z.number().int().positive(),
    role: z.string(),
    tempusId: z.number().int().positive().nullable(),
    tempusIdStatus: z.enum(Object.values(UserTempusIdStatus)),
    claims: z.array(z.string()),
    soldierDivision: division,
    demomanDivision: division,
  }),
);
register(
  "Participant",
  steamUser.extend({
    id: z.number().int().positive(),
    resigned: z.boolean(),
    soldierDivision: division,
    demomanDivision: division,
  }),
);
const lanParticipant = register(
  "LanParticipant",
  steamUser.extend({
    id: z.number().int().positive(),
    disqualified: z.boolean(),
    alias: z.string(),
    soldierDivision: division,
    demomanDivision: division,
  }),
);
register(
  "MonthlyParticipant",
  steamUser.extend({
    id: z.number().int().positive(),
    resigned: z.boolean(),
    division,
  }),
);
const claim = register(
  "Claim",
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
  }),
);
const monthlyMap = register(
  "MonthlyMap",
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    division,
  }),
);
const divisionMap = register(
  "DivisionMap",
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    division: divisionWithType,
  }),
);
const timeLimitedDivisionMap = register(
  "TimeLimitedDivisionMap",
  divisionMap.extend({
    timeLimit: z.number().positive(),
  }),
);
const personalRecord = register(
  "PersonalRecord",
  z.object({
    seconds: z.number(),
    timestamp: dateTime,
  }),
);

register("CreateDivisionMap", CreateDivisionMapSchema);
register("CreateTimeLimitedDivisionMap", CreateTimeLimitedDivisionMapSchema);
register("CreateMonthlyEvent", CreateMonthlyEventSchema);
register("MonthlyTimeSubmission", MonthlyTimeSubmissionSchema);
register("CreateAllOutEvent", CreateAllOutEventSchema);
register("CreateLanEvent", CreateLanEventSchema);
register("LeaderboardQuery", LeaderboardQuerySchema);
register("UserQuery", UserQuerySchema);
register("TempusId", TempusIdSchema);
register("DivisionsList", DivisionsListSchema);
register("CreateRole", CreateRoleSchema);
register("SetUserDivisions", SetUserDivisionsSchema);
register("SetUserRole", SetUserRoleSchema);
register(
  "Divisions",
  z.object({
    soldier: z.array(divisionWithId),
    demoman: z.array(divisionWithId),
  }),
);
register(
  "MonthlyEventPreview",
  z.object({
    id: z.number().int().positive(),
    type: z.enum(Object.values(MonthlyEventType)),
    description: z.string(),
    start: dateTime,
    end: dateTime,
    canceled: z.boolean(),
  }),
);
register(
  "MonthlyEventDetails",
  z.object({
    id: z.number().int().positive(),
    type: z.enum(Object.values(MonthlyEventType)),
    canceled: z.boolean(),
    description: z.string(),
    start: dateTime,
    end: dateTime,
    maps: z.array(monthlyMap),
  }),
);
register(
  "MonthlyLeaderboardItem",
  z.object({
    id: z.number().int().positive(),
    user: steamUser,
    pr: z.object({
      verified: z.boolean(),
      seconds: z.number(),
      timestamp: dateTime,
    }),
  }),
);
register(
  "MonthlyTimeSubmissionResult",
  z.object({
    status: z.enum(["verified", "accepted", "rejected"]),
    message: z.string(),
  }),
);
register(
  "Registration",
  z.object({
    registered: z.boolean(),
    resigned: z.boolean(),
  }),
);
register(
  "LanEventPreview",
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    start: dateTime,
    canceled: z.boolean(),
  }),
);
register(
  "LanEventDetails",
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    start: dateTime,
    end: dateTime.nullable(),
    description: z.string(),
    trailerUrl: z.string(),
    posterUrl: z.string(),
    canceled: z.boolean(),
    maps: z.object({
      soldier: z.array(z.string()),
      demoman: z.array(z.string()),
    }),
    participants: z.array(lanParticipant),
  }),
);
register(
  "AllOutEventPreview",
  z.object({
    id: z.number().int().positive(),
    start: dateTime,
    end: dateTime,
    canceled: z.boolean(),
  }),
);

function allOutStage(maps: z.ZodType) {
  return z.object({
    description: z.string(),
    start: dateTime,
    end: dateTime,
    maps: z.object({
      soldier: z.array(maps),
      demoman: z.array(maps),
    }),
  });
}

register(
  "AllOutEventDetails",
  z.object({
    id: z.number().int().positive(),
    canceled: z.boolean(),
    description: z.string(),
    stage1: allOutStage(timeLimitedDivisionMap),
    stage2: allOutStage(divisionMap),
    stage3: allOutStage(divisionMap),
  }),
);
register(
  "LeaderboardItem",
  z.object({
    id: z.number().int().positive(),
    user: steamUser,
    pr: personalRecord,
  }),
);
register(
  "LapLeaderboardItem",
  z.object({
    id: z.number().int().positive(),
    user: steamUser,
    pr: personalRecord,
    lap: z.object({
      count: z.number().int(),
      lastTimestamp: dateTime,
    }),
  }),
);
register(
  "Role",
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    claims: z.array(claim),
  }),
);
register(
  "AuthResponse",
  z.object({
    token: z.string(),
    user: appUser,
  }),
);
register(
  "TempusIdVerificationResult",
  z.object({
    status: z.enum(Object.values(UserTempusIdStatus)),
    tempusId: z.number().int().positive(),
  }),
);
register(
  "AppErrorMessage",
  z.object({
    errorCode: z.string(),
    errorMessage: z.string(),
  }),
);
register(
  "AppErrorMessages",
  z.object({
    errorCode: z.string(),
    errorMessages: z.array(z.string()),
  }),
);

const generated = z.toJSONSchema(registry, {
  target: "openapi-3.0",
  uri: (id) => `#/components/schemas/${id}`,
  unrepresentable: ({ message }) => {
    if (message.startsWith("Date cannot be represented")) {
      return {
        type: "string",
        description: "Parsed with Date.parse. An ISO-8601 datetime is recommended.",
      };
    }

    return "throw";
  },
});

export const componentSchemas = Object.fromEntries(
  Object.entries(generated.schemas).map(([id, schema]) => [id, cleanSchema(schema)]),
);

function cleanSchema(schema: object): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (
      key === "~standard" ||
      key === "$id" ||
      key === "$schema" ||
      key === "additionalProperties"
    ) {
      continue;
    }

    cleaned[key] = cleanValue(value);
  }

  return cleaned;
}

function cleanValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cleanValue);
  }

  if (value && typeof value === "object") {
    return cleanSchema(value);
  }

  return value;
}

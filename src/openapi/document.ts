import { claimNames } from "#/claim-names";

import { componentSchemas } from "./components";

type ErrorStatus = 400 | 403 | 404 | 409 | 502;

type Success =
  | { status: 200 | 201; description: string; schema: string }
  | { status: 200 | 201; description: string; arrayOf: string }
  | { status: 204; description: string }
  | { status: 302; description: string }
  | { status: 200; description: string; sse: Record<string, unknown> };

type Route = {
  method: "get" | "post" | "put" | "delete";
  path: string;
  tag: string;
  operationId: string;
  summary: string;
  description?: string;
  claim?: (typeof claimNames)[number];
  auth?: boolean;
  query?: string;
  queryParams?: object[];
  body?: string;
  bodyArray?: boolean;
  success: Success;
  input?: boolean;
  errors?: ErrorStatus[];
};

const appErrorSchema = {
  oneOf: [schemaRef("AppErrorMessage"), schemaRef("AppErrorMessages")],
};

const appErrorOrString = {
  oneOf: [...appErrorSchema.oneOf, { type: "string" }],
};

const routes: Route[] = [
  {
    method: "get",
    path: "/auth/init",
    tag: "Auth",
    operationId: "startSteamLogin",
    summary: "Redirect to Steam OpenID",
    description: "Sends the browser to Steam. Steam returns the browser to GET /auth/callback.",
    success: {
      status: 302,
      description: "Redirect to the Steam OpenID login page.",
    },
  },
  {
    method: "get",
    path: "/auth/callback",
    tag: "Auth",
    operationId: "finishSteamLogin",
    summary: "Finish Steam OpenID and return a JWT",
    description:
      "Steam redirects the browser here. Pass the query string through unchanged. Parameters other than the ones listed are forwarded to Steam. A cancelled or invalid login responds with 500.",
    queryParams: [
      openIdParam("openid.mode", "Steam OpenID mode. A completed login uses id_res."),
      openIdParam(
        "openid.claimed_id",
        "Claimed Steam identity, ending in the 17-digit steam64 id.",
      ),
      openIdParam("openid.return_to", "Must match this server's configured callback URL."),
    ],
    success: {
      status: 200,
      description: "JWT and the signed-in user.",
      schema: "AuthResponse",
    },
    errors: [404, 502],
  },
  {
    method: "get",
    path: "/users",
    tag: "Users",
    operationId: "queryUsers",
    summary: "Search users",
    description:
      "A Steam id2, id3, or steam64 id returns that user. Any other string returns users whose Steam name contains it.",
    query: "UserQuery",
    success: { status: 200, description: "Matching users.", arrayOf: "AppUser" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "post",
    path: "/users/set-role",
    tag: "Users",
    operationId: "setUserRole",
    summary: "Set a user's role",
    claim: "manage users",
    body: "SetUserRole",
    success: { status: 204, description: "Role updated." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "post",
    path: "/users/set-divisions",
    tag: "Users",
    operationId: "setUserDivisions",
    summary: "Set a user's soldier and demoman divisions",
    claim: "manage user divisions",
    body: "SetUserDivisions",
    success: { status: 204, description: "Divisions updated." },
    input: true,
    errors: [400, 404],
  },
  {
    method: "post",
    path: "/users/set-tempus-id",
    tag: "Users",
    operationId: "setTempusId",
    summary: "Verify and save the signed-in user's Tempus id",
    description:
      "Opens an event stream and closes it after one event. Result is TempusIdVerificationResult. Error is an app error object, or the string Something went wrong.",
    auth: true,
    body: "TempusId",
    success: {
      status: 200,
      description: "Event stream. Closes after a Result or Error event.",
      sse: {
        Result: schemaRef("TempusIdVerificationResult"),
        Error: appErrorOrString,
      },
    },
    input: true,
  },
  {
    method: "get",
    path: "/divisions",
    tag: "Divisions",
    operationId: "listDivisions",
    summary: "List divisions",
    success: { status: 200, description: "Soldier and demoman divisions.", schema: "Divisions" },
  },
  {
    method: "post",
    path: "/divisions",
    tag: "Divisions",
    operationId: "setDivisions",
    summary: "Replace the division lists",
    claim: "manage divisions",
    body: "DivisionsList",
    success: { status: 204, description: "Divisions replaced." },
    input: true,
    errors: [400, 403],
  },
  {
    method: "get",
    path: "/claims",
    tag: "Claims",
    operationId: "listClaims",
    summary: "List claims",
    success: { status: 200, description: "All claims.", arrayOf: "Claim" },
  },
  {
    method: "get",
    path: "/roles",
    tag: "Roles",
    operationId: "listRoles",
    summary: "List roles",
    success: { status: 200, description: "All roles and their claims.", arrayOf: "Role" },
  },
  {
    method: "post",
    path: "/roles",
    tag: "Roles",
    operationId: "setRoles",
    summary: "Replace the role list",
    claim: "manage roles",
    body: "CreateRole",
    bodyArray: true,
    success: { status: 204, description: "Roles replaced." },
    input: true,
    errors: [400, 403, 404],
  },
  {
    method: "get",
    path: "/monthlies/events",
    tag: "Monthlies",
    operationId: "listMonthlyEvents",
    summary: "List monthly events",
    success: {
      status: 200,
      description: "Event previews.",
      arrayOf: "MonthlyEventPreview",
    },
  },
  {
    method: "get",
    path: "/monthlies/events/{eventId}",
    tag: "Monthlies",
    operationId: "getMonthlyEvent",
    summary: "Get a monthly event",
    success: { status: 200, description: "Event details.", schema: "MonthlyEventDetails" },
    input: true,
    errors: [404],
  },
  {
    method: "get",
    path: "/monthlies/events/{eventId}/participants",
    tag: "Monthlies",
    operationId: "listMonthlyParticipants",
    summary: "List monthly event participants",
    success: { status: 200, description: "Participants.", arrayOf: "MonthlyParticipant" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "get",
    path: "/monthlies/events/{eventId}/registration",
    tag: "Monthlies",
    operationId: "getMonthlyRegistration",
    summary: "Get the signed-in user's monthly registration",
    auth: true,
    success: { status: 200, description: "Registration state.", schema: "Registration" },
    input: true,
    errors: [404],
  },
  {
    method: "get",
    path: "/monthlies/leaderboard/{mapId}",
    tag: "Monthlies",
    operationId: "streamMonthlyLeaderboard",
    summary: "Stream a monthly map leaderboard",
    description:
      "Stays open and sends Items again when the leaderboard changes. Error is an app error object, or the string Something went wrong. The stream ends after an Error event.",
    success: {
      status: 200,
      description: "Event stream of leaderboard items.",
      sse: {
        Items: { type: "array", items: schemaRef("MonthlyLeaderboardItem") },
        Error: appErrorOrString,
      },
    },
    input: true,
  },
  {
    method: "post",
    path: "/monthlies/events",
    tag: "Monthlies",
    operationId: "createMonthlyEvent",
    summary: "Create a monthly event",
    claim: "manage events",
    body: "CreateMonthlyEvent",
    success: { status: 201, description: "Created event.", schema: "MonthlyEventDetails" },
    input: true,
    errors: [400, 404],
  },
  {
    method: "put",
    path: "/monthlies/events/{eventId}",
    tag: "Monthlies",
    operationId: "updateMonthlyEvent",
    summary: "Update a monthly event",
    claim: "manage events",
    body: "CreateMonthlyEvent",
    success: { status: 200, description: "Updated event.", schema: "MonthlyEventDetails" },
    input: true,
    errors: [400, 404],
  },
  {
    method: "post",
    path: "/monthlies/events/{eventId}/cancel",
    tag: "Monthlies",
    operationId: "cancelMonthlyEvent",
    summary: "Cancel a monthly event",
    claim: "manage events",
    success: { status: 204, description: "Event canceled." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "delete",
    path: "/monthlies/events/{eventId}",
    tag: "Monthlies",
    operationId: "deleteMonthlyEvent",
    summary: "Delete a monthly event",
    claim: "manage events",
    success: { status: 204, description: "Event deleted." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "post",
    path: "/monthlies/events/{eventId}/registration",
    tag: "Monthlies",
    operationId: "registerForMonthlyEvent",
    summary: "Register the signed-in user for a monthly event",
    auth: true,
    success: { status: 204, description: "Registered." },
    input: true,
    errors: [403, 404, 409],
  },
  {
    method: "post",
    path: "/monthlies/events/{eventId}/resign",
    tag: "Monthlies",
    operationId: "resignFromMonthlyEvent",
    summary: "Resign the signed-in user from a monthly event",
    auth: true,
    success: { status: 204, description: "Resigned, or the registration was removed." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "post",
    path: "/monthlies/events/{eventId}/submit-time",
    tag: "Monthlies",
    operationId: "submitMonthlyTime",
    summary: "Submit a monthly map time",
    description:
      "Opens an event stream and closes it after one event. Result is MonthlyTimeSubmissionResult. Error is an app error object, or the string Something went wrong.",
    auth: true,
    body: "MonthlyTimeSubmission",
    success: {
      status: 200,
      description: "Event stream. Closes after a Result or Error event.",
      sse: {
        Result: schemaRef("MonthlyTimeSubmissionResult"),
        Error: appErrorOrString,
      },
    },
    input: true,
  },
  {
    method: "get",
    path: "/lan/events",
    tag: "LAN",
    operationId: "listLanEvents",
    summary: "List LAN events",
    success: { status: 200, description: "Event previews.", arrayOf: "LanEventPreview" },
  },
  {
    method: "get",
    path: "/lan/events/{eventId}",
    tag: "LAN",
    operationId: "getLanEvent",
    summary: "Get a LAN event",
    success: { status: 200, description: "Event details.", schema: "LanEventDetails" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "post",
    path: "/lan/events",
    tag: "LAN",
    operationId: "createLanEvent",
    summary: "Create a LAN event",
    claim: "manage events",
    body: "CreateLanEvent",
    success: { status: 201, description: "Created event.", schema: "LanEventDetails" },
    input: true,
    errors: [400, 404, 502],
  },
  {
    method: "put",
    path: "/lan/events/{eventId}",
    tag: "LAN",
    operationId: "updateLanEvent",
    summary: "Update a LAN event",
    claim: "manage events",
    body: "CreateLanEvent",
    success: { status: 200, description: "Updated event.", schema: "LanEventDetails" },
    input: true,
    errors: [400, 404, 502],
  },
  {
    method: "post",
    path: "/lan/events/{eventId}/cancel",
    tag: "LAN",
    operationId: "cancelLanEvent",
    summary: "Cancel a LAN event",
    claim: "manage events",
    success: { status: 204, description: "Event canceled." },
    input: true,
    errors: [404],
  },
  {
    method: "post",
    path: "/lan/participants/{participantId}/disqualify",
    tag: "LAN",
    operationId: "disqualifyLanParticipant",
    summary: "Disqualify a LAN participant",
    claim: "manage events",
    success: { status: 204, description: "Participant disqualified." },
    input: true,
    errors: [404],
  },
  {
    method: "delete",
    path: "/lan/events/{eventId}",
    tag: "LAN",
    operationId: "deleteLanEvent",
    summary: "Delete a LAN event",
    claim: "manage events",
    success: { status: 204, description: "Event deleted." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "get",
    path: "/all-out/events",
    tag: "All Out",
    operationId: "listAllOutEvents",
    summary: "List All Out events",
    success: { status: 200, description: "Event previews.", arrayOf: "AllOutEventPreview" },
  },
  {
    method: "get",
    path: "/all-out/events/{eventId}",
    tag: "All Out",
    operationId: "getAllOutEvent",
    summary: "Get an All Out event",
    success: { status: 200, description: "Event details.", schema: "AllOutEventDetails" },
    input: true,
    errors: [404],
  },
  {
    method: "get",
    path: "/all-out/events/{eventId}/participants",
    tag: "All Out",
    operationId: "listAllOutParticipants",
    summary: "List All Out event participants",
    success: { status: 200, description: "Participants.", arrayOf: "Participant" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "get",
    path: "/all-out/events/{eventId}/registration",
    tag: "All Out",
    operationId: "getAllOutRegistration",
    summary: "Get the signed-in user's All Out registration",
    auth: true,
    success: { status: 200, description: "Registration state.", schema: "Registration" },
    input: true,
    errors: [404],
  },
  {
    method: "get",
    path: "/all-out/leaderboard/stage-1",
    tag: "All Out",
    operationId: "getAllOutStage1Leaderboard",
    summary: "Get an All Out stage 1 leaderboard page",
    query: "LeaderboardQuery",
    success: { status: 200, description: "Leaderboard page.", arrayOf: "LeaderboardItem" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "get",
    path: "/all-out/leaderboard/stage-2",
    tag: "All Out",
    operationId: "getAllOutStage2Leaderboard",
    summary: "Get an All Out stage 2 leaderboard page",
    query: "LeaderboardQuery",
    success: { status: 200, description: "Leaderboard page.", arrayOf: "LapLeaderboardItem" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "get",
    path: "/all-out/leaderboard/stage-3",
    tag: "All Out",
    operationId: "getAllOutStage3Leaderboard",
    summary: "Get an All Out stage 3 leaderboard page",
    query: "LeaderboardQuery",
    success: { status: 200, description: "Leaderboard page.", arrayOf: "LeaderboardItem" },
    input: true,
    errors: [404, 502],
  },
  {
    method: "post",
    path: "/all-out/events",
    tag: "All Out",
    operationId: "createAllOutEvent",
    summary: "Create an All Out event",
    claim: "manage events",
    body: "CreateAllOutEvent",
    success: { status: 201, description: "Created event.", schema: "AllOutEventDetails" },
    input: true,
    errors: [400, 404],
  },
  {
    method: "put",
    path: "/all-out/events/{eventId}",
    tag: "All Out",
    operationId: "updateAllOutEvent",
    summary: "Update an All Out event",
    claim: "manage events",
    body: "CreateAllOutEvent",
    success: { status: 200, description: "Updated event.", schema: "AllOutEventDetails" },
    input: true,
    errors: [400, 404],
  },
  {
    method: "post",
    path: "/all-out/events/{eventId}/cancel",
    tag: "All Out",
    operationId: "cancelAllOutEvent",
    summary: "Cancel an All Out event",
    claim: "manage events",
    success: { status: 204, description: "Event canceled." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "delete",
    path: "/all-out/events/{eventId}",
    tag: "All Out",
    operationId: "deleteAllOutEvent",
    summary: "Delete an All Out event",
    claim: "manage events",
    success: { status: 204, description: "Event deleted." },
    input: true,
    errors: [403, 404],
  },
  {
    method: "post",
    path: "/all-out/events/{eventId}/registration",
    tag: "All Out",
    operationId: "registerForAllOutEvent",
    summary: "Register the signed-in user for an All Out event",
    auth: true,
    success: { status: 204, description: "Registered." },
    input: true,
    errors: [403, 404, 409],
  },
  {
    method: "post",
    path: "/all-out/events/{eventId}/resign",
    tag: "All Out",
    operationId: "resignFromAllOutEvent",
    summary: "Resign the signed-in user from an All Out event",
    auth: true,
    success: { status: 204, description: "Resigned, or the registration was removed." },
    input: true,
    errors: [403, 404],
  },
];

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "jf-db-api",
    version: "0.0.0",
    description: [
      "HTTP API for Jump Fortress front ends.",
      "Authentication is a bearer JWT returned by GET /auth/callback. Protected operations name the required claim. A missing or invalid token is the string Unauthorized. A missing claim is the string Forbidden.",
      "JSON bodies and query objects are validated with Zod. Unknown JSON fields are ignored. Dates in request bodies are parsed with Date.parse. Dates in JSON responses are ISO-8601 strings.",
      "Structural validation failures and some auth failures are plain strings, and Express sends those strings as text/html. Domain failures are JSON objects with errorCode set to the error class name, plus either errorMessage or errorMessages.",
      "Three operations stream server-sent events. Their HTTP status is 200 once the stream starts. Later failures arrive as Error events.",
    ].join("\n\n"),
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth", description: "Steam login and JWT issuance." },
    { name: "Users", description: "User search and account updates." },
    { name: "Divisions", description: "Soldier and demoman divisions." },
    { name: "Claims", description: "Permission claims assigned to roles." },
    { name: "Roles", description: "Roles and the claims they grant." },
    { name: "Monthlies", description: "Monthly events, registration, and leaderboards." },
    { name: "LAN", description: "LAN events and participants." },
    { name: "All Out", description: "All Out events, registration, and leaderboards." },
  ],
  paths: buildPaths(),
  components: {
    schemas: componentSchemas,
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT from GET /auth/callback. Send it as Authorization: Bearer <token>.",
      },
    },
  },
};

function buildPaths() {
  const operationIds = new Set<string>();
  const paths: Record<string, Record<string, object>> = {};
  for (const route of routes) {
    if (operationIds.has(route.operationId)) {
      throw new Error(`Duplicate OpenAPI operationId ${route.operationId}`);
    }

    operationIds.add(route.operationId);
    const pathItem = paths[route.path] ?? {};
    if (pathItem[route.method]) {
      throw new Error(`Duplicate OpenAPI route ${route.method.toUpperCase()} ${route.path}`);
    }

    pathItem[route.method] = operation(route);
    paths[route.path] = pathItem;
  }

  return paths;
}

function operation(route: Route) {
  const authenticated = route.auth === true || route.claim !== undefined;
  const description = [
    route.description,
    route.claim ? `Requires the "${route.claim}" claim.` : undefined,
  ]
    .filter((part) => part !== undefined)
    .join("\n\n");
  const parameters = [...pathParameters(route.path), ...queryParameters(route)];
  return {
    tags: [route.tag],
    operationId: route.operationId,
    summary: route.summary,
    ...(description ? { description } : {}),
    ...(authenticated ? { security: [{ bearerAuth: [] }] } : {}),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(route.body ? { requestBody: requestBody(route) } : {}),
    responses: responses(route, authenticated),
  };
}

function pathParameters(path: string) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    description: `Integer greater than zero. An invalid value responds with the string Invalid ${match[1]}.`,
    schema: { type: "integer", minimum: 1 },
  }));
}

function queryParameters(route: Route) {
  const fromSchema = route.query ? parametersFromSchema(route.query) : [];
  return [...fromSchema, ...(route.queryParams ?? [])];
}

function parametersFromSchema(name: string) {
  const schema = componentSchemas[name];
  if (!schema || schema.type !== "object" || !schema.properties) {
    throw new Error(`OpenAPI schema "${name}" cannot be used as query parameters`);
  }

  const properties = schema.properties as Record<string, object>;
  const required = new Set((schema.required as string[] | undefined) ?? []);
  return Object.entries(properties).map(([param, paramSchema]) => ({
    name: param,
    in: "query",
    required: required.has(param),
    schema: paramSchema,
  }));
}

function requestBody(route: Route) {
  const schema = route.bodyArray
    ? { type: "array", items: schemaRef(route.body!) }
    : schemaRef(route.body!);
  return {
    required: true,
    content: {
      "application/json": { schema },
    },
  };
}

function responses(route: Route, authenticated: boolean) {
  const result: Record<string, object> = {
    [route.success.status]: successResponse(route.success),
  };
  const statuses = new Set<number>(route.errors ?? []);
  if (route.input) {
    statuses.add(400);
  }

  if (authenticated) {
    statuses.add(401);
  }

  if (route.claim) {
    statuses.add(403);
  }

  statuses.add(500);
  for (const status of [...statuses].sort((a, b) => a - b)) {
    result[status] = errorResponse(status, route);
  }

  return result;
}

function successResponse(success: Success) {
  if ("sse" in success) {
    return {
      description: success.description,
      content: {
        "text/event-stream": {
          schema: {
            type: "string",
            description: "Server-sent events. Names and payloads are in x-sse-events.",
          },
        },
      },
      "x-sse-events": success.sse,
    };
  }

  if ("arrayOf" in success) {
    return jsonResponse(success.description, {
      type: "array",
      items: schemaRef(success.arrayOf),
    });
  }

  if ("schema" in success) {
    return jsonResponse(success.description, schemaRef(success.schema));
  }

  if (success.status === 302) {
    return {
      description: success.description,
      headers: {
        Location: {
          description: "Steam OpenID login URL.",
          schema: { type: "string", format: "uri" },
        },
      },
    };
  }

  return { description: success.description };
}

function errorResponse(status: number, route: Route) {
  const content: Record<string, object> = {};
  if (status === 400 && route.input) {
    content["text/html"] = { schema: { type: "string" } };
  }

  if (status === 401) {
    content["text/html"] = { schema: { type: "string", enum: ["Unauthorized"] } };
  }

  if (status === 403 && route.claim) {
    content["text/html"] = { schema: { type: "string", enum: ["Forbidden"] } };
  }

  if (route.errors?.includes(status as ErrorStatus)) {
    content["application/json"] = { schema: appErrorSchema };
  }

  if (status === 500) {
    content["text/html"] = { schema: { type: "string", enum: ["Something went wrong"] } };
  }

  return {
    description: errorDescription(status, route),
    content,
  };
}

function errorDescription(status: number, route: Route) {
  if (status === 400 && route.input && route.errors?.includes(400)) {
    return "The path, query, or body is malformed (text/html string), or a domain rule failed (JSON).";
  }

  if (status === 400 && route.input) {
    return "The path, query, or body is malformed. The body is a plain string sent as text/html.";
  }

  if (status === 401) {
    return "The Authorization header is missing or is not a valid bearer token.";
  }

  if (status === 403 && route.claim && route.errors?.includes(403)) {
    return `Missing the "${route.claim}" claim (text/html string Forbidden), or a domain rule rejected the operation (JSON).`;
  }

  if (status === 403 && route.claim) {
    return `Missing the "${route.claim}" claim.`;
  }

  if (status === 403) {
    return "The operation is not allowed for this user or in the current state.";
  }

  if (status === 404) {
    return "A referenced record was not found.";
  }

  if (status === 409) {
    return "The request conflicts with the current state.";
  }

  if (status === 502) {
    return "Steam failed while loading profiles for this response.";
  }

  return "An unexpected error occurred.";
}

function jsonResponse(description: string, schema: object) {
  return {
    description,
    content: {
      "application/json": { schema },
    },
  };
}

function schemaRef(name: string) {
  if (!componentSchemas[name]) {
    throw new Error(`OpenAPI schema "${name}" is not registered`);
  }

  return { $ref: `#/components/schemas/${name}` };
}

function openIdParam(name: string, description: string) {
  return {
    name,
    in: "query",
    required: true,
    description,
    schema: { type: "string" },
  };
}

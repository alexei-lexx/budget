## 1. Backend: schema and service

- [x] 1.1 (use `testing` skill) Update `backend/src/services/user-service.test.ts`: replace `mcpUrl` expectations with `mcpToken` expectations, drop the `apiBaseUrl` constructor argument
- [x] 1.2 Update `backend/src/graphql/schema.graphql`: replace `UserSettings.mcpUrl: String!` with `mcpToken: String!`
- [x] 1.3 Run `npm run codegen` in `backend/` to regenerate resolver types
- [x] 1.4 Update `backend/src/services/user-service.ts`: drop the `apiBaseUrl` constructor parameter and `buildMcpUrl` method; return `mcpToken: user.mcpToken` directly from `buildSettingsData`
- [x] 1.5 Update `backend/src/dependencies.ts`: drop the `requireEnv("API_BASE_URL")` argument from the `UserService` constructor call (leave the `TelegramBotService` one unchanged)
- [x] 1.6 Run `npm test -- user-service.test.ts` in `backend/` and confirm it passes

## 2. Frontend: schema sync and endpoint config

- [x] 2.1 Run `npm run codegen:sync-schema` in `frontend/` to pull the updated schema
- [x] 2.2 Run `npm run codegen` in `frontend/` to regenerate typed composables
- [x] 2.3 Add `VITE_MCP_ENDPOINT=http://localhost:4000/mcp` to `frontend/.env.example`, next to `VITE_GRAPHQL_ENDPOINT`
- [x] 2.4 Add a `getMcpEndpoint()` helper (mirroring `getGraphQLEndpoint()` in `frontend/src/apollo.ts`) reading `VITE_MCP_ENDPOINT` with default `/mcp`
- [x] 2.5 Update `frontend/src/composables/useUserSettings.ts` and/or `frontend/src/views/Settings.vue` to build the displayed/copied URL as `` `${getMcpEndpoint()}?token=${settings.mcpToken}` `` instead of reading `settings.mcpUrl` directly

## 3. Infra: route MCP through CloudFront

- [x] 3.1 (use `testing` skill) Update `infra-cdk/test/frontend-cdk.test.ts` to assert a `/mcp*` cache behavior exists on the distribution, alongside the existing `/graphql*` one
- [x] 3.2 Update `infra-cdk/lib/frontend-cdk-stack.ts`: add an `additionalBehaviors["/mcp*"]` entry using the same `apiGatewayOrigin`, cache policy, origin request policy, allowed methods, and response headers policy as `/graphql*`
- [x] 3.3 Run `npm test -- frontend-cdk.test.ts` in `infra-cdk/` and confirm it passes

## 4. Verification

- [x] 4.1 Run `npm run typecheck` and `npm run format` in `backend/`, `frontend/`, and `infra-cdk/`; fix any issues
- [x] 4.2 Run the full test suites (`npm test`) in `backend/` and `infra-cdk/`; confirm no regressions
- [x] 4.3 Manually verify in dev: open Settings, confirm the MCP URL shown is `http://localhost:4000/mcp?token=...`, copy it, connect with MCP Inspector, regenerate the token and confirm the URL updates

## Constitution Compliance

- **Schema-Driven Development**: schema updated first (1.2), backend codegen (1.3) before frontend schema sync (2.1) and frontend codegen (2.2).
- **Test Strategy**: backend service test updated in the same unit as the behavior change (1.1); infra-cdk test updated alongside its stack change (3.1); no frontend component test added, per the constitution's frontend testing guidance (manual verification, 4.3).
- **Code Quality Validation**: verification tasks (4.1, 4.2) run the mandated test/typecheck/lint pipeline before completion.
- No other constitution principles apply to this change.

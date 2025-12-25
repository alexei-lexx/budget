# Auth0 to AWS Cognito Migration

## Why Consider Migration

**Pros:**
- **Infrastructure as Code**: All auth settings in CDK (no manual dashboard configuration)
- **One less dependency**: Remove Auth0 account/service
- **Cost**: Free forever (50K MAUs vs Auth0's 7K MAUs)

**Cons:**
- Migration effort required (2-3 hours)
- Cognito UX worse than Auth0
- AWS vendor lock-in

### Migration Effort Estimate

**Backend: Small (~30 lines)**
- Update JWT verification URLs (Auth0 → Cognito format)
- Change issuer/audience validation
- Remove `getUserInfo()` method (email in ID token claims)
- Keep same libraries (`jsonwebtoken`, `jwks-rsa`)

**Frontend: Medium (~3 files, ~100 lines)**
- Replace SDK: `@auth0/auth0-vue` → `@aws-amplify/auth` or `amazon-cognito-identity-js`
- Update `frontend/src/plugins/auth0.ts` (~30 lines)
- Update `frontend/src/composables/useAuth.ts` (~50 lines)
- Update `frontend/src/App.vue` token getter
- Test login/logout flow thoroughly

**CDK: New code**
- Create Cognito User Pool stack
- Configure refresh token lifetimes
- Set up OAuth flows
- Configure client application

**Total effort:** 2-3 hours

### Recommendation

**Migrate to Cognito** if:
- You value IaC over convenience
- You want to eliminate external dependencies
- You're all-in on AWS

**Keep Auth0** if:
- Current setup works fine
- Migration effort not worth it
- You prefer Auth0's UX

### Decision

Status: **Under consideration**

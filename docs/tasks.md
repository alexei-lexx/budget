# Implementation Tasks

## Instructions for Adding New Tasks

When creating new implementation tasks in this file, follow these guidelines:

1. **Structure**: Use nested ordered lists with unchecked checkboxes `[ ]`
2. **Format**: 
   - Main phases as top-level numbered items
   - Subtasks as second-level numbered items with checkboxes
   - Detailed steps as third-level numbered items with checkboxes
3. **Content to include**:
   - Objective and current state analysis
   - Target architecture description
   - Implementation plan with phases
   - Success criteria
4. **Progress tracking**: Mark completed tasks by changing `[ ]` to `[x]`

---

## Task 1: Unified CloudFront Infrastructure

**Objective:** Implement a unified CloudFront distribution that serves both the frontend assets and GraphQL API through a single domain, replacing the current separate infrastructure.

### Current State Analysis

**Backend Infrastructure (`backend-cdk/`):**
- Lambda function with direct function URL (no API Gateway)
- No cross-stack outputs or imports
- Function URL bypasses CloudFront integration

**Frontend Infrastructure (`frontend-cdk/`):**
- S3 bucket with separate CloudFront distribution
- No API integration or routing
- Independent deployment pipeline

**Deployment Process:**
- Sequential independent deployments
- No communication between stacks
- Manual S3 sync for frontend assets

### Target Architecture

**Unified Single-Domain Setup:**
```
https://example.cloudfront.net/
├── /                    → Frontend (S3 origin)
├── /api/graphql        → GraphQL API (API Gateway origin)
└── /assets/*           → Frontend assets (S3 origin)
```

### Implementation Plan

1. **Phase 1: Backend Infrastructure Updates**
   1. [ ] Add API Gateway to Backend Stack
      1. [ ] Replace Lambda function URL with API Gateway REST API
      2. [ ] Configure API Gateway with `/graphql` endpoint
      3. [ ] Update Lambda integration to use API Gateway proxy
   2. [ ] Export Backend Outputs
      1. [ ] Export API Gateway domain name
      2. [ ] Export API Gateway stage URL
      3. [ ] Make these available for frontend stack consumption
   3. [ ] Testing
      1. [ ] Verify API Gateway endpoints respond correctly
      2. [ ] Validate Lambda integration works through API Gateway

2. **Phase 2: Frontend Infrastructure Updates**
   1. [ ] Import Backend Outputs
      1. [ ] Import API Gateway domain from backend stack
      2. [ ] Configure CloudFront to use API Gateway as origin
   2. [ ] Configure Unified CloudFront Distribution
      1. [ ] Add behavior for `/api/*` routes → API Gateway origin
      2. [ ] Keep default behavior for `/*` routes → S3 origin
      3. [ ] Configure appropriate caching policies for each origin
      4. [ ] Set up proper security headers
   3. [ ] Testing
      1. [ ] Confirm CloudFront routing works for both `/` and `/api/*`
      2. [ ] Test that frontend can make GraphQL requests
      3. [ ] Verify caching behavior is appropriate

3. **Phase 3: Deployment Process Updates**
   1. [ ] Update Deployment Dependencies
      1. [ ] Ensure backend deploys first (API Gateway must exist)
      2. [ ] Frontend deployment imports backend outputs
      3. [ ] Update deploy.sh to handle new dependency order
   2. [ ] Environment Configuration
      1. [ ] Frontend build should use unified CloudFront URL
      2. [ ] Remove hardcoded API endpoints
      3. [ ] Configure environment variables for API paths
   3. [ ] Testing
      1. [ ] End-to-end requests from frontend through CloudFront to API
      2. [ ] Performance testing to ensure no regression
      3. [ ] Cross-browser compatibility testing


### Success Criteria

✅ Single CloudFront domain serves both frontend and API
✅ GraphQL endpoint accessible at `/api/graphql`
✅ Frontend can make same-origin API requests
✅ Deployment process works reliably with new architecture
✅ Performance is maintained or improved
✅ All existing functionality continues to work
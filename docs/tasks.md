# Implementation Tasks

## Instructions for Adding New Tasks

When creating new implementation tasks in this file, follow these guidelines:

1. **Structure**: Use GitHub markdown ordered lists with checkboxes `[ ]`
2. **Numbering**: Use format `1.2.3` (maximum 3 levels) where:
   - `1` = Task number
   - `2` = Subtask number  
   - `3` = Step number
3. **Content to include**:
   - Objective and current state analysis
   - Target architecture description
   - Implementation plan with numbered phases
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

- [x] **1.1 Backend Infrastructure Updates**
  - [x] **1.1.1 Add API Gateway to Backend Stack**
    - [x] 1.1.1.1 Replace Lambda function URL with API Gateway REST API
    - [x] 1.1.1.2 Configure API Gateway with `/graphql` endpoint  
    - [x] 1.1.1.3 Update Lambda integration to use API Gateway proxy
  - [x] **1.1.2 Export Backend Outputs**
    - [x] 1.1.2.1 Export API Gateway domain name
    - [x] 1.1.2.2 Export API Gateway stage URL
    - [x] 1.1.2.3 Make these available for frontend stack consumption
  - [x] **1.1.3 Testing**
    - [x] 1.1.3.1 Verify API Gateway endpoints respond correctly
    - [x] 1.1.3.2 Validate Lambda integration works through API Gateway

- [ ] **1.2 Frontend Infrastructure Updates**
  - [ ] 1.2.1 Import API Gateway domain from backend stack
  - [ ] 1.2.2 Configure CloudFront to use API Gateway as origin
  - [ ] 1.2.3 Add behavior for `/api/*` routes → API Gateway origin
  - [ ] 1.2.4 Keep default behavior for `/*` routes → S3 origin
  - [ ] 1.2.5 Configure appropriate caching policies for each origin
  - [ ] 1.2.6 Set up proper security headers
  - [ ] 1.2.7 Test CloudFront routing works for both `/` and `/api/*`
  - [ ] 1.2.8 Test that frontend can make GraphQL requests
  - [ ] 1.2.9 Verify caching behavior is appropriate

- [ ] **1.3 Deployment Process Updates**
  - [ ] 1.3.1 Ensure backend deploys first (API Gateway must exist)
  - [ ] 1.3.2 Frontend deployment imports backend outputs
  - [ ] 1.3.3 Update deploy.sh to handle new dependency order
  - [ ] 1.3.4 Frontend build should use unified CloudFront URL
  - [ ] 1.3.5 Remove hardcoded API endpoints
  - [ ] 1.3.6 Configure environment variables for API paths
  - [ ] 1.3.7 End-to-end requests from frontend through CloudFront to API
  - [ ] 1.3.8 Performance testing to ensure no regression
  - [ ] 1.3.9 Cross-browser compatibility testing


### Success Criteria

✅ Single CloudFront domain serves both frontend and API
✅ GraphQL endpoint accessible at `/api/graphql`
✅ Frontend can make same-origin API requests
✅ Deployment process works reliably with new architecture
✅ Performance is maintained or improved
✅ All existing functionality continues to work
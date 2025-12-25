# Auth0 Configuration & Reliability

## Overview

This document covers Auth0 configuration for refresh tokens and remaining reliability improvements for the backend JWT verification.

## Auth0 Configuration for Refresh Tokens

### Prerequisites
- Auth0 account with a Single Page Application
- Auth0 API configured for your backend

### Step 1: Configure the Application (SPA)

1. **Navigate to Application Settings**
   - Auth0 Dashboard → Applications → Your App → Settings

2. **Verify Application Type**
   - Ensure "Application Type" is set to **"Single Page Application"**
   - If not, change it from the dropdown and Save

3. **Enable Refresh Token Grant**
   - Scroll to "Advanced Settings" → "Grant Types" tab
   - Ensure these are checked:
     - ✅ Implicit
     - ✅ Authorization Code
     - ✅ Refresh Token
   - Click "Save Changes"

4. **Enable Refresh Token Rotation** (Required for SPAs)
   - Scroll to "Refresh Token Rotation" section
   - Toggle **"Allow Refresh Token Rotation"** to **ON**
   - Configure lifetimes (recommended defaults):
     - **Idle Refresh Token Lifetime**: 1296000 seconds (15 days)
       - Token expires if not used for this period
     - **Maximum Refresh Token Lifetime**: 2592000 seconds (30 days)
       - Hard limit regardless of activity
     - **Rotation Overlap Period**: 0 seconds
       - Old token invalidated immediately (Auth0 SDK handles multi-tab coordination)
   - Click "Save Changes"

### Step 2: Configure the API

1. **Navigate to API Settings**
   - Auth0 Dashboard → APIs → Your API (e.g., `https://personal-budget-tracker`)

2. **Enable Offline Access**
   - Scroll to "Allow Offline Access" toggle
   - Turn it **ON**
   - This allows applications to request the `offline_access` scope
   - Click "Save"

## Backend Reliability Improvements

### Network Resilience

#### Add Basic Retry Logic
**Problem**: Network blips cause immediate authentication failure
**Solution**: Simple retry for JWKS key fetching only
**Impact**: Handles temporary network issues
**Risk**: Low-medium

#### Add Request Timeouts for getUserInfo
**Problem**: `getUserInfo()` requests can hang indefinitely
**Solution**: Add 5s timeout using AbortController
**Impact**: Prevents hanging requests
**Risk**: Low
**Location**: `backend/src/auth/jwt-auth.ts:137-149`

### Advanced Resilience

#### Circuit Breaker Pattern
**Problem**: If Auth0 goes down, every request to your backend will wait for timeout (5s) before failing. This means:
- Your backend becomes slow (every request takes 5+ seconds)
- You waste resources waiting for a service that's already down
- Users see slow "loading" instead of immediate "service unavailable"

**Solution**: After N consecutive Auth0 failures (e.g., 5), stop calling Auth0 for X minutes (e.g., 1 minute). Return "service unavailable" immediately instead of waiting for timeout.

**How it helps**:
- Backend stays responsive even when Auth0 is down
- Faster feedback to users ("service temporarily unavailable")
- Reduces load on your backend during Auth0 outages

**When you need it**: Only if Auth0 outages are degrading your service performance. For a personal app, probably overkill.
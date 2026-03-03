# Quickstart: Natural Language Transaction Creation

**Date**: 2026-03-03
**Feature**: Create transactions using natural-language text input via AI agent

## Prerequisites

- AWS Bedrock access already configured (same setup as Insights feature)
- DynamoDB Local running for local development
- At least one account created in the app
- Node.js dependencies installed in `backend/` and `frontend/`

## No New Infrastructure Setup Required

This feature reuses the existing AWS Bedrock configuration used by the Insights feature. No new IAM policies, environment variables, or AWS resources are needed.

---

## Implementation Sequence

### 1. Schema Change → Codegen

**Backend** — add to `backend/src/schema.graphql`:

```graphql
# In the input types section:
input CreateTransactionFromTextInput {
  text: String!
}

# In the Mutation type:
createTransactionFromText(input: CreateTransactionFromTextInput!): Transaction!
```

Regenerate TypeScript types:

```bash
cd backend
npm run codegen
```

**Frontend** — sync schema and regenerate typed composables:

```bash
cd frontend
npm run codegen:sync-schema
npm run codegen
```

### 2. Backend Service + Resolver

Add `backend/src/services/create-transaction-from-text-service.ts` — single-purpose service with one `call(userId, text)` method that:
1. Validates non-empty text
2. Builds a `createTransaction` tool that calls `transactionService.createTransaction(input, userId)` and returns `JSON.stringify(createdTransaction)` (full object, same as data tools)
3. Calls the ReAct agent with `getAccounts`, `getCategories`, `getTransactions` (data tools) + `createTransaction` (write tool)
4. Agent autonomously reasons and calls `createTransaction`; constructs final answer `{ "transaction": { "id": "..." } }` from the tool result
5. Service parses `transaction.id` from `response.answer`, fetches full `Transaction` via `transactionService.getTransactionById(id, userId)`
6. If parsing fails or yields no `transaction.id` (agent didn't call the tool, explains in plain text): throws `BusinessError(response.answer)`
7. Returns the fetched `Transaction`

Add `backend/src/resolvers/create-transaction-from-text-resolvers.ts`:
```typescript
export const createTransactionFromTextResolvers = {
  Mutation: {
    createTransactionFromText: async (_parent, args, context) => {
      const user = await getAuthenticatedUser(context);
      return context.createTransactionFromTextService.call(user.id, args.input.text);
    },
  },
};
```

Register in `backend/src/resolvers/index.ts`:
```typescript
import { createTransactionFromTextResolvers } from "./create-transaction-from-text-resolvers";

Mutation: {
  ...createTransactionFromTextResolvers.Mutation,
  // ... existing mutations
}
```

Register in `backend/src/server.ts` (GraphQLContext + lazy init):
```typescript
// In GraphQLContext interface:
createTransactionFromTextService: CreateTransactionFromTextService;

// In createContext() lazy init block:
if (!createTransactionFromTextService) {
  const agent = new ReActAgent(createBedrockChatModel());
  const agentDataService = new AgentDataService(
    accountRepository,
    categoryRepository,
    transactionRepository,
  );
  createTransactionFromTextService = new CreateTransactionFromTextService(
    agentDataService,
    agent,
    transactionService,
  );
}
```

### 3. Frontend Composable + Mutation

Add `frontend/src/graphql/mutations.ts` entry:
```graphql
mutation CreateTransactionFromText($input: CreateTransactionFromTextInput!) {
  createTransactionFromText(input: $input) {
    id
    type
    amount
    currency
    date
    description
    account { id name isArchived }
    category { id name isArchived }
  }
}
```

Run codegen again in frontend after adding the mutation document.

Add `frontend/src/composables/useCreateTransactionFromText.ts` — mirrors `useInsight` pattern:
- Reactive `text` ref
- `loading` / `error` state from Apollo mutation
- `createTransaction(text)` method that calls the mutation and returns the created transaction
- Clears `text` on success

### 4. Transactions View UI

In `frontend/src/views/Transactions.vue`, above the transaction list:

```vue
<v-text-field
  v-model="text"
  :disabled="createTransactionFromTextLoading"
  placeholder="e.g. spent 45 euro at rewe yesterday"
  @keydown.enter="submit"
/>
<v-btn
  :loading="createTransactionFromTextLoading"
  :disabled="!text.trim() || createTransactionFromTextLoading"
  @click="submit"
>
  Add
</v-btn>
```

On success: prepend the returned `Transaction` to the transaction list and clear the input.
On error: call `showErrorSnackbar(error.message)` and preserve the input text.

---

## Running Locally

### Start backend:
```bash
cd backend
npm run dev
```

### Start frontend:
```bash
cd frontend
npm run dev
```

---

## Manual Testing

With the dev server running and at least one account configured:

| Input | Expected result |
|-------|----------------|
| `spent 45 euro at rewe yesterday` | Expense, amount 45, EUR account, category Groceries (or closest match), date yesterday |
| `received salary 4500 PLN` | Income, amount 4500, PLN account, category Salary |
| `got a refund from zalando 29.99` | Refund, amount 29.99, Shopping category account |
| `20` | Expense, amount 20, most-used account, today |
| `bought something` (no amount) | Error shown, input text preserved |
| ` ` (whitespace only) | Submit button disabled, no request sent |

---

## Running Backend Tests

```bash
cd backend
npm test -- create-transaction-from-text-service.test.ts
```

Or the full suite:
```bash
cd backend
npm test
```

---

## Code Quality Check

After all changes:

```bash
# Backend
cd backend && npm test && npm run typecheck && npm run format

# Frontend
cd frontend && npm run typecheck && npm run format
```

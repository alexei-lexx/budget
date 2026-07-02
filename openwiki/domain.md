# Domain and product concepts

The repository models a personal finance system with a few core concepts that appear consistently across the README, OpenSpec specs, model classes, services, and AI prompts.

## Core entities

### User

Users are the top-level ownership boundary. Backend repositories and services are keyed by user ID, and the GraphQL context authenticates the caller before data loaders are created.

### Account

Accounts represent places where money is stored. The README highlights bank accounts, cash, and credit cards. Backend code treats account currency as important, and the infrastructure/database design scopes accounts by user.

### Category

Categories classify transactions. The assistant prompt in `backend/src/langchain/agents/assistant-agent.ts` states that categories have a name, a type (`INCOME` or `EXPENSE`), and can be excluded from reports.

### Transaction

Transactions are the central record type. The assistant prompt defines the transaction types used by the system: `INCOME`, `EXPENSE`, `REFUND`, `TRANSFER_IN`, and `TRANSFER_OUT`.

The prompt also makes several business rules explicit:

- every transaction belongs to exactly one account
- every transaction has amount, currency, and date
- category and description are optional
- refund transactions reduce spending in the same category
- transfer transactions do not count as spending

## Financial behavior

### Balances and transfers

The project supports money moving between accounts while keeping balances correct. Transfer behavior has its own service and spec area under `openspec/specs/transfers/`.

### Multi-currency

The README explicitly promises support for multiple currencies without forced conversion. That means account/transaction handling must remain currency-aware in forms, services, and report logic.

### Reporting

Monthly reports and by-category breakdowns are product features in the README and `openspec/specs/reports/`. The assistant prompt also says report-excluded categories must be omitted from spending and income totals, and that omission should be mentioned to the user.

### Archived data

The assistant prompt notes that transactions may be linked to archived accounts and categories, and historical queries should still retrieve archived references. That is important for reports and historical assistant questions.

## AI-facing product behavior

### Assistant

The built-in assistant answers finance questions and can also manage accounts, categories, and transactions. Its behavior is documented in `openspec/specs/assistant/spec.md` and implemented through LangChain tools and services.

### Natural-language transaction creation

The quick-entry flow lets the user type something like “coffee 4.50” and have the agent infer and create the transaction. The newer voice-input commits in git show this flow has special handling for spoken input, retries, and ambiguous numeric phrases.

### Telegram bot

The product also exposes a Telegram integration for interacting with the app from chat. There is a dedicated Telegram bot service, repository, provider, and spec in `openspec/specs/telegram-bot-integration/`.

## Cross-cutting product rules

- Data is user-scoped and authenticated.
- AI features should preserve the user’s financial intent, not just parse text.
- Report logic must be aware of excluded categories and transfer semantics.
- Voice input is treated differently from keyboard input in the natural-language transaction flow.

## Good source references

- `backend/src/langchain/agents/assistant-agent.ts`
- `backend/src/services/assistant-service.ts`
- `backend/src/services/create-transaction-from-text-service.ts`
- `backend/src/services/transaction-service.ts`
- `backend/src/services/transfer-service.ts`
- `backend/src/services/by-category-report-service.ts`
- `openspec/specs/assistant/spec.md`
- `openspec/specs/transactions/spec.md`
- `openspec/specs/accounts/spec.md`
- `openspec/specs/categories/spec.md`
- `openspec/specs/transfers/spec.md`
- `openspec/specs/reports/spec.md`
- `openspec/specs/telegram-bot-integration/spec.md`

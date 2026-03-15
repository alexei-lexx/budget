## 1. Tool Factory

- [x] 1.1 Add required `maxCreations: number` parameter to `createCreateTransactionTool` (no default)
- [x] 1.2 Introduce a closure counter `let successfulCreations = 0` inside the factory
- [x] 1.3 At the start of `func`, check `successfulCreations >= maxCreations` and return an error string if the limit is reached
- [x] 1.4 Increment `successfulCreations` only after `transactionService.createTransaction` resolves successfully

## 2. Call Site

- [x] 2.1 Pass `maxCreations: 1` explicitly when constructing the tool in `CreateTransactionFromTextService.call()`

## 3. Tests

- [x] 3.1 Update existing unit tests for `createCreateTransactionTool` to account for the new parameter
- [x] 3.2 Add test: first call succeeds and increments internal counter
- [x] 3.3 Add test: second call returns error string without calling the service
- [x] 3.4 Add test: failed first call (service throws) does not consume the limit; subsequent call still succeeds
- [x] 3.5 Add test: `maxCreations: 2` allows two successful calls and rejects the third

# Commit Message Instructions

## Guidelines

- Use lower case for the entire commit message.
- Keep the message clear and concise—summarize what and why, not how.

- Focus the commit subject on the main point of the changes.
- Limit the subject line to 50 characters if possible.
- Do not add a period at the end of the subject line.
- Separate the subject from the body with a blank line (if a body is needed).

- If there is more than one logical change, add a commit body describing them.
- Use the body to explain "why" if the change is not obvious.
- Wrap lines in the body at 72 characters.
- Use bullet points or lists in the body for clarity if needed.

- Write in the imperative mood (e.g., "add feature", "fix bug", "update docs").
- Use present tense and active voice.
- Avoid generic messages like "update" or "fix".

- Prefix the subject with `[doc]` if the commit includes only updates to files in the `docs` subfolder.
- Prefix the subject with `[copilot]` if the commit includes only updates to Copilot instructions.
- Avoid using other prefixes unless specified in the project guidelines.

## Examples

- add account creation modal
- fix transaction list sorting bug
- update graphql schema for accounts

```
add delete account feature

- adds delete button to account list
- confirms deletion with modal
- updates graphql mutation
```

### Special Prefix Examples

- `[doc]` prefix example:
  ```
  [doc] update getting started guide
  ```

- `[copilot]` prefix example:
  ```
  [copilot] clarify commit message guidelines
  ```

# Commit Message Instructions

## Guidelines

- Do not mention Copilot, Claude, or any other AI assistant in the commit message.
- Do not add AI assistants as commit co-authors.
- Write the commit message as if it were written by a human developer.

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

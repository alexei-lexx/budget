# Commit Message Instructions

## Human Authorship

- Do not mention Copilot, Claude, or any other AI assistant in the commit message.
- Do not add AI assistants as commit co-authors.
- Write the commit message as if it were written by a human developer.

## Content General Rules

- Keep the message clear and concise—summarize what and why, not how.
- Focus the commit message on the main point of the changes.

## Commit Subject Line

- Use lower case for the subject line (except proper nouns and acronyms).
- Limit the subject line to 50 characters if possible.
- Do not add a period at the end of the subject line.
- Separate the subject from the body with a blank line (if a body is needed).

## Commit Body

- Skip the body if the change is small and the subject line tells the full story.
- If there is more than one logical change, add a commit body describing them.
- Use normal text casing for the body (capitalize sentences, proper nouns, etc.).
- Use the body to explain "why" if the change is not obvious.
- Wrap lines in the body at 72 characters.
- Use bullet points or lists in the body for clarity if needed.
- Do not add new lines between bullet points.

## Writing Style

- Write in the imperative mood (e.g., "add feature", "fix bug", "update docs").
- Use present tense and active voice.
- Avoid generic messages like "update" or "fix".

## Examples

- add account creation modal
- fix transaction list sorting bug
- update GraphQL schema for accounts

```
add delete account feature

- Add delete button to account list
- Confirm deletion with modal
- Update GraphQL mutation
```

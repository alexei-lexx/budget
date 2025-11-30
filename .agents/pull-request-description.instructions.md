# Pull Request Description Instructions

- Focus on what and why, not how
- Omit implementation details unless critical for understanding the change
- Write the pull request description as if it were written by a human developer
- Do not mention that the pull request was created by AI

## Format

### Title

- Use lowercase without capitalization
- Be concise and descriptive
- Write in the imperative mood
- Example: `add start/end date filters to transaction list`

### Description Sections

Use lowercase headlines with the following structure:

```
## context
```

Brief explanation of the problem or need being addressed.

```
## before
```

Current behavior or limitations in bullet points (ideally 3, max 5 bullet points).
Use present tense and active voice.

```
## after
```

New behavior or improvements in bullet points (ideally 3, max 5 bullet points).
Use present tense and active voice.

## Example

```
## context

Users have to manually refresh the page to see updates made by other users,
leading to stale data and confusion.

## before

- Users don't see changes from other users until they refresh
- Users work with outdated information
- Users must manually refresh to sync data

## after

- Users see changes from other users automatically
- Users work with current information
- Users don't need to manually refresh
```

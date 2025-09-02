# Pull Request Creation Instructions

## Format

### Title

- Use lowercase without capitalization
- Be concise and descriptive
- Example: `improve search performance`

### Description Sections

Use lowercase headlines with the following structure:

```
## context
```

Brief explanation of the problem or need being addressed.

```
## before
```

Current behavior or limitations in bullet points.

```
## after
```

New behavior or improvements in bullet points.

## Example

```
## context

Current search functionality is slow for large datasets. Need to optimize query performance.

## before

- Search takes 5+ seconds on large datasets
- No caching mechanism implemented
- Database queries are not optimized

## after

- Search completes in under 1 second
- Redis caching layer added for frequent queries
- Database indexes optimized for search patterns
- Pagination implemented for large result sets
```

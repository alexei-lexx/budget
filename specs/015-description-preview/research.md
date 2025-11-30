# Research: Transaction Description Preview Implementation

**Feature**: Transaction Description Preview in Collapsed Cards
**Date**: 2025-11-30

## Research Questions

### 1. Delimiter Choice: "*" vs "•"

**Question**: Should we use "*" (asterisk) as specified in the spec or keep "•" (bullet) for consistency with existing implementation?

**Current Implementation**: Uses " • " (space-bullet-space) as delimiter between date, account, and category.

**Decision**: Keep "•" (bullet) delimiter for consistency

**Rationale**:
- Current implementation already uses "•" throughout the component
- Changing delimiter would affect the existing format unnecessarily
- Both "•" and "*" serve the same visual separation purpose
- User spec used "*" as an example, not a strict requirement
- Consistency with existing UI is more important than matching the literal character in the spec

**Alternatives Considered**:
- Using "*" as specified: Would create visual inconsistency with existing delimiters
- Using "/" or "|": Less visually appealing, harder to read

---

### 2. CSS Truncation Strategy

**Question**: How to implement CSS-only text truncation with ellipsis for responsive behavior?

**Decision**: Use CSS `text-overflow: ellipsis` with `overflow: hidden` and `white-space: nowrap`

**Rationale**:
- Pure CSS solution avoids JavaScript measurement overhead
- Vuetify already provides `text-truncate` utility class
- Browser-native implementation ensures <16ms render time
- Works automatically across all viewport sizes
- No layout shift risk from dynamic JavaScript calculations

**Implementation Pattern**:
```css
.description-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%; /* Constrained by parent flex container */
}
```

**Alternatives Considered**:
- JavaScript-based truncation: Adds complexity, performance overhead, violates constraints
- CSS line-clamp for multi-line: Spec requires single-line display in header
- Fixed character limit (e.g., 50 chars): Not responsive to screen width

---

### 3. "Less Prominent" Visual Styling

**Question**: How to make description text appear "less important" than account and category names?

**Decision**: Reduce opacity to 0.7 using Vuetify's opacity utility class

**Rationale**:
- Vuetify provides built-in opacity utilities: `text-opacity-70` or `opacity-70`
- Opacity reduction creates visual hierarchy without changing font size
- Maintains readability while de-emphasizing secondary information
- Works automatically with light and dark themes
- No custom CSS required, follows Frontend Code Discipline principle

**Implementation**:
```vue
<span class="text-opacity-70">{{ transaction.description }}</span>
```

**Alternatives Considered**:
- Smaller font size: Would create visual inconsistency and alignment issues
- Different color: Would conflict with theme system and accessibility
- Lighter font weight: Not all fonts have multiple weights, inconsistent rendering
- Color with reduced saturation: Requires custom CSS, theme-specific handling

---

### 4. Responsive Behavior Across Screen Widths

**Question**: How to handle description truncation on different screen sizes (mobile vs desktop)?

**Decision**: Use flexible width container that adapts to available space

**Rationale**:
- Parent container already uses `flex-grow-1` with `min-width: 0` (line 109)
- Description will inherit responsive truncation behavior from flex layout
- Mobile devices naturally truncate earlier due to narrower width
- Desktop devices show more characters automatically
- No breakpoint-specific logic needed

**Implementation Pattern**:
```vue
<!-- Main content container already responsive -->
<div class="flex-grow-1 me-3" style="min-width: 0">
  <!-- Header text with description preview -->
</div>
```

**Alternatives Considered**:
- Breakpoint-specific character limits: Fragile, doesn't adapt to actual space
- Different truncation for `sm`, `md`, `lg`: Over-engineered, violates constraints
- Hide description on mobile entirely: Defeats the feature's purpose

---

### 5. Layout Shift Prevention

**Question**: How to ensure zero layout shift when toggling between collapsed and expanded states?

**Decision**: Maintain consistent single-line header height in both states using conditional rendering

**Rationale**:
- Current card already maintains consistent height structure
- Description added inline to existing header text (no new layout rows)
- Conditional `v-if="!isExpanded"` ensures description only renders in collapsed state
- Expanded state continues showing description in dedicated section (lines 155-157)
- No height changes during state transition

**Implementation Pattern**:
```vue
<!-- Collapsed: show description in header -->
<h4 v-if="!isExpanded">
  {{ date }} • {{ account }} • {{ category }} • <span>{{ description }}</span>
</h4>

<!-- Expanded: hide description from header -->
<h4 v-else>
  {{ date }} • {{ account }} • {{ category }}
</h4>

<!-- Expanded section continues showing full description -->
<div v-if="isExpanded">
  <div>{{ transaction.description }}</div>
</div>
```

**Alternatives Considered**:
- Always render with `visibility: hidden`: Would reserve space unnecessarily
- Animate height change: Would violate 60fps constraint, cause jank
- Two separate header elements: Code duplication, maintenance burden

---

## Best Practices

### Vue 3 Composition API
- Use computed properties for conditional display logic
- Maintain reactive consistency with existing `isExpanded` prop
- Follow existing component patterns (props, emits, computed)

### Vuetify 3
- Leverage utility classes: `text-truncate`, `text-opacity-70`, `d-flex`
- Avoid custom CSS where Vuetify provides equivalent
- Maintain theme compatibility (light/dark modes)

### Performance
- Pure CSS truncation (no JS measurement)
- Conditional rendering (`v-if`) prevents unnecessary DOM nodes
- No layout recalculation during expand/collapse
- Single-line constraint prevents reflow

### Accessibility
- Description text remains in normal reading flow
- Screen readers announce full description even when visually truncated
- No ARIA attributes needed (semantic HTML sufficient)
- Escaped HTML prevents XSS (already handled by Vue template rendering)

---

## Technical Approach Summary

1. **Add description to header line** in collapsed state using conditional rendering
2. **Use "•" delimiter** for consistency with existing format
3. **Apply `text-truncate`** class and **`text-opacity-70`** for visual de-emphasis
4. **Leverage flex layout** for responsive width adaptation
5. **Conditional `v-if="!isExpanded"`** to hide description from header when expanded
6. **Preserve full description** in expanded section (no changes to existing behavior)

**No new dependencies, libraries, or framework features required.**

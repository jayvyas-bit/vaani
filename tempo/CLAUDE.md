## Design preferences

### Anti-AI-slop checklist

Apply this checklist whenever generating or reviewing UI in this project:

1. Delete filter badges that don't add information
2. Drop redundant labels (don't repeat what's already obvious from context/icon)
3. Un-italicize random words (no decorative italics without semantic reason)
4. Use monospace/tabular fonts only where needed (numbers, code, IDs) — not everywhere
5. Use the project's design system — no hand-rolled lookalikes
6. Add one accent color — don't stay all-neutral/monochrome
7. Keep icons consistent — one icon set/style, no mixing
8. Remove unnecessary embellishments (gradients, decorative shadows, unneeded borders)
9. Inner radius = outer radius − padding (nested rounded corners must be mathematically consistent, never guessed)
10. Improve text contrast — no low-contrast gray-on-gray
11. Wrap headlines properly (avoid orphans/widows, balance line breaks)
12. Align by eye, not just by pixel values — visual alignment trumps literal numeric equality
13. Use tabular nums for numeric columns/stats so digits align
14. Add loading states — never leave an async action with no feedback
15. Animate useful feedback (state changes, confirmations) — not gratuitous motion

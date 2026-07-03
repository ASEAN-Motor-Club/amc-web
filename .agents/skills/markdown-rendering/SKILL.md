---
name: markdown-rendering
description: Markdown/HTML rendering in the AMC web repo — always go through the MarkdownText component (marked + dompurify); never render unsanitized HTML. Read before displaying markdown or remote HTML.
---

# Markdown Rendering (marked + dompurify)

- All markdown rendering goes through `src/lib/ui/MarkdownText/MarkdownText.svelte`, which parses with **marked** and sanitizes with **dompurify**.
- Never use `{@html …}` with user-supplied or remote content outside this component — that's an XSS hole. If you need new rendering behavior, extend `MarkdownText`, don't bypass it.

Related: [[codebase-patterns]], [[project-structure]]

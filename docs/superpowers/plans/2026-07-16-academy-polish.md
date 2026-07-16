# W6 Academy Polish

**Goal:** Finish Academy as a **publication surface** — `academy-*` tokens only. Reader, news, glossary, and markdown body must not inherit desk mono / black-field lab chrome.

**Scope**
- CSS: news rows, glossary, md body (prose) on `academy-*` tokens
- `AcademyNews` — Substack Notes layout; honest feed badge (no fake Live)
- `GlossaryPanel` — publication search + definition rows
- `MarkdownArticle` — body elements via `academy-md-*` (not `text-foreground` / `border-border`)
- `ContentReader` / `AcademyView` loading·error states on publication tokens
- Kit smoke tests

**Non-goals:** Desk kit (`DeskChart`, `PrintStrip`, black plot field); new APIs/content; curriculum rewrites; red-bar redesign.

**Done when**
- [x] News + glossary use `academy-*` classes (no terminal density mono strip look)
- [x] Essay body headings/code/tables/quotes use publication tokens
- [x] No "Live" badge on Academy news (honest board/feed label)
- [x] Kit tests green; archive masthead/tabs unchanged in behavior

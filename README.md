# Mantik

Web-based programming and robotics learning platform for FTC/FRC teams. Content is stored as JSON files—to add or edit pages, create or modify JSON in `data/` and wire it into the navigation configs.

## Quick Start

```bash
npm install
npx http-server -p 8000 -c-1
```

Open http://localhost:8000. Or use Python: `python -m http.server 8000`. Or right-click `index.html` → Open with Live Server (VS Code).

## Adding or Editing a Page

### 1. Create or edit the content file

Content lives in `data/` under section folders (e.g. `data/java/java-basics/`, `data/frc/command-based/`). Each page is a JSON file:

```json
{
  "id": "my-page-id",
  "title": "Page Title",
  "sections": [
    {
      "type": "text",
      "title": "Section Title",
      "content": "HTML content with <strong>formatting</strong>"
    }
  ]
}
```

### 2. Add the page to navigation

Update the section config in `data/config/`. Config files map sections to the sidebar:

- **Java**: `java-training-config.json`
- **FRC**: `frc-specific-config.json`
- **FTC**: `ftc-specific-config.json`
- **Competitive**: `competitive-training-config.json`

Add your page to the right `groups[].items[]`:

```json
{
  "id": "my-page-id",
  "label": "Page Label in Sidebar",
  "file": "data/section-folder/my-page.json",
  "difficulty": "beginner",
  "duration": "20 min"
}
```

`file` is the path from the project root. `difficulty` and `duration` are optional.

### 3. Create the folder if needed

If the section folder doesn’t exist, create it under `data/` (e.g. `data/java/java-basics/`).

---

## Section Types (Content Blocks)

Use these `type` values in `sections`:

| Type | Purpose |
|------|---------|
| `text` | Paragraphs with HTML. Uses `title`, `content`. |
| `list` | Bullet list. Uses `title` (optional), `items` (array of strings). |
| `code` | Code block with syntax highlighting. Uses `title`, `content`, `code`. |
| `code-tabs` | Tabbed code examples. Uses `title`, `tabs` (array of `{label, code}`). |
| `rules-box` | Highlighted rules. Uses `title`, `subtitle`, `items`, plus optional `goodPractices` and `avoid` arrays. |
| `steps-box` | Numbered steps. Uses `title`, `items`. |
| `exercise-box` | Practice with show/hide answers. Uses `title`, `subtitle`, `content` (starter code), `tasks`, `answers` (array of `{task, content}`). |
| `table` | Data table. Uses `title`, `headers`, `rows`. |
| `link-grid` | Links to other pages or URLs. Uses `title`, `links` (array of `{label, id}` for internal or `{label, url}` for external). |
| `emphasis-box` | Styled like `rules-box`. Uses same fields. |
| `data-types-grid` | Data type comparison cards. |
| `logical-operators` | Operator reference table. |

---

## Adding a New Section

1. **Create config file**  
   Add `data/config/my-section-config.json` with `title`, optional `sections` (landing content), and `groups`:

   ```json
   {
     "id": "my-section",
     "title": "My Section",
     "groups": [
       {
         "id": "group-id",
         "label": "Group Label",
         "items": [
           {
             "id": "first-page",
             "label": "First Page",
             "file": "data/my-section/first-page.json"
           }
         ]
       }
     ]
   }
   ```

2. **Register in main config**  
   Edit `data/config/config.json` and add to `sections`:

   ```json
   "my-section": {
     "id": "my-section",
     "label": "My Section",
     "file": "data/config/my-section-config.json",
     "sidebarEnabled": true
   }
   ```

3. **Create content folder**  
   Add `data/my-section/` and put your JSON page files there.

---

## File Layout

```
data/
├── config/           # Section configs (navigation)
│   ├── config.json   # Main app config (registers sections)
│   └── *-config.json # Per-section nav and landing content
├── java/             # Java training pages
├── frc/              # FRC training pages
├── ftc/              # FTC training pages
└── comp/             # Competitive coding pages
```

---

## References

- **Styling**: `STYLING_GUIDE.md`
- **Deployment**: `DEPLOYMENT_CHECKLIST.md`, `NETLIFY_DEPLOYMENT.md`

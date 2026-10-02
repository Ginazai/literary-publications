# Technology Decision — Personal Literary Publication Website

## 1. Project Context

This project is a personal/literary publication website for essays and longer-form writing.

Requirements:
- Clean, responsive public website.
- Book-like reading experience.
- Realistic page-turn animation, especially on mobile.
- Menu for browsing and searching essays.
- Administration interface for creating and editing essays.
- Publication/newsfeed subscription capability.
- Free/open-source software with no proprietary CMS subscription.
- Self-hosting or free infrastructure where practical.
- Flexible frontend for a distinctive literary reading experience.

The project is personal/literary, not academic publishing.

---

# 2. Final Recommended Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| CMS / Backend | **WriteFreely** | Writing, editing, publishing and publication management |
| Runtime | **Go** | WriteFreely runtime |
| Database | **MySQL 8 via Aiven** | Managed production database |
| Frontend | **React** | Interactive public website and reader |
| Frontend tooling | **Vite + TypeScript** | React development/build system |
| Styling | **CSS** or **Tailwind CSS** | Responsive UI and visual design |
| Page-turn engine | **StPageFlip / page-flip** | Realistic book/page-turn interaction |
| Version control | **Git + GitHub** | Source control and deployment workflow |
| Reverse proxy | **Caddy** | HTTPS and request routing |
| Search | **Client-side search over fetched posts** | Essay discovery (WriteFreely has no built-in post search) |
| Subscription | **RSS/Atom initially** | Free publication feed |
| Email newsletter | **Separate future component** | Email delivery and subscriber management |
| Hosting | **Application hosting + Aiven** | Run WriteFreely and use managed MySQL without a CMS subscription |

The three main application components are:

```text
                 ┌─────────────────┐
                 │ React + Vite    │
                 │ TypeScript      │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   WriteFreely   │
                 │     Go CMS      │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ MySQL 8 / Aiven │
                 └─────────────────┘
```

---

# 3. Why WriteFreely

WriteFreely is the publishing foundation because it provides functionality that does not need to be reinvented:

- Writing and editing.
- Drafts and publishing.
- Publication management.
- Author/account management.
- Post storage.
- Publishing infrastructure.
- RSS/Atom-style publishing.
- Self-hosting.

The important distinction is:

> **WriteFreely is free/open-source software; hosting infrastructure is a separate cost consideration.**

Official project:

https://writefreely.org/

Repository:

https://github.com/writefreely/writefreely

---

# 4. Why React

React is appropriate because the public website is more than a conventional blog.

The reader contains significant UI state:

- Current essay.
- Current page/spread.
- Desktop two-page vs. mobile single-page mode.
- Page-turn animation.
- Swipe gestures.
- Search state.
- Navigation state.
- Reading progress.
- Accessibility mode.
- Potential future reader preferences.

React makes this state easier to organize into reusable components.

A possible component structure:

```text
App
│
├── Header
│   ├── Logo
│   ├── Navigation
│   └── Search
│
├── Home
├── EssayArchive
│
├── Essay
│   ├── EssayHeader
│   ├── BookReader
│   │   ├── ReaderPage
│   │   ├── ReaderControls
│   │   └── ProgressIndicator
│   └── AccessibleReader
│
├── About
└── Subscribe
```

React is the **frontend application layer**, not a replacement for WriteFreely.

---

# 5. Why Vite Instead of Next.js

Next.js is not necessary for the first version.

The project already has a backend/CMS:

```text
WriteFreely
```

The React application primarily needs to:

- Render the public UI.
- Retrieve published content.
- Manage reader state.
- Implement the page-turn experience.
- Provide search/navigation.
- Handle responsive behavior.

Vite provides these capabilities without introducing another full server framework.

Initial frontend:

```text
React
+
TypeScript
+
Vite
+
CSS
+
StPageFlip
```

Avoid initially:
- Next.js.
- Next.js API routes.
- Separate application backend.
- Server-side rendering unless a concrete requirement appears.

---

# 6. Why MySQL 8 Instead of SQLite

SQLite would be simpler, but **MySQL 8 is the preferred production database**.

The project is intended to be a real publication, and MySQL is already a familiar relational database technology. Aiven is used as the managed MySQL provider, so the application does not need to operate and maintain the MySQL server itself.

Advantages:

### Managed separate database service

```text
React
   │
   ▼
WriteFreely
   │
   ▼
Aiven
   │
   ▼
MySQL 8
```

### Easier future expansion

Potential future data:

```text
Users
Essays
Metadata
Tags
Categories
Subscriber records
Reader preferences
Bookmarks
Analytics
```

### Better fit for multi-component infrastructure

Additional services can connect to the same database infrastructure without relying on a local database file.

### Familiarity

The practical advantage of SQLite's simplicity is smaller when the developer is already comfortable with MySQL.

---

# 7. Database Strategy

Use:

> **MySQL 8 through Aiven as the production database.**

SQLite can still be used for quick local experimentation if convenient, but it is not the target production database.

Conceptually:

```text
                 WriteFreely
                      │
                      ▼
              Aiven / MySQL 8
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
      Posts         Users        Metadata
```

Database backups should be independent from Git.

---

# 8. Aiven Database Hosting

Aiven is the managed database provider for the production MySQL instance.

The application architecture therefore separates the application server from the database infrastructure:

```text
                    Application Host
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
       React static files       WriteFreely / Go
                                      │
                                      │ MySQL connection
                                      ▼
                              ┌────────────────┐
                              │ Aiven          │
                              │ MySQL 8        │
                              └────────────────┘
```

This means the project does **not** need to install, configure, patch, or directly operate the MySQL server on the same machine as WriteFreely.

Aiven is responsible for the managed database infrastructure, while the application deployment remains responsible for:

- WriteFreely.
- React frontend.
- Caddy/reverse proxy.
- Application configuration.
- Database credentials/configuration.
- Backups and recovery procedures appropriate to the chosen Aiven service.

Verified Sept 2026 (Aiven docs): the free MySQL plan is 1 CPU / 1 GB RAM / 1 GB disk, single node, backups included, no SLA, and Aiven may power it off after inactivity or change region/plan. A paid Developer tier is not auto-powered-off. Also: WriteFreely's documented MySQL setup uses `CREATE DATABASE writefreely CHARACTER SET latin1 COLLATE latin1_swedish_ci;` (its schema sets utf8mb4 per column) and Aiven requires TLS, so enable TLS in the `[database]` config. Keep the app host in the same region as the database to limit latency.

The exact Aiven plan and its current free-tier/pricing conditions should still be verified at deployment time. The architecture should not assume that a particular Aiven plan will remain free indefinitely.

---

# 9. Overall Architecture

```text
                         INTERNET
                             │
                             ▼
                    ┌─────────────────┐
                    │ Domain + HTTPS  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Caddy       │
                    │ Reverse Proxy   │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
       ┌─────────────────┐       ┌─────────────────┐
       │ React + Vite    │       │   WriteFreely   │
       │ TypeScript      │◄─────►│     Go CMS      │
       └────────┬────────┘       └────────┬────────┘
                │                         │
                ▼                         ▼
       ┌─────────────────┐       ┌─────────────────┐
       │   StPageFlip    │       │     MySQL 8     │
       │  Book Reader    │       │    Database     │
       └─────────────────┘       └─────────────────┘

                         GitHub
                            │
                            ▼
                    Source / UI / Theme
```

Responsibilities:

### WriteFreely
- Content management.
- Publishing.
- Authentication/admin.
- Essay storage.
- Publication metadata.

### React
- Public website.
- Navigation.
- Search UI.
- Essay presentation.
- Reader state.
- Responsive behavior.

### StPageFlip
- Page turning.
- Touch interaction.
- Book-like animation.

### MySQL
- Persistent relational data.

### Caddy
- HTTPS.
- Reverse proxy.
- Request routing.

---

# 9A. Content Model (was a duplicate "9")

## One WriteFreely Post = One Essay

Each essay should correspond to one WriteFreely post, inside a single public WriteFreely *collection* (blog). React reads them via the public API: `GET /api/collections/{alias}/posts` (paginated, 10 per page) and `/posts/{slug}`. Post bodies come back as raw Markdown, so React must parse and sanitize them.

```text
WriteFreely
│
├── Essay: The First Essay
├── Essay: Memory and Time
├── Essay: On Silence
├── Essay: Notes from Panama
└── Essay: Untitled No. 5
```

React retrieves the published essay and creates the reader experience.

The database should not become coupled to the visual concept of individual pages.

---

# 10. Page Model

The CMS should store an essay as content rather than as many database records representing pages.

Conceptually:

```text
Essay
   │
   ├── Paragraph
   ├── Paragraph
   ├── Page Break
   ├── Paragraph
   ├── Paragraph
   ├── Page Break
   └── Paragraph
```

React transforms the content into:

```text
Essay
 ├── Page 1
 ├── Page 2
 ├── Page 3
 ├── Page 4
 └── Page 5
```

---

# 11. Responsive Pagination

The same text occupies different amounts of space on different screens.

For example:

```text
Desktop: 850 × 600
Mobile:  390 × 750
```

Two possible models exist.

## Model A — Author-defined page breaks

The author controls logical page boundaries.

Pros:
- Strong literary/artistic control.
- Predictable composition.
- Useful when visual pacing matters.

Cons:
- Boundaries may behave differently on different screen sizes.
- Responsive implementation is more complicated.

## Model B — Automatic pagination

React calculates how much content fits into each page.

Pros:
- Naturally responsive.
- Better adaptation to different screens.
- Less manual author work.

Cons:
- More technically complex.
- Page boundaries change with font size, viewport and accessibility settings.

### Recommendation

**Corrected:** use **automatic pagination with optional author-defined forced breaks**. StPageFlip pages have fixed dimensions and clip overflow, so pure author-defined pages would cut text off on phones. The reader measures content into pages for the current viewport; an author-inserted `<!-- pagebreak -->` line forces a new page.

---

# 12. StPageFlip

Use StPageFlip/page-flip for the physical page-turn interaction rather than implementing page-turn physics from scratch.

It should handle:
- Page folding.
- Dragging.
- Touch gestures.
- Page shadows.
- Turning animation.
- Previous/next navigation.

React controls the application state around it.

```text
WriteFreely
    │
    ▼
Essay content
    │
    ▼
React parser
    │
    ▼
Page components
    │
    ▼
StPageFlip
    │
    ▼
Interactive reader
```

---

# 13. Reader Modes

## Book Mode

Primary visual experience:

```text
Desktop:

┌────────────┬────────────┐
│            │            │
│   Page 1   │   Page 2   │
│            │            │
└────────────┴────────────┘
```

Mobile:

```text
┌──────────────────┐
│                  │
│      Page 1      │
│                  │
└──────────────────┘
```

## Normal Reading Mode

A conventional semantic HTML document.

The page-turn animation is therefore an enhancement rather than a requirement.

---

# 14. Responsive Reader

## Desktop

When sufficient horizontal space exists:
- Two-page spread.
- Book-binding appearance.
- Mouse drag.
- Previous/next buttons.
- Keyboard navigation.
- Reading progress.

## Mobile

Use:
- One page.
- Swipe gestures.
- Tap navigation.
- Large touch targets.
- Minimal controls.
- Progress indicator.

React can configure the reader according to viewport characteristics.

---

# 15. Accessibility

Maintain an accessible HTML representation:

```text
Essay
│
├── Book Reader
│      └── visual presentation
│
└── Accessible Reader
       └── semantic HTML
```

Support:
- Keyboard navigation.
- Screen readers.
- Reduced-motion preferences.
- Text resizing.
- High-contrast usability.
- Normal reading mode.

---

# 16. Public Website

Possible routes:

```text
/
├── Home
├── Essays
├── Essays/:slug
├── Archive
├── Search
├── About
└── Subscribe
```

Example:

```text
/essays/memory-and-time
```

An essay page could contain:

```text
Essay title
Author
Publication date
Description
       │
       ▼
React Book Reader
       │
       ├── Previous
       ├── Next
       └── Progress
```

---

# 17. Admin Workflow

WriteFreely remains the administration interface.

```text
Administrator
      │
      ▼
WriteFreely Admin
      │
      ├── Create essay
      ├── Edit essay
      ├── Save draft
      └── Publish
              │
              ▼
        React public UI
```

There is no reason to build a second React admin panel initially.

---

# 18. React Project Structure

Possible structure:

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   ├── Search.tsx
│   │   ├── EssayCard.tsx
│   │   ├── EssayHeader.tsx
│   │   ├── BookReader.tsx
│   │   ├── ReaderPage.tsx
│   │   ├── ReaderControls.tsx
│   │   ├── ProgressIndicator.tsx
│   │   └── AccessibleReader.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Essays.tsx
│   │   ├── Essay.tsx
│   │   ├── Archive.tsx
│   │   ├── About.tsx
│   │   └── Subscribe.tsx
│   │
│   ├── services/
│   │   └── writefreely.ts
│   │
│   ├── hooks/
│   │   ├── useReader.ts
│   │   └── useResponsiveReader.ts
│   │
│   ├── types/
│   │   └── essay.ts
│   │
│   └── main.tsx
│
├── public/
├── package.json
└── vite.config.ts
```

This is an initial organization, not a rigid requirement.

---

# 19. Styling

Two approaches are appropriate.

## Plain CSS

Advantages:
- Maximum visual control.
- No utility framework dependency.
- Good fit for a highly customized literary design.

## Tailwind CSS

Advantages:
- Rapid responsive layout.
- Consistent spacing.
- Fast component development.

### Recommendation

Use **CSS initially**, unless Tailwind materially speeds up development.

The literary visual identity should not be dictated by the framework.

---

# 20. Search

WriteFreely does not offer full-text search of posts, so search is built in React from the start: fetch the public posts once, index title/body/tags in the browser, and search locally.

Flow:

```text
WriteFreely content
       │
       ▼
React
       │
       ▼
Search index
       │
       ▼
Search results
```

For a small personal archive, client-side search may be sufficient.

A dedicated search engine should only be introduced if the archive becomes large enough to justify it.

---

# 21. Subscription

## RSS / Atom

RSS/Atom should be the first subscription mechanism.

Advantages:
- Free.
- No external email provider.
- No email infrastructure.
- Natural fit for publishing.

## Email newsletter

A real email newsletter is a separate infrastructure problem requiring:
- Subscriber storage.
- Email delivery.
- Unsubscribe handling.
- Bounce handling.
- Sender reputation.
- Domain authentication.

Therefore it should be added after the publication is stable.

---

# 22. Hosting Strategy

The software components are free/open-source:

```text
WriteFreely       → free/open source
Go                → free/open source
React             → open source
Vite              → open source
TypeScript        → open source
StPageFlip        → open source
MySQL             → free/open source
Caddy             → open source
Git               → free/open source
```

The remaining cost is infrastructure.

Two separate goals must be distinguished:

### $0 software

Achievable.

### $0 hosting indefinitely

Depends on current hosting providers and free-tier terms.

The application should therefore be designed to run on modest infrastructure and remain portable between hosts.

---

# 23. Production Deployment

A likely deployment:

```text
Internet
   │
   ▼
Domain
   │
   ▼
Caddy
   │
   ├──────────────► React static files
   │
   └──────────────► WriteFreely
                         │
                         ▼
                  Aiven / MySQL 8
```

The React application can be built into static assets:

```text
npm run build
      │
      ▼
dist/
├── index.html
├── assets/
└── ...
```

Caddy serves the static frontend on the main domain. WriteFreely runs on its own subdomain (e.g. `write.example.com`) for admin and login, because it expects to own the site root. Caddy proxies `/wf/*` on the main domain to WriteFreely's `/api/*`, keeping the React app same-origin (WriteFreely also sends CORS headers on its public API). Persist WriteFreely's `keys/` directory and `config.ini`, or sessions and federation keys are lost. Free-tier app hosts that sleep or lack persistent disks are a poor fit for WriteFreely.

---

# 24. Database Backups

MySQL should have a dedicated backup strategy.

Recommended:

```text
MySQL
  │
  ├── Daily logical backup
  ├── Periodic full backup
  └── Off-server backup
```

The Git repository should contain code, not live production database dumps.

---

# 25. Version Control

Use Git from the beginning.

Suggested repository:

```text
literary-publication/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── writefreely-theme/
│
├── docs/
│
└── README.md
```

Avoid modifying WriteFreely core code unless absolutely necessary.

Custom functionality should live in:
- React frontend.
- WriteFreely theme.
- Separate configuration.

This makes upgrades easier.

---

# 26. Local Development

Recommended environment:

```text
Linux / WSL / macOS
        │
        ├── Git
        ├── Go
        ├── Node.js
        ├── npm
        ├── WriteFreely
        ├── MySQL 8
        └── Browser developer tools
```

Docker can optionally be used for reproducible development.

A local setup could contain:

```text
Docker Compose
│
├── WriteFreely
├── MySQL
└── optional development services
```

The React development server can run separately through Vite.

---

# 27. Development Order

## Phase 1 — CMS

Set up:
- WriteFreely.
- MySQL 8.
- Admin account.
- Publication.
- First essays.

Goal:

> Confirm the publishing system before building the custom reader.

## Phase 2 — React Frontend

Set up:
- React.
- Vite.
- TypeScript.
- Basic routing.
- Global layout.
- Typography.
- Responsive navigation.

Goal:

> Establish the public application.

## Phase 3 — WriteFreely Integration

Implement:
- Published essay retrieval.
- Essay metadata.
- Slugs.
- Archive.
- Basic search.

Goal:

> Connect the React presentation layer to the CMS.

## Phase 4 — Reader

Implement:
- Content parsing.
- Logical page boundaries.
- StPageFlip.
- Desktop two-page spread.
- Mobile single-page mode.
- Touch gestures.
- Controls.
- Progress indicator.

Goal:

> Create the book-like reading experience.

## Phase 5 — Accessibility

Implement:
- Semantic HTML.
- Keyboard controls.
- Accessible reader.
- Reduced-motion behavior.
- Text resizing.

Goal:

> Make the reader robust and accessible.

## Phase 6 — Visual Identity

Implement:
- Typography.
- Colors.
- Layout.
- Book design.
- Animations.
- Homepage.
- About page.

Goal:

> Establish the literary identity.

## Phase 7 — Subscription

Implement:
- RSS/Atom immediately.
- Email newsletter later if required.

## Phase 8 — Production

Deploy:

```text
Caddy
  ↓
React
  ↓
WriteFreely
  ↓
Aiven / MySQL 8
```

Add:
- HTTPS.
- Backups.
- Monitoring.
- Domain.
- Production configuration.

---

# 28. Why Not Build the CMS From Scratch?

A completely custom system would require:

```text
Backend
+
Database
+
Authentication
+
Admin UI
+
Rich-text editor
+
Draft management
+
Publishing
+
API
+
Reader
```

That duplicates conventional publishing functionality.

WriteFreely solves the CMS/publishing problem, allowing engineering effort to focus on:

> **The literary reading experience.**

---

# 29. Why Not WordPress?

WordPress.org is free/open-source and highly extensible, but its ecosystem is much larger than this project needs.

The project does not require:
- Page builders.
- Hundreds of plugins.
- E-commerce.
- Large third-party plugin dependencies.

WriteFreely is more focused on writing/publishing and aligns better with the intended architecture.

---

# 30. Why Not a Static Site Generator?

A stack such as:

```text
Astro/Hugo/Jekyll
+
Markdown
+
Git
+
Static hosting
```

could be extremely cheap and fast.

However, administration becomes developer-oriented:

```text
Write Markdown
→ Git
→ Build
→ Deploy
```

The desired workflow is:

```text
Open WriteFreely
→ Write
→ Edit
→ Publish
```

Therefore WriteFreely remains preferable as the CMS, while React provides the richer frontend.

---

# 31. Why Not Supabase?

Supabase is unnecessary for the initial architecture.

WriteFreely already provides:
- Backend.
- Authentication.
- Content management.
- Database integration.

Adding Supabase would introduce another backend/data layer without solving a current requirement.

It can be reconsidered if the project later becomes a separate application with additional backend functionality.

---

# 32. Why Not PostgreSQL?

PostgreSQL would be technically suitable for many application architectures.

However, MySQL 8 is the selected database because:
- It is supported by the chosen CMS.
- It is already familiar.
- It provides the relational capabilities needed.
- It avoids adding another database technology without a concrete benefit.

---

# 33. Final Technology Decisions

## Adopt

### CMS
**WriteFreely**

### Backend runtime
**Go through WriteFreely**

### Database
**MySQL 8 via Aiven**

### Frontend
**React**

### Frontend tooling
**Vite + TypeScript**

### Styling
**CSS initially; Tailwind optional**

### Page-turning
**StPageFlip / page-flip**

### Version control
**Git + GitHub**

### Reverse proxy
**Caddy**

### Search
**Client-side search (e.g. MiniSearch) over posts fetched from the WriteFreely API**

### Subscription
**RSS/Atom initially**

### Email newsletter
**Future separate component**

### Database hosting
**Aiven for managed MySQL 8**

### Application hosting
**Self-hosted or currently available free-tier infrastructure**

---

# 34. Defer

Do not add these unless a concrete requirement appears:

- Next.js.
- Separate Node.js backend.
- FastAPI.
- Supabase.
- PostgreSQL.
- Dedicated search engine.
- Microservices.
- Self-hosted mail server.
- Complex analytics.
- Separate React admin frontend.
- Kubernetes.
- Redis.
- GraphQL.

The project can have a sophisticated reader without having a complicated backend.

---

# 35. Final Architecture

```text
                              INTERNET
                                  │
                                  ▼
                           ┌─────────────┐
                           │   DOMAIN    │
                           │    HTTPS    │
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │    CADDY    │
                           │Reverse Proxy│
                           └──────┬──────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌─────────────────┐         ┌─────────────────┐
           │ React + Vite    │         │   WriteFreely   │
           │ TypeScript      │◄───────►│     Go CMS      │
           └────────┬────────┘         └────────┬────────┘
                    │                           │
                    ▼                           ▼
           ┌─────────────────┐         ┌─────────────────┐
           │   StPageFlip    │         │     MySQL 8     │
           │  Book Reader    │         │    Database     │
           └─────────────────┘         └─────────────────┘

                              GitHub
                                 │
                                 ▼
                      Source / Frontend / Theme
```

---

# 36. Core Principle

The architecture separates conventional publishing functionality from the project's unique experience:

```text
WriteFreely
    ↓
"How do I publish and manage my essays?"

React
    ↓
"How does the website look and behave?"

StPageFlip
    ↓
"How does the essay feel like a physical book?"

Aiven / MySQL
    ↓
"Where is the production application data stored?"

Caddy
    ↓
"How is the production application exposed securely?"
```

The final recommended stack is:

> **WriteFreely + MySQL 8 via Aiven + React + Vite + TypeScript + StPageFlip + Caddy + GitHub**

with RSS/Atom as the initial subscription mechanism and email newsletters treated as a future component.

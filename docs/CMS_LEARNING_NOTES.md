# NovaCMS: Learning Notes

Ek jagah poori knowledge: jo bhi humne ab tak CMS banate hue seekha.
Har topic mein: **kya hai → kyun hai → hamare project mein kahan hai → yaad rakhne wali baat**.

> Stack: Next.js (App Router) + TypeScript + PostgreSQL + raw `pg` queries.
> Prisma baad mein comparison ke liye (Hybrid path).

---

## Table of contents

1. [CMS kya hota hai](#1-cms-kya-hota-hai)
2. [Architecture (layers)](#2-architecture-layers)
3. [Raw SQL vs Prisma](#3-raw-sql-vs-prisma)
4. [Foundation: database, pool, migrations, env](#4-foundation-database-pool-migrations-env)
5. [Authentication: register, login, bcrypt, JWT](#5-authentication-register-login-bcrypt-jwt)
6. [Auth guard: protected APIs](#6-auth-guard-protected-apis)
7. [RBAC: roles & permissions](#7-rbac-roles--permissions)
8. [Content: draft / publish workflow](#8-content-draft--publish-workflow)
9. [Slug](#9-slug)
10. [Categories: many-to-many](#10-categories-many-to-many)
11. [Media library & featured images](#11-media-library--featured-images)
12. [Search & pagination](#12-search--pagination)
13. [Admin UI vs public site](#13-admin-ui-vs-public-site)
14. [Users management (Admin)](#14-users-management-admin)
15. [SEO](#15-seo)
16. [Activity logs (audit trail)](#16-activity-logs-audit-trail)
17. [HTTP status codes: cheat sheet](#17-http-status-codes-cheat-sheet)
18. [Dev commands & troubleshooting](#18-dev-commands--troubleshooting)
19. [Interview / code-review questions](#19-interview--code-review-questions)
20. [Glossary](#20-glossary)

---

## 1. CMS kya hota hai

**CMS (Content Management System)** = ek control panel jahan non-technical log (marketing, writers, SEO team) **bina developer ke** content create, edit, publish kar sakein.

| CMS ke bina | CMS ke saath |
|---|---|
| Headline badalne ke liye developer ko bolo, 2 din wait | Writer khud edit karke publish |
| Koi bhi kuch bhi delete kar de | Roles decide karte hain kaun kya kar sakta hai |
| Half-written post live ho sakta hai | Draft → Publish workflow |

**Do duniya:**

| Surface | Kaun use karta hai | Example URL |
|---|---|---|
| **Admin (back office)** | Team: Admin, Editor, SEO | `/admin/content` |
| **Public site (front)** | Visitors, Google | `/posts`, `/posts/[slug]` |

> Yaad rakho: Developer **system** banata hai, content team **content** bharti hai.

---

## 2. Architecture (layers)

```
UI (page / form)
   ↓  fetch with Bearer token
API route (src/app/api/...)        → request/response, status codes
   ↓
Service (src/services/...)         → business rules (validation, permissions)
   ↓
Query (src/db/queries/...)         → sirf SQL
   ↓
PostgreSQL
```

**Kyun alag layers?**
- API route patla rehta hai: sirf input lo, service call karo, response bhejo.
- Business rules ek jagah (service): "title required", "slug unique", "draft public pe nahi".
- SQL ek jagah (queries): DB badle ya Prisma aaye to sirf yeh layer badlegi.

| Folder | Kaam |
|---|---|
| `src/app/api/` | HTTP endpoints |
| `src/services/` | Business logic |
| `src/db/queries/` | SQL |
| `src/lib/` | Shared helpers: `db/pool.ts`, `jwt.ts`, `auth.ts`, `api-client.ts` |
| `src/types/` | TypeScript types |
| `src/components/` | UI components (`ui/`, `admin/`, `public/`) |
| `sql/migrations/` | Database changes (versioned) |
| `scripts/` | CLI scripts (migrate, seed, assign-role) |

---

## 3. Raw SQL vs Prisma

| Approach | Example | Level |
|---|---|---|
| Raw SQL (`pg`) | `SELECT * FROM users WHERE email = $1` | Sabse foundational |
| Query builder | `db.select().from('users')` | Beech ka |
| ORM (Prisma) | `prisma.user.findUnique(...)` | Zyada abstraction |

**Humne pehle raw SQL kyun liya:** SQL samajh aayega to koi bhi ORM samajh aayega. Prisma ek productivity tool hai, SQL ka replacement nahi.

---

## 4. Foundation: database, pool, migrations, env

### Connection pool
- Har request pe naya DB connection banana slow aur mehenga hai.
- **Pool** = kuch connections ready rakhta hai, requests unhe reuse karti hain.
- File: `src/lib/db/pool.ts` (`max: 10`).
- Development mein pool `globalThis` pe cache hota hai, kyunki hot-reload har save pe naya pool bana deta aur connections khatam ho jaate.

### Parameterized queries (`$1`, `$2`)
```ts
query("SELECT * FROM users WHERE email = $1", [email]);
```
- Value alag bheji jaati hai, SQL string mein jodi nahi jaati.
- Isse **SQL injection** se bachaav hota hai. Kabhi bhi string jod ke SQL mat banao.

### Migrations
- Database changes ko **numbered SQL files** mein rakhte hain: `000_...sql`, `001_...sql`.
- `schema_migrations` table yaad rakhti hai kaunsi file chal chuki hai.
- `npm run db:migrate` sirf nayi files chalata hai.
- **Rule:** jo migration chal chuki hai use edit mat karo. Nayi migration banao (jaise `008_live_news_category.sql`).

| File | Kya banaya |
|---|---|
| `001` | `users` |
| `002` | `roles`, `permissions`, `role_permissions`, `user_roles` + seed |
| `003` | `content` |
| `004` | `categories`, `content_categories` |
| `005` | `media` |
| `006` | Editor ko `content.delete` |
| `007` | `content.featured_image_url` |
| `008` | "Live News" category |
| `009` | SEO columns: `meta_title`, `meta_description`, `og_image_url`, `canonical_url` |
| `010` | `activity_logs` table, append-only trigger, `activity.read` permission |

### `.env`
- Secrets yahan: `DATABASE_URL`, `JWT_SECRET`.
- `.env` **kabhi commit nahi** karte. `.env.example` (bina asli values) commit hota hai, taaki naya developer jaane kaunse variables chahiye.

### Health API
- `GET /api/health`: server aur DB chal raha hai ya nahi.
- **Public** hai, kyunki monitoring tools bina login check karte hain (building ke bahar "OPEN" board jaisa).

---

## 5. Authentication: register, login, bcrypt, JWT

### Password kabhi plain text mein nahi
- DB mein `password_hash` save hota hai, asli password nahi.
- **bcrypt** one-way hash hai: hash se password wapas nahi nikal sakte.
- Login pe `bcrypt.compare(password, hash)` se match karte hain.
- Isliye "user ka password batao" possible hi nahi. Sirf reset ho sakta hai.

### `BCRYPT_ROUNDS = 10`
- 10 = **cost factor** (2^10 rounds), **hash ki length nahi**.
- Zyada rounds = slow hashing = brute-force attack mehenga.
- Hash mein `$2b$10$...` dikhta hai: `2b` = bcrypt version, `10` = rounds.

### Login security
- Galat email ho ya galat password, **same message**: "Invalid email or password".
- Kyun? Warna attacker guess kar leta ki kaunse emails registered hain (**email enumeration**).

### JWT (JSON Web Token)
- Login ke baad server ek **signed token** deta hai, jaise temporary ID card.
- Payload: `userId`, `email`. Expiry: **7 din** (`src/lib/jwt.ts`).
- `JWT_SECRET` se sign hota hai. Secret ke bina koi fake token nahi bana sakta.
- Frontend token `localStorage` mein `cms_token` naam se rakhta hai (`src/lib/auth-storage.ts`).
- Har protected request mein header: `Authorization: Bearer <token>`.

> Note: JWT **encrypted nahi**, sirf **signed** hai. Koi bhi payload padh sakta hai, isliye usme password ya secret data kabhi mat daalo.

---

## 6. Auth guard: protected APIs

`requireAuth(request)` (`src/lib/auth.ts`):
1. Header se Bearer token nikalo. Nahi hai → 401.
2. Token verify karo. Galat/expired → 401.
3. DB se user lao. Delete/inactive hai → 401.
4. User return karo.

**Step 3 kyun?** Token 7 din valid rehta hai. Agar beech mein user deactivate ho gaya, token phir bhi valid dikhega. DB check se turant block ho jaata hai.

| API | Public / protected | Kyun |
|---|---|---|
| `/api/health` | Public | Monitoring |
| `/api/auth/login`, `/register` | Public | Login se pehle token hota hi nahi |
| `/api/auth/me` | Protected | "Main kaun hoon" private info hai |
| `/api/public/posts` | Public | Sirf published content |
| `/api/content`, `/api/media`, `/api/users` | Protected | Admin kaam |

---

## 7. RBAC: roles & permissions

### Authentication vs authorization

| Term | Sawal | Fail hone pe |
|---|---|---|
| **Authentication** | "Tum kaun ho?" | **401** |
| **Authorization** | "Kya tum yeh kar sakte ho?" | **403** |

> Sahi line: "Sarah **authenticated** hai, lekin SEO update ke liye **authorized** nahi, isliye 403."

### Structure
```
User ──< user_roles >── Role ──< role_permissions >── Permission
```
- User ko seedha permission nahi dete. **Role** dete hain, role ke paas permissions hoti hain.
- Kyun? 50 editors hain aur editor ko nayi permission deni hai: sirf role update karo, 50 users nahi.

### Permissions
`content.read`, `content.create`, `content.update`, `content.publish`, `content.delete`, `media.upload`, `seo.update`, `users.manage`, `roles.manage`

### Roles

| Role | Permissions |
|---|---|
| **admin** | Sab |
| **editor** | content read/create/update/publish/delete, media.upload |
| **seo_specialist** | content.read, content.update, seo.update |
| **viewer** | content.read |

### `requirePermission(user, "key")`
- `src/services/rbac.service.ts`.
- Permissions **har request pe DB se** check hoti hain, JWT mein nahi rakhi.

**Permissions JWT mein kyun nahi rakhi?**
1. **Stale data:** Admin ne role hata diya, lekin token mein purani permissions 7 din tak chalti rahengi.
2. **Revoke nahi kar sakte:** signed token ko beech mein badal nahi sakte.
3. **Token bada hota hai:** har request ke saath extra bytes.

Trade-off: har request pe ek DB query. Learning/medium scale pe yeh theek hai. Bade scale pe cache (Redis) lagate hain.

### UI vs API security
- AdminShell "Users" link chhupata hai agar `users.manage` nahi hai. Yeh sirf **convenience** hai.
- **Asli security API mein hai** (`requirePermission`). Koi direct API call kare to bhi 403 milega.

> Rule: UI chhupana security nahi hai. Hamesha server pe check karo.

---

## 8. Content: draft / publish workflow

### Status

| Status | Public pe dikhta? | Matlab |
|---|---|---|
| `draft` | Nahi | Kaam chal raha hai |
| `published` | Haan | Live |
| `archived` | Nahi | Hataya, lekin delete nahi |

- DB mein `CHECK (status IN ('draft','published','archived'))`: galat value DB hi reject kar deta hai.
- `published_at`: pehli baar publish pe set hota hai (`COALESCE(published_at, NOW())`). Unpublish karke dobara publish karo to original date bachi rehti hai.

### Golden rule
> Public APIs aur pages **sirf** `status = 'published'` return karte hain.

"Drafts admin-only" ka matlab: drafts **public site pe nahi** dikhte. Iska matlab "sirf Admin role dekh sakta hai" nahi hai. Editor bhi admin panel mein drafts dekhta hai.

### Actions

| Action | API | Permission |
|---|---|---|
| Create draft | `POST /api/content` | `content.create` |
| Edit | `PATCH /api/content/:id` | `content.update` |
| Publish | `POST /api/content/:id/publish` | `content.publish` |
| Unpublish | `POST /api/content/:id/unpublish` | `content.publish` |
| Delete | `DELETE /api/content/:id` | `content.delete` |

- `author_id ... ON DELETE RESTRICT`: jis user ke posts hain use delete nahi kar sakte. History safe rehti hai.

---

## 9. Slug

**Slug** = post ka URL-friendly unique naam.

| | Example |
|---|---|
| Title | NovaCMS 1.2 — Media Library & Roles |
| Slug | `novacms-1-2-release-notes` |
| URL | `/posts/novacms-1-2-release-notes` |

Rules: lowercase, spaces → `-`, special characters hatao, **unique** (`content_slug_unique`).

- Slug blank chhodo to title se auto banta hai (`src/lib/slugify.ts`).
- Duplicate ho to `-2`, `-3` lag jaata hai (`ensureUniqueSlug`).
- **Published post ka slug mat badlo.** Purane links 404 denge aur Google ranking kho jaati hai. Badalna hi ho to **301 redirect** lagao.

---

## 10. Categories: many-to-many

- Ek post ki kai categories ho sakti hain, aur ek category mein kai posts.
- Isliye beech mein **junction table**: `content_categories (content_id, category_id)`.

```
content ──< content_categories >── categories
```

- `PRIMARY KEY (content_id, category_id)`: same pair do baar nahi.
- `ON DELETE CASCADE`: post delete hua to uski category links bhi apne aap delete.
- Public filter: `/posts?category=blog` (`EXISTS` subquery).

Categories: Blog, News, Tutorials, Live News.

---

## 11. Media library & featured images

### Upload flow
1. Admin → **Media** → Choose File → **Upload**.
2. Server checks: size ≤ 5 MB, type JPEG/PNG/WebP/GIF/PDF. Fail → 400.
3. File ka naam **random UUID** rakhte hain (user ka naam nahi). Isse naam takraate nahi aur `../../` jaisi path tricks nahi chalti.
4. File `public/uploads/` mein, record `media` table mein, URL `/uploads/<uuid>.jpg`.
5. DB insert fail ho to disk se file bhi delete. Orphan files nahi bachti.

### Featured image
- `content.featured_image_url` (migration `007`).
- Edit/New post → **Featured image** → URL paste karo ya **Pick from Media Library**.
- Public card aur post page pe dikhta hai.

> External image links (jaise Unsplash) kabhi bhi 404 de sakte hain. Hamare demo mein yahi hua tha. Production mein apni storage use karo.

**Production note:** `public/uploads` local disk hai. Real company mein S3 / Cloudinary jaise cloud storage use hota hai, kyunki multiple servers pe local disk share nahi hoti.

---

## 12. Search & pagination

```sql
WHERE c.title ILIKE '%' || $2 || '%'
ORDER BY c.updated_at DESC
LIMIT $4 OFFSET $5
```

- `ILIKE` = case-insensitive search.
- `LIMIT` = ek page mein kitne, `OFFSET` = kitne skip karne.
- `offset = (page - 1) * pageSize`.
- Do queries: ek `COUNT(*)` (total pages ke liye), ek actual data.
- `pageSize` max 50 tak clamp hai, taaki koi `?pageSize=100000` bhej ke DB na giraye.

**Limitation:** `OFFSET` bade data pe slow hota hai (DB ko skip wali rows bhi padhni padti hain). Bade scale pe **cursor pagination** (`WHERE id > last_id`) use hota hai.

---

## 13. Admin UI vs public site

| | Public | Admin |
|---|---|---|
| Header | NovaCMS · Posts · Admin login | Dark sidebar: Content, Categories, Media, Users |
| Login | Nahi chahiye | Chahiye |
| Content | Sirf published | Draft + published |

- Public header mein admin links **nahi** hone chahiye. Visitors ko back-office dikhana galat hai.
- Admin pe wapas jaane ke liye: **Admin login** ya seedha `/admin/content`.

UI kit: `src/components/ui/` (`Button`, `Badge`, `Panel`, `PageHeader`, `Alert`, `PaginationBar`).

---

## 14. Users management (Admin)

- Page: `/admin/users`, sirf `users.manage` wale (Admin).
- **Create user** form: name, email, password (min 8), roles.
- Har user ke roles checkbox se badal sakte ho → **Save roles**.

### User banane ke do tareeke

| Tareeka | API | Kaun | Token milta? |
|---|---|---|---|
| Admin create | `POST /api/users` | Admin, kisi aur ke liye | Nahi, Admin ki session same rehti hai |
| Self-register | `POST /api/auth/register` | Koi bhi, apne liye | Haan |

Dono same validation use karte hain (`createAccount` in `auth.service.ts`). Ek jagah rule, do jagah use.

---

## 15. SEO

**SEO (Search Engine Optimization)** = page ko Google ke liye samajhne layak aur results mein attractive banana.

### `<head>` tags
Page ka `<head>` user ko dikhta nahi, lekin Google aur social apps isko padhte hain.

```html
<title>How to Add a Featured Image | NovaCMS</title>
<meta name="description" content="Step-by-step guide..." />
<meta property="og:title" content="How to Add a Featured Image" />
<meta property="og:description" content="Step-by-step guide..." />
<meta property="og:image" content="https://site.com/uploads/demo.jpg" />
<link rel="canonical" href="https://site.com/posts/how-to-add-a-featured-image" />
```

| Tag | Analogy | Kahan dikhta hai |
|---|---|---|
| Meta title (`<title>`) | Dukaan ka board | Google ki blue line, browser tab, bookmark |
| Meta description | Board ke neeche tagline | Google result ke neeche 2 lines |
| OG tags (Open Graph) | Share card | WhatsApp, LinkedIn, Slack, Facebook preview |
| Canonical URL | "Asli address yeh hai" | Google ko duplicate URLs se bachata hai |

### Title vs meta title
- **Title** (`<h1>`): reader ke liye, page ke andar.
- **Meta title**: Google result ke liye, keywords + brand.
- Google bot **dono padhta hai**. Fark sirf yeh hai ki kahan dikhta hai.
- Alag isliye ki aksar alag log likhte hain (writer vs SEO specialist).

### OG = Open Graph
Facebook ka protocol, ab sab apps use karti hain.

| Card ka hissa | Tag |
|---|---|
| Photo | `og:image` |
| Heading | `og:title` |
| Neeche ki line | `og:description` |
| Link | `og:url` |

### Fallback rules (SEO fields optional hain)
```
meta_title khali       → title
meta_description khali → body ke pehle ~155 characters
og_image_url khali     → featured_image_url
```
Kuch na do to Google khud koi random text snippet bana leta hai. Fallback se control hamare paas rehta hai.

### Length

| Field | Ideal | Zyada ho to |
|---|---|---|
| Meta title | ~50–60 chars | `...` laga ke kat jaata hai |
| Meta description | ~150–160 chars | Kat jaata hai |

### Server pe kyun render?
Google bot page ka HTML padhta hai. Tags baad mein JavaScript se aaye to bot miss kar sakta hai. Next.js `generateMetadata` server pe DB se tags bana deta hai.

### Module 8: kya bana (built)

| Layer | File | Kaam |
|---|---|---|
| DB | `sql/migrations/009_content_seo.sql` | 4 nullable columns: `meta_title` (70), `meta_description` (170), `og_image_url`, `canonical_url` |
| Shared rules | `src/lib/seo.ts` | `resolveSeo()` fallback rules, length constants, URL check |
| Query | `updateContentSeo()` in `content.queries.ts` | 4 fields ek saath save |
| Service | `src/services/seo.service.ts` | Empty → `null`, length → 400, galat URL → 400 |
| API | `src/app/api/content/[id]/seo/route.ts` | `PATCH`, permission `seo.update` |
| Admin UI | `src/components/admin/SeoPanel.tsx` | Google preview, character counter, share image preview |
| Public | `src/app/posts/[slug]/page.tsx` | `generateMetadata` → `<title>`, description, canonical, OG, Twitter |
| Config | `src/app/layout.tsx` | `metadataBase` (relative URLs → full URLs) |

**Kaun kya kar sakta hai:** Admin + SEO Specialist save kar sakte hain. Editor ko panel read-only dikhta hai, aur API se try kare to 403. Bina login → 401.

### Design decisions (manager ko yahi batana)

1. **Alag table nahi, `content` mein columns.** 1 post = 1 SEO set. Alag table sirf extra JOIN hota.
2. **Alag API (`/seo`) kyun?** Har API ek permission check karti hai. Content edit = `content.update`, SEO = `seo.update`. Ek hi API mein dono mix karte to "Editor title badal sake lekin SEO nahi" wala rule likhna mushkil hota.
3. **Fallback rules ek file mein (`src/lib/seo.ts`).** Admin ka Google preview aur public page dono same function use karte hain. Isliye preview hamesha wahi dikhata hai jo Google ko milega.
4. **Do level ki length limit.** Recommended (60/160) sirf warning hai (counter orange). Hard limit (70/170) service mein 400 deti hai, aur DB `VARCHAR` last safety net hai.
5. **Khali string → `null`.** "Field khali" aur "field set nahi" ek hi cheez maani jaati hai, to fallback chal jaata hai.
6. **Custom meta title exactly as typed.** Fallback title pe hi `| NovaCMS` lagta hai. SEO specialist apna poora title control karta hai.
7. **`metadataBase`.** OG image aur canonical ko **full URL** chahiye (`http://site.com/uploads/x.jpg`), kyunki WhatsApp/Google ke paas hamara domain nahi hota. `metadataBase` relative path ko full URL bana deta hai. Value `.env` ke `NEXT_PUBLIC_SITE_URL` se aati hai. Production mein yahan asli domain daalna hai.
8. **React `cache()`.** `generateMetadata` aur page dono ko same post chahiye. `cache` se DB query ek request mein sirf ek baar chalti hai.
9. **Streaming metadata.** Normal browser ke liye Next.js metadata baad mein stream karta hai (page jaldi dikhe). Googlebot jaise bots ke liye metadata seedha `<head>` mein hota hai.

### Kaise test karein
- Admin → Content → Edit → neeche **SEO** panel → bharo → **Save SEO**.
- Public post kholo → browser tab mein naya title.
- `Ctrl + U` (page source) → `<title>`, `<meta name="description">`, `og:` tags.
- Sarah (Editor) se login → panel read-only. API try kare to 403.
- Live share preview test (deploy ke baad): [opengraph.xyz](https://www.opengraph.xyz) ya LinkedIn Post Inspector. Localhost pe yeh tools nahi pahunch sakte.

---

## 16. Activity logs (audit trail)

**Activity log** = har important action ka permanent record: **kaun, kya, kis cheez pe, kab.**

```
sarah@technova.com    content.delete     "My First Blog"     7 Oct 14:45
jaseem@technova.com   user.roles_update  sarah@technova.com  6 Oct 11:02
                        roles: viewer → editor
```

**Business reason:** kuch galat delete ya publish ho jaaye to company ko pata chale kisne kiya. Banks, hospitals aur bade clients ke security audits mein yeh zaroori hota hai.

### Kya log hota hai, kya nahi

| Log hota hai (data badalta hai) | Log nahi hota |
|---|---|
| content create / update / publish / unpublish / delete | Page views (yeh analytics ka kaam hai) |
| SEO update | List dekhna, post kholna |
| media upload / delete | Login/logout (security log, alag topic) |
| user create, roles change | Bina badlav ke "Save" |
| category create / update / delete | |

### Table design (`010_activity_logs.sql`)

| Column | Kyun |
|---|---|
| `actor_id` + `ON DELETE SET NULL` | User delete ho to sirf link tootega, log bachega. `CASCADE` hota to logs bhi mit jaate |
| `actor_email` | Snapshot: user delete hone ke baad bhi pata rahe kaun tha |
| `action` | `content.publish` jaisa naam |
| `entity_type` + `entity_id` | Kis cheez pe action hua. `entity_id` pe **foreign key nahi**, kyunki deleted cheezon ke logs bhi rakhne hain |
| `entity_label` | Snapshot: post ka us waqt ka title. Post delete ho jaaye ya naam badle, log padhne layak rahe |
| `changes` (JSONB) | `{ "title": { "from": "...", "to": "..." } }`. Har action ki details alag hoti hain, isliye flexible JSON column |
| Indexes | `created_at DESC` (timeline), `(entity_type, entity_id)` (ek post ki history), `actor_id` (ek user ki activity) |

### Append-only: teen level pe

1. **API:** sirf `GET /api/activity`. Edit/delete API hai hi nahi.
2. **Code:** `activity.queries.ts` mein sirf `INSERT` aur `SELECT`.
3. **Database trigger:** raw SQL se bhi `UPDATE`/`DELETE` → `activity_logs is append-only`.

**Trigger ka exception:** `ON DELETE SET NULL` khud ek `UPDATE` hai. Agar trigger har UPDATE rokta to koi user delete hi nahi ho paata. Isliye sirf "`actor_id` khali karna, aur kuch nahi" allowed hai.

**Limit (honestly):** DB superuser trigger band kar sakta hai. Production mein app kam-permission wale DB user se chalti hai, aur logs ki copy alag jagah bhi rakhte hain.

**Admin bhi logs delete nahi kar sakta.** Log Admin pe bhi nazar rakhta hai. Jo saboot mita sake, uska record bharose layak nahi.

### Transaction (sabse important naya concept)

Kai queries ko ek packet banana: **sab successful → COMMIT, ek bhi fail → ROLLBACK (sab undo).**

| | Bina transaction | Transaction ke saath |
|---|---|---|
| Post delete hua, log likhte waqt error | Post gayab, record bhi nahi | Dono cancel, post wapas |

Analogy: ATM transfer. Paise kat gaye aur pahunche nahi, aisa nahi ho sakta.

### Hamara transaction helper (`src/lib/db/transaction.ts`)

```ts
await withTransaction(async () => {
  await deleteContentById(id);          // normal query function
  await logActivity(actor, { ... });    // normal query function
});                                     // dono ek saath COMMIT, ya ROLLBACK
```

**Kaise kaam karta hai:**
- Transaction ke liye **ek hi DB connection** chahiye. `pool.query` har query ke liye alag connection utha sakta hai, isliye `pool.connect()` se ek client lete hain.
- Node ka **`AsyncLocalStorage`** us client ko "current async call chain" ke saath yaad rakhta hai.
- `query()` (`src/lib/db/query.ts`) check karta hai: transaction chal raha hai? To uska client use karo, warna pool.
- **Fayda:** kisi bhi existing query function ka signature nahi badla. Woh apne aap transaction mein shamil ho jaate hain.
- **Nested:** `withTransaction` ke andar dobara `withTransaction` → naya nahi khulta, bahar wale mein hi join hota hai.

**Bonus bug fix:** `setUserRolesByNames` pehle saare roles `DELETE` karta tha, phir `INSERT`. Beech mein error aata to user ke saare roles chale jaate. Ab yeh transaction mein hai.

**Disk files transaction mein nahi aati.** Media upload mein DB fail ho to file haath se delete karte hain. Media delete mein file **COMMIT ke baad** hi delete hoti hai.

### Kahan kya bana

| File | Kaam |
|---|---|
| `sql/migrations/010_activity_logs.sql` | Table, indexes, append-only trigger, `activity.read` permission (sirf Admin) |
| `src/lib/db/transaction.ts` | `withTransaction()` |
| `src/lib/db/query.ts` | Transaction ho to uska client use karta hai |
| `src/types/activity.ts` | Action names, types |
| `src/db/queries/activity.queries.ts` | Insert + list (filters, pagination) |
| `src/services/activity.service.ts` | `logActivity()`, `diffChanges()` (sirf badle hue fields), `getActivityPage()` |
| `src/app/api/activity/route.ts` | `GET`, permission `activity.read` |
| `src/app/admin/(dashboard)/activity/page.tsx` | Timeline: kaun, kya, kab, from → to, filters |
| Services (content, seo, media, rbac, auth, category) | Har action `withTransaction` + `logActivity` |

**`diffChanges()`:** pehle aur baad ka data compare karke sirf badle hue fields rakhta hai. Kuch nahi badla → `null` → log nahi banta. Lamba text (jaise body) 120 characters pe kaat diya jaata hai, taaki logs chhote rahein.

**Service signature change:** ab service functions pehla argument `actor` (kisne kiya) lete hain, jaise `deleteContent(user, id)`. Route `requireAuth` se user laata hai aur service ko de deta hai.

### Kaise test kiya
- Ek test post pe Jaseem/Sarah ne create, edit, publish, SEO, unpublish, delete kiya → 6 logs, sahi from → to ke saath. Bina badlav ka save → koi log nahi.
- Post delete hone ke baad bhi `/api/activity?entityId=...` se poori history mili.
- Sarah → `/api/activity` → 403. Bina login → 401.
- Rollback: action + log ke baad error daala → dono wapas.
- Raw SQL `UPDATE`/`DELETE` → trigger ne roka.

---

## 17. HTTP status codes: cheat sheet

| Range | Matlab | Yaad |
|---|---|---|
| **2xx** | Success | "Ho gaya" |
| **3xx** | Redirect | "Kahin aur jao" |
| **4xx** | **Client** ki galti | "Tumne galat bheja" |
| **5xx** | **Server** ki galti | "Humse gadbad hui" |

> Debug ka pehla clue: 4xx → request/frontend dekho. 5xx → backend logs dekho.

### 2xx
| Code | Naam | Kab | CMS example |
|---|---|---|---|
| 200 | OK | Success + data | List, login |
| 201 | Created | Naya record bana | Naya draft, naya user |
| 204 | No Content | Success, body nahi | Delete (hum 200 + message bhejte hain) |

### 3xx
| Code | Naam | Kab | Example |
|---|---|---|---|
| 301 | Moved Permanently | URL hamesha ke liye badla | Slug change; Google bhi shift ho jaata hai |
| 302 / 307 | Temporary | Abhi ke liye kahin aur | Bina login `/admin` → `/admin/login` |
| 308 | Permanent (method same) | 301 jaisa, POST POST rehta hai | API migration |
| 304 | Not Modified | Cached copy use karo | Images/CSS |

### 4xx
| Code | Naam | Kab | CMS example |
|---|---|---|---|
| 400 | Bad Request | Data galat/missing | Title khali, email format galat, file 5MB se badi |
| 401 | Unauthorized (asal mein Unauthenticated) | Token nahi/galat/expired | Bina login `/api/auth/me`, galat password |
| 403 | Forbidden | Login hai, permission nahi | Sarah → `/api/users` |
| 404 | Not Found | Exist nahi karta | Galat slug, deleted post |
| 405 | Method Not Allowed | URL sahi, method galat | GET-only route pe DELETE |
| 409 | Conflict | Duplicate / state clash | Same email dobara |
| 422 | Unprocessable Entity | Format sahi, rule fail | Kuch teams validation ke liye |
| 429 | Too Many Requests | Rate limit | Login brute-force rokna |

### 5xx
| Code | Naam | Kab |
|---|---|---|
| 500 | Internal Server Error | Code bug / crash |
| 502 | Bad Gateway | Proxy ko backend se galat jawab |
| 503 | Service Unavailable | Server down / maintenance / DB nahi mil raha |
| 504 | Gateway Timeout | Backend slow, time pe jawab nahi |

### Common confusions
```
401 vs 403 → Kaun ho pata nahi (401) | Pata hai, ijazat nahi (403)
400 vs 409 → Data hi galat (400)     | Data sahi, pehle se exist (409)
404 vs 403 → Hai hi nahi (404)       | Hai, access nahi (403)
```

### Hamare code mein mapping
```
UnauthorizedError                       → 401
ForbiddenError                          → 403
AuthError / ContentError / MediaError   → apna statusCode (400 / 404 / 409)
Baaki sab                               → 500 + console.error
```
> 500 pe user ko sirf "Internal server error" dikhao. Asli error sirf server log mein, warna DB details leak ho sakti hain.

**Manager ke liye ek line:** "2xx success, 3xx redirect, 4xx client error, 5xx server error. 401 = identity verify nahi hui, 403 = identity verified hai lekin permission nahi."

---

## 18. Dev commands & troubleshooting

```powershell
npm run dev                  # development server (auto-reload)
npm run dev -- -p 5000       # specific port pe
npm run build; npm start     # production build + run
npm run db:migrate           # nayi migrations chalao
npm run db:seed-demo         # demo posts
npm run db:fix-demo-images   # demo images local download
npm run db:assign-role -- sarah@technova.com editor
```

### `npm run dev` vs `npm start`
| | `npm run dev` | `npm start` |
|---|---|---|
| Mode | Development | Production |
| Code change | Turant dikhta hai | **Nahi dikhta**, pehle `npm run build` |
| Kab | Learning / coding | Deploy |

> Real bug jo humne dekha: port 3000 pe `next start` chal raha tha, isliye "Create user" form dikh hi nahi raha tha. Code sahi tha, build purana tha.

### Common issues
| Problem | Wajah | Fix |
|---|---|---|
| Change nahi dikh raha | Production build chal raha hai | `npm run dev` ya rebuild |
| Port busy | Doosra app usi port pe | `-p 5000` ya purana process band |
| Image broken | External URL 404 | Media Library se upload |
| 401 har jagah | Token expire / missing | Dobara login |
| 403 | Role mein permission nahi | Users page se role do |
| PowerShell crash on paste | Multi-line paste | One-line commands use karo |

### Demo accounts
- Admin: `jaseem@technova.com`
- Editor: `sarah@technova.com`

Passwords is file mein nahi likhe. Yeh file git mein jaa sakti hai, aur passwords repo mein kabhi nahi rakhte.

---

## 19. Interview / code-review questions

1. **Layers kyun alag kiye?** Route patla, rules service mein, SQL queries mein. Testing aur change easy.
2. **Password kaise store karte ho?** bcrypt hash, cost 10. Plain text kabhi nahi.
3. **Login galat ho to same message kyun?** Email enumeration rokne ke liye.
4. **JWT mein kya hai, kya nahi?** `userId`, `email`. Permissions nahi (stale, revoke nahi ho sakta).
5. **requireAuth DB se user kyun laata hai?** Deactivated user ka valid token bhi block ho.
6. **401 vs 403?** Authentication fail vs authorization fail.
7. **User ko seedha permission kyun nahi?** Role se manage karna scale karta hai.
8. **UI mein link chhupana kaafi hai?** Nahi. Asli check API pe.
9. **Draft public pe kaise nahi aata?** Public queries mein `status = 'published'` hard filter.
10. **Many-to-many kaise banaya?** Junction table `content_categories`.
11. **SQL injection se kaise bache?** Parameterized queries (`$1`).
12. **Upload safe kaise?** Size + MIME check, random UUID filename, DB fail pe file cleanup.
13. **OFFSET pagination ki limitation?** Bade data pe slow. Cursor pagination better.
14. **Slug badalne ka risk?** Broken links, SEO loss. 301 redirect chahiye.
15. **Migration edit kyun nahi karte?** Doosre machines pe already chal chuki. Nayi migration banao.
16. **Meta title alag kyun?** Reader vs Google ki zarurat alag. Fallback se optional.
17. **SEO tags server pe kyun?** Bot ko HTML mein turant mil jaayein.
18. **SEO ki alag API kyun?** Alag permission (`seo.update`); Editor content edit kare lekin SEO nahi.
19. **Admin preview aur public page same kaise dikhate hain?** Dono `resolveSeo()` use karte hain, ek hi source of truth.
20. **`metadataBase` kya karta hai?** Relative URL (`/uploads/x.jpg`) ko full URL banata hai, jo OG aur canonical ke liye zaroori hai.
21. **User delete pe logs kyun nahi hatte?** `ON DELETE SET NULL` + `actor_email` snapshot. `CASCADE` saboot mita deta.
22. **`entity_id` pe foreign key kyun nahi?** Deleted cheezon ke logs bhi rakhne hain. Naam `entity_label` mein copy hai.
23. **Action aur log ek saath kaise save hote hain?** `withTransaction()`: dono COMMIT ya dono ROLLBACK.
24. **Har query function mein client pass kiye bina transaction kaise?** `AsyncLocalStorage`: `query()` khud transaction ka client utha leta hai.
25. **Logs ko badalne se kaise rokte ho?** API nahi, code mein sirf insert/select, aur DB trigger. Admin bhi nahi badal sakta.
26. **Page views log kyun nahi?** Data nahi badalta, aur volume itna ki asli logs dab jaate. Woh analytics ka kaam hai.

---

## 20. Glossary

| Word | Matlab |
|---|---|
| CMS | Content Management System |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token: signed login token |
| Bearer token | `Authorization: Bearer <token>` header |
| bcrypt | Password hashing algorithm |
| Hash | One-way conversion; wapas original nahi milta |
| Pool | Reusable DB connections |
| Migration | Versioned DB change file |
| Slug | URL-friendly unique naam |
| Junction table | Many-to-many ke beech ki table |
| CASCADE | Parent delete → child bhi delete |
| RESTRICT | Child hai to parent delete nahi hoga |
| Draft / Published | Kaam chal raha / live |
| SEO | Search Engine Optimization |
| Meta tags | `<head>` mein page ki info |
| OG (Open Graph) | Social share card ke tags |
| Canonical | Page ka asli URL |
| SSR | Server-side rendering: HTML server pe banta hai |
| Enumeration | Guess karke pata lagana ki kya exist karta hai |
| SQL injection | User input se malicious SQL chalana |

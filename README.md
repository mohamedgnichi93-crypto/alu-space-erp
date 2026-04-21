# ALU SPACE ERP

Application web de gestion de facturation pour ALU SPACE (menuiserie aluminium).

## Fonctionnalités

- 🔐 **Sécurité** — Authentification Supabase + Row Level Security
- 📋 **Journal d'activité** — Traçabilité complète de toutes les actions
- 📄 **Factures professionnelles** — Génération PDF au format A4 multi-pages
- 👤 **Gestion clients** — CRM léger intégré
- 📦 **Gestion produits & stock** — Avec alertes stock bas
- 📊 **Statistiques** — Tableaux de bord, CA mensuel, top clients/produits
- ⚙️ **Paramètres** — TVA, FODEC, Timbre, Logo, Tampon entièrement configurables

## Architecture

### Structure des fichiers

```
project/
├── index.html                          # SPA shell + script loading
├── config.js                           # Supabase credentials + constants
├── styles.css                          # Global styles
├── vercel.json                         # Vercel deploy config + security headers
├── package.json                        # Local dev only (npx serve .)
├── .gitignore
├── README.md
├── assets/
│   └── logo.png                        # Company logo
├── js/
│   ├── 01-utils.js                     # Helpers: $, escapeHTML, toast, modal, debounce
│   ├── 02-num2words.js                 # Number → French words (Tunisian dinar)
│   ├── 03-state.js                     # Global state + boot/session flow
│   ├── 04-auth.js                      # Login/logout
│   ├── 05-audit.js                     # Audit log writer
│   ├── 06-data.js                      # Supabase data loaders + totals
│   ├── 07-nav.js                       # View router + mobile menu
│   ├── 10-view-dashboard.js            # Dashboard
│   ├── 11-view-invoices-list.js        # Invoice list
│   ├── 12-view-invoice-editor.js       # Invoice editor + save + autocomplete
│   ├── 13-view-clients.js              # Clients CRUD
│   ├── 14-view-products.js             # Products CRUD
│   ├── 15-view-stats.js                # Statistics
│   ├── 16-view-audit.js                # Audit log viewer
│   ├── 17-view-settings.js             # Company settings + logo upload
│   └── 20-pdf-generator.js             # PDF generation (jsPDF)
└── supabase/
├── schema.sql                       # ← RUN THIS FIRST (full schema + RLS)
└── 03_bootstrap_shared_account.sql # ← RUN THIS SECOND (creates user + workspace)
```

### Flux de chargement JavaScript

Les fichiers JS sont chargés **en séquence** via `<script>` tags dans index.html :

1. **config.js** — Credentials Supabase
2. **01-utils.js** — Fonctions utilitaires (point d'entrée `boot()`)
3. **02-num2words.js** — Conversion nombre → lettres
4. **03-state.js** — État global + postLoginFlow
5. **04-auth.js** — Authentification
6. **05-audit.js** — Audit logging
7. **06-data.js** — Data loaders
8. **07-nav.js** — Navigation
9. **10-17** — Vues (chargées à la demande via `render(view)`)
10. **20-pdf-generator.js** — PDF (appelé via `downloadInvoicePDF()`)

Chaque fichier dépend des précédents via des références globales (`$()`, `state`, `toast()`, etc.).

## Stack technique

- **Frontend** : HTML/CSS/JavaScript vanilla (pas de framework)
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **PDF** : jsPDF + jsPDF-AutoTable
- **Charts** : Chart.js (lazy-loaded)
- **Hébergement** : Vercel (static hosting, zéro build step)

## Getting Started

### 1. Supabase Setup
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → run `supabase/schema.sql`
3. Go to SQL Editor → run `supabase/03_bootstrap_shared_account.sql` (edit email/password first)
4. In Auth → Providers: disable "Allow new users to sign up"

### 2. Configure the app
Edit `config.js`:
- Set `SUPABASE_URL` to your project URL
- Set `SUPABASE_PUBLISHABLE_KEY` to your anon/publishable key

### 3. Run locally
```bash
npx serve .
```
Then open http://localhost:3000

### 4. Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel → Framework: Other → No build command
3. Deploy

## Sécurité

- ✅ Les clés Supabase (publishable) sont **conçues pour être publiques**
- ✅ La vraie sécurité vient des **Row Level Security policies** dans la base
- ✅ Toutes les données sont isolées par workspace_id
- ✅ Toutes les actions sont tracées dans le journal d'activité
- ✅ Content-Security-Policy strict (vercel.json)
- ✅ X-Frame-Options: DENY, noindex/nofollow

## Modifications récentes (Refactor v1.0)

### ✅ Completed
- Monolithic app.js (1634 lignes) → 17 fichiers modulaires
- Débounce sur recherches (300ms)
- Lazy-load Chart.js (chargé uniquement si dashboard/stats)
- Double-click guard sur Save facture (flag savingInvoice)
- In-place DOM update sur pickProduct (pas de re-render complet)
- Autocomplete close on outside-click
- Single shared account (pas de workspace choice/pending screens)
- Comprehensive JSDoc comments
- Try/catch error handling partout

### Security fixes
- CSP + HSTS headers dans vercel.json
- Workspace RLS policies
- XSS protection via escapeHTML()

## Licence

Privé — propriété de ALU SPACE

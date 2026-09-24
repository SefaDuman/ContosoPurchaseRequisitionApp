# Buy@Contoso

An internal procurement app for Contoso employees that replaces ad‑hoc Jira intake
with a guided, e‑commerce‑like experience. Built as a **Power Apps code app**
(React + TypeScript + Vite + the `@microsoft/power-apps` SDK) on top of
**Dynamics 365 Finance & Operations tables exposed as Dataverse virtual entities**.

Dynamics 365 F&O remains the system of record — the Dataverse virtual entities are
just the access surface. The demo legal entity is **USMF**.

## Screens

1. **Catalog** (home) — category tree, product cards, search, add‑to‑cart with a
   quantity selector, and a non‑catalog free‑text request option.
2. **Cart / Create requisition** — review cart lines, pick the requester, set the
   business justification and requested date, then submit a purchase requisition
   header + lines.
3. **My requisitions** — the current user's requisitions with status, total, lines
   and an approval‑progress indicator.
4. **Approvals** — approver queue with Approve / Reject / Request‑change and a comment.

## Architecture

```
src/
  models/            Clean app domain models (decoupled from generated types)
  services/          Typed service layer wrapping the generated Dataverse services
    catalogService   getCategoryTree / getProductsByCategory / searchProducts
    requisitionService  createRequisition / getMyRequisitions / getPendingApprovals / decideApproval
    workerService    getWorkers / resolveWorker (preparer constraint)
    imageResolver    Pluggable product image resolver (placeholder / CDN / map)
    config           Company scoping + option‑set (enum) value maps
    errors, paging   Centralised error handling + skipToken paging
  state/AppState     Cart + current‑company (USMF) + requester (React context)
  components/        CategoryTree + shared loading/empty/error UI
  screens/           Catalog / Cart / MyRequisitions / Approvals
  generated/         Auto‑generated Dataverse models + services (do not edit)
```

The UI imports only from `src/services` and `src/models` — it never touches the
generated `mserp_*` types directly. All reads/writes go through the generated
virtual‑entity services (no hand‑rolled OData/fetch).

## How the app maps to the connected Dataverse virtual entities

| Logical role | Dataverse virtual entity (entity set) | Generated service | Key fields used |
|---|---|---|---|
| Procurement category hierarchy | `mserp_ecoresproductcategoryentities` | `Mserp_ecoresproductcategoryentitiesService` | `mserp_categoryname`, `mserp_parentproductcategoryname`, `mserp_productcategoryhierarchyname` |
| Product → category assignment | `mserp_ecoresproductcategoryassignmententities` | `Mserp_ecoresproductcategoryassignmententitiesService` | `mserp_productnumber`, `mserp_productcategoryname`, `mserp_productcategoryhierarchyname` |
| Released products (catalog) | `mserp_ecoresreleasedproductv2entities` | `Mserp_ecoresreleasedproductv2entitiesService` | `mserp_productnumber`, `mserp_searchname`, `mserp_purchaseunitsymbol`, `mserp_purchaseprice` (indicative), `mserp_dataareaid` |
| Requisition header | `mserp_purchaserequisitionheaderv2entities` | `Mserp_purchaserequisitionheaderv2entitiesService` | `mserp_requisitionnumber/name/purpose/status`, `mserp_defaultbusinessjustificationdetails`, `mserp_defaultrequesteddate`, `mserp_preparerpersonnelnumber` |
| Requisition lines | `mserp_purchaserequisitionlinev2entities` | `Mserp_purchaserequisitionlinev2entitiesService` | `mserp_requisitionnumber`, `mserp_requisitionlinenumber`, `mserp_buyinglegalentityid`, `mserp_itemnumber`, `mserp_requestedpurchasequantity`, `mserp_purchaseprice` |
| Workers | `mserp_hcmworkerentities` | `Mserp_hcmworkerentitiesService` | `mserp_personnelnumber`, `mserp_name` |

### Notes and gotchas (handled in code)

- **Indicative pricing.** `mserp_purchaseprice` on released products is shown as
  *indicative only*. The final price is set by D365 trade agreements when the
  purchase order is created.
- **Enum / option‑set remapping.** The virtual entities surface F&O enums as
  Dataverse option‑set integers (not the raw F&O base values). These live in
  `src/services/config.ts`:
  - RequisitionPurpose: `Consumption = 200000000`, `Replenishment = 200000001`
  - RequisitionStatus: `Draft = 200000000`, `InReview = 200000001`,
    `Rejected = 200000002`, `Approved = 200000003`, …
- **Company scoping.** Product reads are filtered by `mserp_dataareaid eq 'USMF'`
  and each requisition line is stamped with `mserp_buyinglegalentityid = 'USMF'`
  (the header exposes no company field). Categories, assignments and workers are
  global.
- **Preparer must be a current worker.** F&O rejects a requisition if the preparer
  is not a current worker (“Preparer must be current worker”). `createRequisition`
  resolves and validates the personnel number against `mserp_hcmworkerentities`
  first (demo default `000001` Jodi Christiansen) and blocks submit with a clear
  message if it can't be resolved.
- **Approval is workflow‑driven.** `decideApproval` writes the status through the
  virtual entity to reflect intent; any F&O workflow restriction is surfaced to the
  user via centralised error handling.

## Connecting the data sources (`pac code add-data-source`)

All tables above are already connected as **Dataverse** data sources. To (re)add a
table, run — from the project root — the appropriate command. The `-t` value is the
Dataverse **table logical name**:

```powershell
pac code add-data-source -a dataverse -t mserp_ecoresproductcategoryentity
pac code add-data-source -a dataverse -t mserp_ecoresproductcategoryassignmententity
pac code add-data-source -a dataverse -t mserp_ecoresreleasedproductv2entity
pac code add-data-source -a dataverse -t mserp_purchaserequisitionheaderv2entity
pac code add-data-source -a dataverse -t mserp_purchaserequisitionlinev2entity
pac code add-data-source -a dataverse -t mserp_hcmworkerentity
```

Each command regenerates the typed models/services under `src/generated/` and
registers the data source in `power.config.json`.

## Product images

F&O product images are not exposed on the virtual entities, so the app resolves
images itself via a pluggable resolver (`src/services/imageResolver.ts`). The
default is an inline SVG placeholder. To override at bootstrap:

```ts
import { useCdnImageResolver, useImageMap } from './services';

useCdnImageResolver('https://cdn.example.com/products'); // <base>/<productNumber>.png
// or
useImageMap({ 'D0001': 'https://cdn.example.com/d0001.png' });
```

## Run locally

```powershell
npm install
copy power.config.example.json power.config.json   # then set appId + environmentId
pac code run
```

`pac code run` starts the Vite dev server and the Power Apps runtime so the
Dataverse virtual‑entity calls are authenticated against your environment.

> `power.config.json` holds your environment-specific `appId`/`environmentId`
> and is gitignored. Copy `power.config.example.json` to `power.config.json` and
> fill in your own values (or run `pac code init`) before running or pushing.

> Plain `npm run dev` will serve the UI, but data calls require the Power Apps
> runtime provided by `pac code run`.

## Build & push

```powershell
npm run build          # tsc + vite build -> ./dist
pac code push          # publish the code app to the Power Platform environment
```

## Tech stack

React 19 · TypeScript · Vite · `@microsoft/power-apps` SDK · Dataverse virtual
entities over Dynamics 365 F&O.

# Reports Module — Defect Report

**Prepared by:** Vendor (engagement team)
**Date:** April 27, 2026
**Scope:** `client/src/views/Reports.vue`, `client/src/App.vue`, `client/src/api.js`, `server/main.py`

---

## Summary

11 defects confirmed across the Reports module. The previous vendor left the component in a partially-built state: the API calls work but the component is architecturally disconnected from the rest of the app (filters have no effect, i18n is not applied, the code style does not match the rest of the codebase).

| ID | File | Severity | Category | Status |
|----|------|----------|----------|--------|
| D-01 | `App.vue:26` | Medium | i18n | Fixed |
| D-02 | `Reports.vue:127` | High | Architecture | Fixed |
| D-03 | `Reports.vue:156,162` | High | Architecture | Fixed |
| D-04 | `api.js` | High | Architecture | Fixed |
| D-05 | `Reports.vue` | Critical | Functionality | Fixed |
| D-06 | `server/main.py:231,276` | High | Functionality | Fixed |
| D-07 | `Reports.vue:4-5` | Medium | i18n | Fixed |
| D-08 | `Reports.vue:14-121` | High | i18n | Fixed |
| D-09 | `Reports.vue:31,85,108` | High | i18n | Fixed |
| D-10 | `Reports.vue:145-176` | Low | Code quality | Fixed |
| D-11 | `en.js` / `ja.js` | High | i18n | Fixed |

---

## Defect Details

### D-01 · App.vue:26 — Hardcoded "Reports" nav label

**Severity:** Medium  
**Category:** i18n

Every other navigation link in `App.vue` uses `t('nav.*')` for translation. The Reports link uses a hardcoded English string:

```html
<!-- Before -->
<router-link to="/reports">Reports</router-link>

<!-- After -->
<router-link to="/reports">{{ t('nav.reports') }}</router-link>
```

The `nav.reports` key was also missing from both `en.js` and `ja.js`.

---

### D-02 · Reports.vue:127 — Options API instead of Composition API

**Severity:** High  
**Category:** Architecture

The entire `<script>` block uses the Options API (`data()`, `mounted()`, `methods:`). Every other view in the codebase uses the Composition API with `setup()`. This is explicitly documented as the required pattern in `client/CLAUDE.md`.

Fixed by rewriting the component in Composition API.

---

### D-03 · Reports.vue:156,162 — Hardcoded API URLs

**Severity:** High  
**Category:** Architecture

The component bypasses `api.js` and calls the backend directly with hardcoded `localhost:8001` URLs:

```javascript
// Before
const quarterlyResponse = await axios.get('http://localhost:8001/api/reports/quarterly')
const monthlyResponse = await axios.get('http://localhost:8001/api/reports/monthly-trends')
```

No other view does this. If the API base URL changes, Reports breaks independently of everything else.

---

### D-04 · api.js — Missing Reports API methods

**Severity:** High  
**Category:** Architecture

`api.js` has methods for every other module (`getInventory`, `getOrders`, `getDashboardSummary`, etc.) but none for Reports. The absence of `getQuarterlyReports()` and `getMonthlyTrends()` is what forced the previous vendor to hardcode URLs in D-03.

---

### D-05 · Reports.vue — Filters completely disconnected

**Severity:** Critical  
**Category:** Functionality

The Reports component never imports or calls `useFilters()`. The global filter bar (Time Period, Location, Category, Order Status) has zero effect on the Reports page. Users can select filters and the data does not change — silent incorrect behavior.

Fixed by importing `useFilters`, passing `getCurrentFilters()` to API calls, and re-fetching when filter state changes.

---

### D-06 · server/main.py:231,276 — Backend ignores filter parameters

**Severity:** High  
**Category:** Functionality

Even if the frontend passed filter parameters, the backend `/api/reports/quarterly` and `/api/reports/monthly-trends` endpoints did not accept query parameters. Both endpoints always return all data regardless of warehouse, category, or month selection.

Fixed by adding `warehouse`, `category`, and `month` optional query params to both endpoints, matching the filter pattern used in `/api/orders` and `/api/inventory`.

---

### D-07 · Reports.vue:4-5 — Hardcoded page title and description

**Severity:** Medium  
**Category:** i18n

```html
<!-- Before -->
<h2>Performance Reports</h2>
<p>View quarterly performance metrics and monthly trends</p>
```

Every other view uses `t('module.title')` and `t('module.description')`. Fixed alongside D-11.

---

### D-08 · Reports.vue:14-121 — All table headers and labels untranslated

**Severity:** High  
**Category:** i18n

Every column header, section title, and stat label in the component is a hardcoded English string:
- "Quarterly Performance", "Quarter", "Total Orders", "Total Revenue", "Avg Order Value", "Fulfillment Rate"
- "Monthly Revenue Trend"
- "Month-over-Month Analysis", "Month", "Orders", "Revenue", "Change", "Growth Rate"
- "Total Revenue (YTD)", "Avg Monthly Revenue", "Total Orders (YTD)", "Best Performing Quarter"

Tokyo warehouse staff using the Japanese locale would see a fully-translated app except for the Reports page.

---

### D-09 · Reports.vue — Currency symbol hardcoded to `$`

**Severity:** High  
**Category:** i18n

Currency amounts throughout the template use a hardcoded `$` prefix:

```html
<td>${{ formatNumber(q.total_revenue) }}</td>
```

The app already has a `currentCurrency` computed value in `useI18n()` that returns `'JPY'` when the Japanese locale is active. The Reports component ignores this entirely, so Japanese users see USD amounts with a dollar sign.

Fixed by using `Intl.NumberFormat` with the locale-appropriate currency.

---

### D-10 · Reports.vue — Excessive console.log noise

**Severity:** Low  
**Category:** Code quality

14 `console.log()` calls were left in the component, including one that fires on every render of every bar in the chart (`getBarHeight` logs on each call). Removed entirely in the rewrite.

---

### D-11 · en.js / ja.js — Missing `reports` translation section

**Severity:** High  
**Category:** i18n

Neither locale file had any `reports.*` keys or a `nav.reports` entry. All translation keys required by the fixed component were added to both files.

---

## Root Cause

The Reports module was built last and left incomplete at contract end. The previous vendor used a different coding style (Options API, direct axios calls) consistent with earlier work that was never migrated, and did not connect the component to the shared filter and i18n infrastructure that was built for the rest of the app.

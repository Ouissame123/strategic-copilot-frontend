# WF_RH_Employment — référence n8n (GET/PUT)

Routes publiées (webhook path) :

- `GET /rh/talents/:id/employment`
- `PUT /rh/talents/:id/employment`

**Règles métier**

- Identifiant = `talent_id` dans l’URL uniquement (jamais `employment_id`).
- `contract_end_date` est sur **`public.talents`**, pas sur `talent_employment`.
- Ne jamais lire/écrire `te.contract_end_date`.

---

## 1. Nœud `[Route] Auth` (Code)

Parser le corps PUT et exposer `contract_end_date` :

```javascript
const clean = (v) => (v == null ? '' : String(v).trim());

const talentId =
  $json.params?.id ??
  $json.params?.talentId ??
  $json.query?.talent_id ??
  '';

const enterpriseId =
  $json.enterprise_id ??
  $json.auth?.enterprise_id ??
  $json.user?.enterprise_id ??
  '';

const body = $json.body ?? $json.json ?? {};
const salaryRaw = body.salary;

return [{
  json: {
    talent_id: clean(talentId),
    enterprise_id: clean(enterpriseId),
    method: ($json.method || $json.headers?.['x-http-method'] || 'GET').toUpperCase(),
    body: {
      role: clean(body.role),
      salary: salaryRaw != null && salaryRaw !== '' ? String(Number(salaryRaw)) : null,
      contract_type: clean(body.contract_type),
      integration_date: clean(body.integration_date),
      contract_end_date: clean(body.contract_end_date),
    },
  },
}];
```

---

## 2. Nœud `[GET] SELECT Employment` (Postgres)

```sql
SELECT
  t.id AS talent_id,
  t.name AS talent_name,
  te.role,
  te.salary,
  te.contract_type,
  te.integration_date,
  t.contract_end_date,
  CASE WHEN te.integration_date IS NOT NULL
    THEN EXTRACT(YEAR FROM age(CURRENT_DATE, te.integration_date))::int END AS tenure_years,
  CASE WHEN te.integration_date IS NOT NULL
    THEN (EXTRACT(YEAR FROM age(CURRENT_DATE, te.integration_date)) * 12
        + EXTRACT(MONTH FROM age(CURRENT_DATE, te.integration_date)))::int END AS tenure_months,
  t.manager_user_id,
  u.full_name AS manager_name,
  u.email AS manager_email,
  te.updated_at
FROM public.talents t
LEFT JOIN public.talent_employment te
  ON te.talent_id = t.id
 AND te.enterprise_id = t.enterprise_id
LEFT JOIN public.app_users u
  ON u.id = t.manager_user_id
WHERE t.id = $1::uuid
  AND t.enterprise_id = $2::uuid;
```

**Query parameters :** `{{ [$json.talent_id, $json.enterprise_id] }}`

---

## 3. Nœud `[GET] Build Response` (Code)

```javascript
const rows = $input.all();
const r = rows[0]?.json ?? {};

return [{
  json: {
    success: true,
    employment: {
      role: r.role || null,
      salary: r.salary != null ? Number(r.salary) : null,
      contract_type: r.contract_type || null,
      integration_date: r.integration_date || null,
      contract_end_date: r.contract_end_date || null,
      tenure_years: r.tenure_years ?? null,
      tenure_months: r.tenure_months ?? null,
      updated_at: r.updated_at || null,
    },
    manager: {
      manager_id: r.manager_user_id || null,
      manager_name: r.manager_name || null,
      manager_email: r.manager_email || null,
    },
  },
}];
```

---

## 4. Nœud `[PUT] Upsert Employment` (Postgres)

```sql
WITH upsert_emp AS (
  INSERT INTO public.talent_employment (
    talent_id,
    enterprise_id,
    role,
    salary,
    contract_type,
    integration_date,
    created_at,
    updated_at
  )
  SELECT
    $1::uuid,
    $2::uuid,
    NULLIF($3::text, ''),
    NULLIF($4::text, '')::numeric,
    NULLIF($5::text, ''),
    NULLIF($6::text, '')::date,
    NOW(),
    NOW()
  WHERE EXISTS (
    SELECT 1
    FROM public.talents t
    WHERE t.id = $1::uuid
      AND t.enterprise_id = $2::uuid
  )
  ON CONFLICT (talent_id) DO UPDATE SET
    role = COALESCE(EXCLUDED.role, public.talent_employment.role),
    salary = COALESCE(EXCLUDED.salary, public.talent_employment.salary),
    contract_type = COALESCE(EXCLUDED.contract_type, public.talent_employment.contract_type),
    integration_date = COALESCE(EXCLUDED.integration_date, public.talent_employment.integration_date),
    updated_at = NOW()
  RETURNING talent_id, role, salary, contract_type, integration_date, updated_at
),
update_talent AS (
  UPDATE public.talents t
  SET contract_end_date = COALESCE(NULLIF($7::text, '')::date, t.contract_end_date),
      updated_at = NOW()
  WHERE t.id = $1::uuid
    AND t.enterprise_id = $2::uuid
  RETURNING t.contract_end_date
)
SELECT
  e.talent_id,
  e.role,
  e.salary,
  e.contract_type,
  e.integration_date,
  ut.contract_end_date,
  e.updated_at
FROM upsert_emp e
LEFT JOIN update_talent ut ON true;
```

**Query parameters :**

```
{{ [
  $json.talent_id,
  $json.enterprise_id,
  $json.body.role || '',
  $json.body.salary || '',
  $json.body.contract_type || '',
  $json.body.integration_date || '',
  $json.body.contract_end_date || ''
] }}
```

---

## 5. Nœud `[PUT] Build Response` (Code)

```javascript
const rows = $input.all();
const r = rows[0]?.json ?? {};

return [{
  json: {
    success: true,
    employment: {
      role: r.role || null,
      salary: r.salary != null ? Number(r.salary) : null,
      contract_type: r.contract_type || null,
      integration_date: r.integration_date || null,
      contract_end_date: r.contract_end_date || null,
      updated_at: r.updated_at || null,
    },
  },
}];
```

---

## 6. Interdictions

- Pas de PATCH.
- Pas de `employment_id` dans l’URL ou le body.
- Pas de `te.contract_end_date` dans le SQL.
- Pas de nouvelle route.

---

## 7. Publication

1. Appliquer les changements ci-dessus dans n8n.
2. **Save** puis **Activate** (ou republier le webhook production `/webhook/...`).
3. Tester (webhookId n8n — voir `VITE_RH_EMPLOYMENT_GET_URL` / `VITE_RH_EMPLOYMENT_PUT_URL`) :
   - `GET /webhook/c8636463-8c45-4aa9-a9f0-8d0103866ead/rh/talents/{uuid}/employment`
   - `PUT /webhook/22ddf7e2-6de0-4cbf-8160-66fabc1a0197/rh/talents/{uuid}/employment` avec body :
     ```json
     {
       "role": "Ingénieur",
       "salary": 15000,
       "contract_type": "CDI",
       "integration_date": "2024-01-15",
       "contract_end_date": ""
     }
     ```

Le frontend (`rh-employment.api.ts`) envoie désormais `contract_end_date` dans le PUT (chaîne vide si CDI sans fin).

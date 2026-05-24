-- [PUT] Upsert Employment — WF_RH_Employment
-- Params: $1 talent_id, $2 enterprise_id, $3 role, $4 salary, $5 contract_type,
--         $6 integration_date, $7 contract_end_date (talents table)

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

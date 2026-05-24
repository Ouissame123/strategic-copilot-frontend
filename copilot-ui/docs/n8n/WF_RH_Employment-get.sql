-- [GET] SELECT Employment — WF_RH_Employment
-- Params: $1 talent_id, $2 enterprise_id

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

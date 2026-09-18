-- Scan outcome from the classifier, including clarification requests.
-- outcome examples: fixable | not_fixable | clarification_requested | unresolved_after_clarification
-- scan_id ties a follow-up answer to the first photo scan.
-- scan_round: initial (first photo) | follow_up (user answered a clarifying question).
--
-- Clarification should be rare (prompt defaults to speed). Watch the rate:
--   select * from public.scan_clarification_rate();
-- A high rate means tighten the classifier prompt, not the app.

alter table public.scans
  add column if not exists outcome text,
  add column if not exists scan_id text,
  add column if not exists scan_round text;

create or replace function public.scan_clarification_rate()
returns table (
  clarification_requested bigint,
  initial_scans bigint,
  rate numeric
)
language sql
security definer
set search_path = public
as $$
  with initial as (
    select outcome
    from public.scans
    where coalesce(scan_round, 'initial') = 'initial'
      and outcome is not null
  )
  select
    count(*) filter (where outcome = 'clarification_requested'),
    count(*),
    case
      when count(*) = 0 then null
      else round(
        count(*) filter (where outcome = 'clarification_requested')::numeric
        / count(*),
        4
      )
    end
  from initial;
$$;

revoke all on function public.scan_clarification_rate() from public;
grant execute on function public.scan_clarification_rate() to anon, authenticated;

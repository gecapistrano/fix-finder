-- Token usage from the two-call Gemini pipeline.
-- classifier_tokens = Call 1. fallback_tokens = Call 2, or null when the item is fixable.

alter table public.scans
  add column if not exists classifier_tokens integer,
  add column if not exists fallback_tokens integer;

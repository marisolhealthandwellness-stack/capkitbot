-- Billing / subscription access control for CapKitBOT.
--
-- One billing row per household, and it is the single source of truth for whether
-- a household may use the bot: access = status 'active', OR status 'trialing' while
-- still before trial_ends_at (the no-card 7-day free trial).
--
-- Security: members may READ their own billing row (to see trial days left) but
-- there is deliberately NO write policy, so the browser (anon/auth) client can
-- never insert or update it. Only two things write here: the signup trigger below
-- (runs server-side) and the Stripe webhook (service-role key, bypasses RLS). This
-- is what stops a member from granting themselves access from the browser.

create table household_billing (
  household_id uuid primary key references households(id) on delete cascade,
  status text not null default 'trialing',   -- trialing | active | past_due | canceled
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table household_billing enable row level security;

create policy "household_billing: owner read"
  on household_billing for select
  using (household_id in (select id from households where owner_user_id = auth.uid()));

-- Every new household starts a 7-day free trial, created server-side so it does not
-- depend on (and cannot be forged by) the browser client.
create or replace function create_billing_on_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into household_billing (household_id, status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '7 days')
  on conflict (household_id) do nothing;
  return new;
end;
$$;

create trigger households_create_billing
  after insert on households
  for each row
  execute function create_billing_on_household();

-- Backfill existing households (including current beta testers) with a fresh 7-day
-- trial. They convert to paid or lose access when it ends, same as a new signup.
insert into household_billing (household_id, status, trial_ends_at)
select id, 'trialing', now() + interval '7 days'
from households
on conflict (household_id) do nothing;

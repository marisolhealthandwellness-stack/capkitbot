-- CapKitBOT initial schema
-- One household = one login (households.owner_user_id -> auth.users.id).
-- All tables are scoped by household_id and locked down with RLS so a
-- household can never read or write another household's rows.

create extension if not exists "pgcrypto";

create type age_band as enum ('under_6', '6_13', '14_17', '18_plus');
create type goal as enum ('leaner', 'faster', 'stronger', 'energy');
create type cook_skill as enum ('no_cook', 'newbie', 'average', 'chef');
create type prepared_food_level as enum ('from_scratch', 'batch_staples', 'grab_and_go');
create type store_tier as enum ('budget', 'grocery', 'specialty');
create type chat_role as enum ('user', 'assistant', 'system_event');

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- households -----------------------------------------------------------

create table households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Household',
  onboarding_state text not null default 'not_started',
  health_data_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index households_owner_user_id_idx on households(owner_user_id);

-- people ----------------------------------------------------------------
-- No sex field, no calorie fields, no goal_body_fat_pct, no exact age (only
-- the band). protein_g_day/protein_g_per_meal are computed in application
-- code (lib/targets.ts) and written here, never derived by the model.

create table people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  is_primary boolean not null default false,
  age_band age_band not null,
  weight_lbs numeric not null check (weight_lbs > 0),
  body_fat_pct numeric check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100)),
  goal goal not null,
  meals_per_day int not null check (meals_per_day between 2 and 5),
  avoid_notes text,
  cultural_foods text,
  diet_priority text,
  protein_g_day int not null,
  protein_g_per_meal int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_age_band_not_under_6 check (age_band <> 'under_6'),
  constraint people_leaner_requires_adult check (goal <> 'leaner' or age_band = '18_plus')
);

create index people_household_id_idx on people(household_id);

create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

-- household_capsule -------------------------------------------------------
-- One row per household: the food they keep and cook, plus kitchen context.

create table household_capsule (
  household_id uuid primary key references households(id) on delete cascade,
  proteins text[] not null default '{}',
  carbs text[] not null default '{}',
  produce text[] not null default '{}',
  spices_sauces text[] not null default '{}',
  fats text[] not null default '{}',
  cuisines text[] not null default '{}',
  recipes text,
  cook_skill cook_skill,
  prepared_food_level prepared_food_level,
  store_tier store_tier,
  updated_at timestamptz not null default now()
);

create trigger household_capsule_set_updated_at
  before update on household_capsule
  for each row execute function set_updated_at();

-- chat_messages -----------------------------------------------------------
-- Full conversation log. The recent slice is the context window sent to
-- Claude each turn (see lib/systemPrompt.ts and app/api/chat/route.ts).

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  role chat_role not null,
  content text not null,
  chips jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_household_id_created_at_idx
  on chat_messages(household_id, created_at);

-- Row Level Security --------------------------------------------------------

alter table households enable row level security;
alter table people enable row level security;
alter table household_capsule enable row level security;
alter table chat_messages enable row level security;

create policy "households: owner full access"
  on households for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "people: household owner full access"
  on people for all
  using (household_id in (select id from households where owner_user_id = auth.uid()))
  with check (household_id in (select id from households where owner_user_id = auth.uid()));

create policy "household_capsule: household owner full access"
  on household_capsule for all
  using (household_id in (select id from households where owner_user_id = auth.uid()))
  with check (household_id in (select id from households where owner_user_id = auth.uid()));

create policy "chat_messages: household owner full access"
  on chat_messages for all
  using (household_id in (select id from households where owner_user_id = auth.uid()))
  with check (household_id in (select id from households where owner_user_id = auth.uid()));

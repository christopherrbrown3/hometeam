begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_table('public', 'profiles', 'profiles migration is replayed');
select has_table('public', 'households', 'households migration is replayed');
select has_table('public', 'household_memberships', 'memberships migration is replayed');
select has_table('public', 'task_series', 'task series migration is replayed');
select has_table('public', 'task_schedule_slots', 'schedule slots migration is replayed');
select has_table('public', 'task_rotation_members', 'rotation roster migration is replayed');
select has_table('public', 'task_occurrences', 'occurrences migration is replayed');
select has_table('public', 'task_events', 'events migration is replayed');
select has_table('public', 'notification_preferences', 'notification preferences migration is replayed');
select has_table('public', 'push_subscriptions', 'push subscriptions migration is replayed');
select has_table('public', 'notification_outbox', 'notification outbox migration is replayed');

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and indexname = 'task_occurrences_open_household_due_lookup'
  ),
  'open household occurrence lookup index is replayed'
);

select * from finish();

rollback;

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select has_type('public', 'profile_color', 'profile colors use a constrained database type');
select has_column('public', 'profiles', 'profile_color', 'profiles store a task icon color');
select col_not_null('public', 'profiles', 'profile_color', 'every profile has a task icon color');

select enum_has_labels(
  'public',
  'profile_color',
  array['blue', 'pink', 'green', 'orange'],
  'only the four selectable profile colors are available'
);

select throws_ok(
  $$ update public.profiles set profile_color = 'gray' where user_id = '00000000-0000-0000-0000-000000000101' $$,
  '22P02',
  'invalid input value for enum profile_color: "gray"',
  'gray remains reserved for unassigned work'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select lives_ok(
  $$ update public.profiles set profile_color = 'orange' where user_id = '00000000-0000-0000-0000-000000000101' $$,
  'a person can update their own profile color'
);
select is(
  (select profile_color::text from public.profiles where user_id = '00000000-0000-0000-0000-000000000101'),
  'orange',
  'the selected profile color is persisted'
);
reset role;

select * from finish();
rollback;

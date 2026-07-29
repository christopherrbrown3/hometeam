-- A deleted task should disappear from active task views even when an occurrence
-- became overdue earlier that day. Closed occurrences remain the historical record.
create or replace function public.delete_task_series(input_series_id uuid)
returns public.task_series
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare actor_id uuid := auth.uid(); target public.task_series; occurrence public.task_occurrences;
begin
  select * into target from public.task_series where id = input_series_id for update;
  if target.id is null or actor_id is null or not private.is_active_full_member(target.household_id, actor_id) then raise exception using errcode = '42501', message = 'active full membership is required'; end if;
  if target.series_status = 'deleted' then raise exception using errcode = '22023', message = 'series is already deleted'; end if;
  update public.task_series set series_status = 'deleted', deleted_at = pg_catalog.now() where id = target.id returning * into target;
  for occurrence in
    update public.task_occurrences set lifecycle_state = 'deleted', deleted_at = pg_catalog.now(), version = version + 1
    where series_id = target.id and lifecycle_state = 'open'
    returning *
  loop
    perform private.write_task_event(occurrence, actor_id, 'occurrence_deleted', pg_catalog.jsonb_build_object('reason', 'series_deleted'));
  end loop;
  perform private.write_series_event(target, actor_id, 'series_deleted', pg_catalog.jsonb_build_object('softDeleted', true));
  return target;
end;
$$;

-- Repair series deleted before the all-open-occurrence rule existed. This only
-- touches active rows; completed, skipped, and cancelled history is preserved.
update public.task_occurrences occurrence
set lifecycle_state = 'deleted', deleted_at = pg_catalog.now(), version = occurrence.version + 1
from public.task_series series
where occurrence.series_id = series.id
  and series.series_status = 'deleted'
  and occurrence.lifecycle_state = 'open';

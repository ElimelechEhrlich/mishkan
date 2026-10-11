-- =====================================================================
-- 0004 - Conversions and questions (see DATA_MODEL.md, "המרות", "היררכיה")
-- Any item can be converted to any other kind with convert_item(), and nothing
-- is deleted on the way:
--  * steps of a goal / issue that stops being one are hidden (hidden = true)
--    and come back when it becomes a goal / issue again, or are made into
--    standalone items when the parent asks for that;
--  * a debt keeps its details; its amount and counterparty go into the title;
--  * every other field stays in its column and is just not shown.
-- The converted item waits in "needs completion" of the parent who converted it.
-- An issue can also hold questions, each with a place for its answer.
-- Run once in the Supabase SQL editor, after 0003.
-- =====================================================================

-- The new kind is only named inside function bodies, which run after this script is committed.
alter type public.item_kind add value if not exists 'question';

alter table public.items
  add column hidden boolean not null default false,
  add column answer text;
create index items_visible_status_idx on public.items (household_id, status) where not hidden;

-- ---------- Triggers: items ------------------------------------------
-- Same as in 0002, except:
--  * the step rules are checked only when an item becomes a step, so a step can stay
--    (hidden) under a parent that is no longer a goal or an issue;
--  * an issue can hold questions as well as tasks; a question always sits under an issue;
--  * a goal or an issue may change kind while it has steps (convert_item handles them).
create or replace function public.items_before_write() returns trigger
language plpgsql as $$
declare
  v_parent public.items%rowtype;
begin
  if tg_op = 'INSERT' then
    new.household_id := coalesce(new.household_id, public.current_household_id());
    new.created_by   := coalesce(new.created_by, public.current_member_id());
    new.review_by    := coalesce(new.review_by, new.created_by);
  else
    new.household_id := old.household_id;
    new.created_by   := old.created_by;
  end if;

  if new.kind = 'question' and new.parent_id is null then
    raise exception 'a question must belong to an issue';
  end if;

  if new.parent_id is not null then
    select * into v_parent from public.items where id = new.parent_id;
    if not found then
      raise exception 'parent item not found';
    end if;

    if tg_op = 'INSERT'
       or new.parent_id is distinct from old.parent_id
       or new.kind is distinct from old.kind then
      if v_parent.household_id <> new.household_id then
        raise exception 'parent item belongs to another household';
      end if;
      if v_parent.parent_id is not null then
        raise exception 'only two levels are allowed: a step cannot have steps';
      end if;
      if v_parent.kind not in ('goal', 'issue') then
        raise exception 'only a goal or an issue can have steps';
      end if;
      if not (new.kind = 'task' or (new.kind = 'question' and v_parent.kind = 'issue')) then
        raise exception 'a step must be a task, or a question of an issue';
      end if;
      if tg_op = 'UPDATE' and exists (select 1 from public.items c where c.parent_id = new.id) then
        raise exception 'an item that has steps cannot become a step';
      end if;
    end if;

    new.domain_id := v_parent.domain_id;
  end if;

  -- once assigned, the hint from the old structure is no longer needed
  if new.domain_id is not null then
    new.previous_domain_label := null;
  end if;

  -- completion bookkeeping
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status <> 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      new.completed_by := coalesce(new.completed_by, public.current_member_id());
    end if;
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end $$;

-- Steps are shown only while their parent can hold them: tasks under a goal or an issue,
-- questions under an issue. Otherwise they are kept, hidden, until it can again.
create function public.items_sync_hidden_steps() returns trigger
language plpgsql as $$
begin
  update public.items c
  set hidden = not (
    (new.kind = 'goal'  and c.kind = 'task')
    or (new.kind = 'issue' and c.kind in ('task', 'question'))
  )
  where c.parent_id = new.id;
  return null;
end $$;

create trigger items_sync_hidden_steps
  after update of kind on public.items
  for each row when (old.kind is distinct from new.kind)
  execute function public.items_sync_hidden_steps();

-- ---------- Converting -----------------------------------------------
-- p_detach_steps: when a goal / issue stops being one, make its steps standalone items
--   (tasks stay tasks, questions become notes holding their answer) instead of hiding them.
-- p_category: the kind of a new missing item (default: its old one, else "planned").
-- p_amount, p_counterparty, p_direction: needed when converting to a debt that never had details.
create function public.convert_item(
  p_item_id      uuid,
  p_kind         public.item_kind,
  p_detach_steps boolean default false,
  p_category     public.shopping_category default null,
  p_amount       numeric default null,
  p_counterparty text default null,
  p_direction    public.debt_direction default null
) returns void
language plpgsql set search_path = '' as $$
declare
  v_item    public.items%rowtype;
  v_debt    public.debt_details%rowtype;
  v_title   text;
  v_domain  uuid;
  v_entity  uuid;
begin
  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'item not found';
  end if;
  if v_item.kind in ('shopping_run', 'question') or v_item.parent_id is not null then
    raise exception 'this item cannot be converted';
  end if;
  if p_kind in ('shopping_run', 'question') then
    raise exception 'an item cannot be converted to this kind';
  end if;
  if p_kind = v_item.kind then
    return;
  end if;

  v_title  := v_item.title;
  v_domain := v_item.domain_id;

  -- steps of a goal / issue that stops being one
  if p_detach_steps and p_kind not in ('goal', 'issue') then
    update public.items c
    set parent_id = null,
        hidden    = false,
        kind      = case when c.kind = 'question' then 'note'::public.item_kind else c.kind end,
        notes     = case
                      when c.kind = 'question' and c.answer is not null
                        then concat_ws(E'\n\n', c.answer, c.notes)
                      else c.notes
                    end
    where c.parent_id = v_item.id;
  end if;

  -- a debt that becomes something else carries its amount and counterparty in its title
  if v_item.kind = 'debt' then
    select * into v_debt from public.debt_details where item_id = v_item.id;
    if found then
      v_title := concat_ws(' · ',
        v_debt.counterparty,
        case v_debt.direction when 'owed_to_us' then 'חייבים לנו' else 'אנחנו חייבים' end,
        '₪' || trim(to_char(v_debt.amount, 'FM999G999G990D00')));
    end if;
  end if;

  -- a debt needs its details; old ones are reused
  if p_kind = 'debt' and not exists (select 1 from public.debt_details where item_id = v_item.id) then
    if p_amount is null or p_amount <= 0 or nullif(trim(p_counterparty), '') is null or p_direction is null then
      raise exception 'a debt needs an amount, a counterparty and a direction';
    end if;
    insert into public.debt_details (item_id, amount, counterparty, direction)
    values (v_item.id, p_amount, trim(p_counterparty), p_direction);
  end if;

  -- a missing item moves to the shopping domain of its entity, or of the home
  if p_kind = 'missing_item' then
    select d.entity_id into v_entity from public.domains d where d.id = v_item.domain_id;
    select d.id into v_domain
    from public.domains d
    join public.entities e on e.id = d.entity_id
    where d.role = 'shopping'
      and e.household_id = v_item.household_id
      and (e.id = v_entity or (v_entity is null and e.kind = 'home'));
    if v_domain is null then
      raise exception 'shopping domain not found';
    end if;
  end if;

  update public.items
  set kind              = p_kind,
      title             = v_title,
      domain_id         = v_domain,
      shopping_category = case
                            when p_kind = 'missing_item'
                              then coalesce(p_category, shopping_category, 'planned')
                            else shopping_category
                          end,
      review_by         = public.current_member_id()
  where id = v_item.id;
end $$;

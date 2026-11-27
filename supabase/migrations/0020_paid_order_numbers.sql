-- Order numbers without gaps: only paid orders take a number from
-- order_number_seq (1000, 1001, ...), given by mark_order_paid. A checkout
-- that is started but never paid gets a temporary number from 900001 up.
create sequence if not exists order_draft_seq start 900001;
alter table orders alter column number set default nextval('order_draft_seq');

-- Existing orders: unpaid ones move to temporary numbers, paid ones are
-- renumbered from 1000 in the order they were paid.
update orders set number = nextval('order_draft_seq') where paid_at is null and number < 900000;
update orders set number = -number where paid_at is not null;
update orders o set number = 999 + r.n
  from (select id, row_number() over (order by paid_at, created_at) as n from orders where paid_at is not null) r
 where o.id = r.id;
select setval('order_number_seq', greatest(999, (select coalesce(max(number), 999) from orders where paid_at is not null)), true);

create or replace function mark_order_paid(p_order uuid, p_payment_intent text, p_method text)
  returns table (already_paid boolean, oversold boolean)
  language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  it record;
  short boolean := false;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order % not found', p_order; end if;
  if o.status <> 'pending' then
    return query select true, false; return;
  end if;
  for it in select * from order_items where order_id = p_order loop
    if it.variant_id is not null then
      update piece_variants set stock = stock - it.quantity
        where id = it.variant_id and stock >= it.quantity;
    elsif it.piece_id is not null then
      update pieces set stock = stock - it.quantity
        where id = it.piece_id and stock >= it.quantity;
    end if;
    if not found then
      short := true;
      if it.variant_id is not null then
        update piece_variants set stock = 0 where id = it.variant_id;
      elsif it.piece_id is not null then
        update pieces set stock = 0 where id = it.piece_id;
      end if;
    end if;
  end loop;
  update orders set status = 'paid', paid_at = now(), stripe_payment_intent = p_payment_intent,
         payment_method = p_method, updated_at = now(),
         number = nextval('order_number_seq'),
         invoice_number = next_invoice_number(), invoiced_at = now()
   where id = p_order;
  return query select false, short;
end $$;
revoke all on function mark_order_paid(uuid, text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function mark_order_paid(uuid, text, text) from anon, authenticated';
  end if;
end $$;

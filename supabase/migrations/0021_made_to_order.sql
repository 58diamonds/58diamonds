-- Made to order: when a piece (or one of its sizes) is out of stock, the
-- client can still sell it. Admin > Pieces ticks "Still sell when out of
-- stock" and types how many pieces can be sold that way (order_stock, per
-- size when the piece has sizes). The site then shows that number, with
-- "Delivery between 7-14 days". Real stock is always sold first.
alter table pieces add column if not exists made_to_order boolean not null default false;
alter table pieces add column if not exists order_stock integer not null default 0 check (order_stock >= 0);
alter table piece_variants add column if not exists order_stock integer not null default 0 check (order_stock >= 0);
-- Set at checkout: this line is made to order (delivery 7-14 days), and on
-- payment it is taken from order_stock instead of stock.
alter table order_items add column if not exists made_to_order boolean not null default false;

-- Same as 0020, except that made-to-order lines come out of order_stock.
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
    if it.made_to_order then
      if it.variant_id is not null then
        update piece_variants set order_stock = order_stock - it.quantity
          where id = it.variant_id and order_stock >= it.quantity;
      elsif it.piece_id is not null then
        update pieces set order_stock = order_stock - it.quantity
          where id = it.piece_id and order_stock >= it.quantity;
      end if;
      if not found then
        short := true;
        if it.variant_id is not null then
          update piece_variants set order_stock = 0 where id = it.variant_id;
        elsif it.piece_id is not null then
          update pieces set order_stock = 0 where id = it.piece_id;
        end if;
      end if;
    else
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

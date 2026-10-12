-- The person or company behind the trade name, as registered (KBO). Shown on
-- invoices and legal pages: "58 Diamonds, a trade name of Farah De Roeck".
alter table settings add column if not exists legal_name text;

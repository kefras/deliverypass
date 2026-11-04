-- DeliveryPass MVP: additive schema in the new DeliveryPass project only.
-- Neon project: spring-dust-68567168 / database: deliverypass.
-- No existing data is changed or deleted; no privileges are revoked.
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  data jsonb NOT NULL,
  verification text NOT NULL DEFAULT 'unchecked' CHECK (verification IN ('unchecked','demo','sandbox','live')),
  status text NOT NULL CHECK (status IN ('Awaiting check','Ready to dispatch','Dispatched','Delivered','Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS delivery_orders_owner_created ON public.delivery_orders (owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  owner_id text PRIMARY KEY,
  store_name varchar(100) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.request_limits (
  key_hash text PRIMARY KEY,
  hits integer NOT NULL,
  reset_at timestamptz NOT NULL
);

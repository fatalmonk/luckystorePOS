-- Competitor price monitoring table
-- Stores scraped prices from competitors for price comparison

-- Drop if exists with wrong schema (defensive)
drop table if exists public.competitor_prices cascade;

-- Create table with all columns explicitly
create table public.competitor_prices (
    id uuid default gen_random_uuid() primary key,
    store_id uuid not null references public.stores(id) on delete cascade,
    
    -- Product info (linked to our catalog)
    product_id uuid references public.items(id) on delete set null,
    product_name text not null,
    product_sku text,
    
    -- Competitor info
    competitor_name text not null, -- 'chaldal', 'shwapno', 'aamaderbazar'
    competitor_product_id text,
    competitor_product_url text,
    
    -- Price data
    competitor_price numeric(12,2) not null,
    competitor_original_price numeric(12,2),
    currency text default 'BDT',
    
    -- Our price at time of scrape (for historical comparison)
    our_price numeric(12,2),
    price_gap_percent numeric(5,2), -- positive = we're more expensive
    
    -- Scraping metadata
    scraped_at timestamptz default now() not null,
    scrape_batch_id uuid default gen_random_uuid(), -- groups daily scrapes
    scrape_status text default 'success', -- 'success', 'error', 'not_found'
    error_message text,
    
    -- Raw data for debugging
    raw_data jsonb,
    
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Indexes for performance
create index if not exists idx_competitor_prices_store_id on public.competitor_prices(store_id);
create index if not exists idx_competitor_prices_product_id on public.competitor_prices(product_id);
create index if not exists idx_competitor_prices_competitor on public.competitor_prices(competitor_name);
create index if not exists idx_competitor_prices_scraped_at on public.competitor_prices(scraped_at desc);
create index if not exists idx_competitor_prices_batch on public.competitor_prices(scrape_batch_id);

-- Composite index for common queries
create index if not exists idx_competitor_prices_store_product_scraped 
    on public.competitor_prices(store_id, product_id, scraped_at desc);

-- RLS: Users can only see competitor prices for their store
alter table public.competitor_prices enable row level security;

create policy "Users can view competitor prices for their store"
    on public.competitor_prices
    for select
    using (
        exists (
            select 1 from public.user_profiles 
            where id = auth.uid() 
            and current_store_id = competitor_prices.store_id
        )
    );

create policy "Service role can manage competitor prices"
    on public.competitor_prices
    for all
    using (true)
    with check (true);

-- Function to cleanup old data (keep 90 days)
create or replace function public.cleanup_old_competitor_prices()
returns void as $$
begin
    delete from public.competitor_prices
    where scraped_at < now() - interval '90 days';
end;
$$ language plpgsql security definer;

-- Trigger to auto-cleanup on insert (run every 1000 inserts)
create or replace function public.trigger_cleanup_competitor_prices()
returns trigger as $$
declare
    row_count int;
begin
    select count(*) into row_count from public.competitor_prices;
    
    if row_count % 1000 = 0 then
        perform public.cleanup_old_competitor_prices();
    end if;
    
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cleanup_competitor_prices on public.competitor_prices;
create trigger trg_cleanup_competitor_prices
    after insert on public.competitor_prices
    for each row
    execute function public.trigger_cleanup_competitor_prices();

-- Function to check price alerts (>15% above market)
create or replace function public.check_price_alerts(p_store_id uuid, p_threshold numeric default 0.15)
returns table (
    product_id uuid,
    product_name text,
    our_price numeric,
    market_avg_price numeric,
    price_gap_percent numeric,
    competitors jsonb
) as $$
begin
    return query
    with latest_competitor_prices as (
        select distinct on (product_id, competitor_name)
            product_id,
            competitor_name,
            competitor_price
        from public.competitor_prices
        where store_id = p_store_id
        and scraped_at > now() - interval '24 hours'
        and scrape_status = 'success'
        order by product_id, competitor_name, scraped_at desc
    ),
    market_averages as (
        select 
            product_id,
            avg(competitor_price) as avg_price,
            jsonb_object_agg(competitor_name, competitor_price) as competitor_prices
        from latest_competitor_prices
        group by product_id
    )
    select 
        i.id as product_id,
        i.name as product_name,
        i.price as our_price,
        round(ma.avg_price::numeric, 2) as market_avg_price,
        round(((i.price - ma.avg_price) / ma.avg_price)::numeric, 4) as price_gap_percent,
        ma.competitor_prices as competitors
    from public.items i
    join market_averages ma on ma.product_id = i.id
    where i.store_id = p_store_id
    and i.price > ma.avg_price * (1 + p_threshold)
    order by price_gap_percent desc;
end;
$$ language plpgsql security definer;

-- Updated timestamp trigger
create trigger update_competitor_prices_updated_at
    before update on public.competitor_prices
    for each row
    execute function public.update_updated_at_column();

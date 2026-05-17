--
-- PostgreSQL database dump
--

\restrict w8PTdWASALczwfxle6cJFd3z2Cd9wa8pc1XoZnd0pjh8QOD3iZ6mrRxWwGpszcV

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA _realtime;


ALTER SCHEMA _realtime OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA supabase_functions;


ALTER SCHEMA supabase_functions OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: discount_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed'
);


ALTER TYPE public.discount_type OWNER TO postgres;

--
-- Name: movement_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.movement_type AS ENUM (
    'sale',
    'purchase',
    'adjustment',
    'return',
    'damage',
    'transfer',
    'manual',
    'sync_repair'
);


ALTER TYPE public.movement_type OWNER TO postgres;

--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_type AS ENUM (
    'cash',
    'mobile_banking',
    'card',
    'other'
);


ALTER TYPE public.payment_type OWNER TO postgres;

--
-- Name: po_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.po_status AS ENUM (
    'draft',
    'ordered',
    'partially_received',
    'received',
    'cancelled'
);


ALTER TYPE public.po_status OWNER TO postgres;

--
-- Name: reconciliation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reconciliation_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.reconciliation_status OWNER TO postgres;

--
-- Name: reference_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reference_type AS ENUM (
    'sale',
    'purchase',
    'expense',
    'adjustment',
    'system',
    'sync'
);


ALTER TYPE public.reference_type OWNER TO postgres;

--
-- Name: sale_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sale_status AS ENUM (
    'completed',
    'voided',
    'refunded'
);


ALTER TYPE public.sale_status OWNER TO postgres;

--
-- Name: session_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.session_status AS ENUM (
    'open',
    'closed'
);


ALTER TYPE public.session_status OWNER TO postgres;

--
-- Name: stock_transfer_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stock_transfer_status AS ENUM (
    'pending',
    'in_transit',
    'completed',
    'cancelled'
);


ALTER TYPE public.stock_transfer_status OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
begin
    if not exists (
        select 1
        from pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

    REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
    REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

    GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: supabase_admin
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


ALTER FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) OWNER TO supabase_admin;

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: add_batch_and_adjust_stock(uuid, uuid, text, integer, date, date, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_batch_and_adjust_stock(p_store_id uuid, p_item_id uuid, p_batch_number text, p_qty integer, p_expires_at date DEFAULT NULL::date, p_manufactured_at date DEFAULT NULL::date, p_notes text DEFAULT NULL::text, p_po_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_batch_id uuid;
  v_user_id  uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_qty <= 0 THEN RAISE EXCEPTION 'Batch quantity must be positive'; END IF;

  -- Create batch record
  INSERT INTO public.item_batches (item_id, store_id, batch_number, qty, expires_at, manufactured_at, notes, po_id)
  VALUES (p_item_id, p_store_id, p_batch_number, p_qty, p_expires_at, p_manufactured_at, p_notes, p_po_id)
  RETURNING id INTO v_batch_id;

  -- Increment stock levels via existing RPC
  PERFORM public.adjust_stock(
    p_store_id,
    p_item_id,
    p_qty,
    'received',
    'Batch received: ' || p_batch_number,
    v_user_id
  );

  RETURN v_batch_id;
END;
$$;


ALTER FUNCTION public.add_batch_and_adjust_stock(p_store_id uuid, p_item_id uuid, p_batch_number text, p_qty integer, p_expires_at date, p_manufactured_at date, p_notes text, p_po_id uuid) OWNER TO postgres;

--
-- Name: add_followup_note(uuid, uuid, uuid, text, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_followup_note(p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_note_text text, p_promise_date date DEFAULT NULL::date) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO followup_notes (tenant_id, store_id, party_id, note_text, promise_to_pay_date, created_by)
    VALUES (p_tenant_id, p_store_id, p_party_id, p_note_text, p_promise_date, v_user_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


ALTER FUNCTION public.add_followup_note(p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_note_text text, p_promise_date date) OWNER TO postgres;

--
-- Name: adjust_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text, boolean, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.adjust_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_item_id uuid, p_quantity_delta integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_allow_negative boolean DEFAULT false, p_operation_id uuid DEFAULT NULL::uuid, p_expected_quantity integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;

        IF FOUND THEN RETURN v_existing_movement; END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        JOIN stores s ON s.id = us.store_id
        WHERE us.user_id = v_user_id AND s.id = p_store_id AND s.tenant_id = p_tenant_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = v_user_id AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized to modify stock';
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_item_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, p_item_id, 0, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'expected_quantity', p_expected_quantity,
            'actual_quantity', v_current_quantity
        );
    END IF;

    v_new_quantity := v_current_quantity + p_quantity_delta;
    IF v_new_quantity < 0 AND NOT p_allow_negative THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = v_new_quantity, updated_at = now(), version = version + 1
    WHERE store_id = p_store_id AND item_id = p_item_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, item_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_item_id,
        p_movement_type, p_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, v_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_new_quantity
    );
END;
$$;


ALTER FUNCTION public.adjust_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_item_id uuid, p_quantity_delta integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid, p_notes text, p_allow_negative boolean, p_operation_id uuid, p_expected_quantity integer) OWNER TO postgres;

--
-- Name: adjust_stock(uuid, uuid, integer, text, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.adjust_stock(p_store_id uuid, p_item_id uuid, p_delta integer, p_reason text, p_notes text DEFAULT NULL::text, p_performed_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_new_qty integer;
  v_movement_id uuid;
BEGIN
  -- Validate reason
  IF p_reason NOT IN (
    'received', 'damaged', 'lost', 'correction',
    'returned', 'transfer_in', 'transfer_out',
    'sale', 'import', 'expired', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid adjustment reason: %', p_reason;
  END IF;

  -- Validate delta is not zero
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment quantity cannot be zero';
  END IF;

  -- Upsert stock level
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, GREATEST(0, p_delta))
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = GREATEST(0, public.stock_levels.qty + p_delta);

  -- Get the new quantity
  SELECT qty INTO v_new_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  -- Write movement record
  INSERT INTO public.stock_movements (store_id, item_id, delta, reason, meta, performed_by)
  VALUES (
    p_store_id,
    p_item_id,
    p_delta,
    p_reason,
    jsonb_build_object(
      'notes', COALESCE(p_notes, ''),
      'source', 'manual_adjustment',
      'new_qty', v_new_qty
    ),
    p_performed_by
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'new_qty', v_new_qty,
    'delta', p_delta,
    'reason', p_reason
  );
END;
$$;


ALTER FUNCTION public.adjust_stock(p_store_id uuid, p_item_id uuid, p_delta integer, p_reason text, p_notes text, p_performed_by uuid) OWNER TO postgres;

--
-- Name: adjust_stock(uuid, uuid, integer, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.adjust_stock(p_store_id uuid, p_item_id uuid, p_delta integer, p_reason text, p_notes text DEFAULT NULL::text, p_performed_by uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_new_qty integer;
  v_movement_id uuid;
  v_existing_movement jsonb;
BEGIN
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'movement_id', id,
      'delta', delta,
      'reason', reason,
      'is_duplicate', true
    ) INTO v_existing_movement
    FROM public.stock_movements 
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_movement IS NOT NULL THEN
      RETURN v_existing_movement;
    END IF;
  END IF;

  -- 2. Validate reason
  IF p_reason NOT IN (
    'received', 'damaged', 'lost', 'correction',
    'returned', 'transfer_in', 'transfer_out',
    'sale', 'import', 'expired', 'other', 'void'
  ) THEN
    RAISE EXCEPTION 'Invalid adjustment reason: %', p_reason;
  END IF;

  -- 3. Validate delta is not zero
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment quantity cannot be zero';
  END IF;

  -- 4. Upsert stock level
  INSERT INTO public.stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, GREATEST(0, p_delta))
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = GREATEST(0, public.stock_levels.qty + p_delta);

  -- 5. Get the new quantity
  SELECT qty INTO v_new_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  -- 6. Write movement record
  INSERT INTO public.stock_movements (store_id, item_id, delta, reason, meta, performed_by, idempotency_key)
  VALUES (
    p_store_id,
    p_item_id,
    p_delta,
    p_reason,
    jsonb_build_object(
      'notes', COALESCE(p_notes, ''),
      'source', 'transaction_system',
      'new_qty', v_new_qty
    ),
    p_performed_by,
    p_idempotency_key
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'new_qty', v_new_qty,
    'delta', p_delta,
    'reason', p_reason,
    'is_duplicate', false
  );
END;
$$;


ALTER FUNCTION public.adjust_stock(p_store_id uuid, p_item_id uuid, p_delta integer, p_reason text, p_notes text, p_performed_by uuid, p_idempotency_key text) OWNER TO postgres;

--
-- Name: approve_inventory_reconciliation(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.approve_inventory_reconciliation(p_reconciliation_id uuid, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_recon public.inventory_reconciliations%ROWTYPE;
    v_user_id UUID;
    v_movement_type movement_type;
BEGIN

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT * INTO v_recon FROM public.inventory_reconciliations WHERE id = p_reconciliation_id FOR UPDATE;
    IF v_recon.id IS NULL THEN RAISE EXCEPTION 'Reconciliation not found'; END IF;
    IF v_recon.status <> 'pending' THEN RAISE EXCEPTION 'Reconciliation is already %', v_recon.status; END IF;

    UPDATE public.inventory_reconciliations SET status = 'approved', approved_by = v_user_id, approved_at = now() WHERE id = p_reconciliation_id;

    IF v_recon.difference <> 0 THEN
        PERFORM public.adjust_inventory_stock(
            v_recon.tenant_id,
            v_recon.store_id,
            v_recon.item_id, 
            v_recon.difference,
            'adjustment'::movement_type,
            'adjustment'::reference_type,
            v_recon.id,
            COALESCE(p_notes, v_recon.notes, 'Reconciliation adjustment'),
            TRUE,
            v_recon.id 
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'reconciliation_id', p_reconciliation_id, 'difference', v_recon.difference);
END;
$$;


ALTER FUNCTION public.approve_inventory_reconciliation(p_reconciliation_id uuid, p_notes text) OWNER TO postgres;

--
-- Name: authenticate_staff_pin(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.authenticate_staff_pin(p_pin text) RETURNS TABLE(id uuid, auth_id uuid, full_name text, role text, store_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_pin IS NULL OR length(trim(p_pin)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.auth_id,
    COALESCE(u.full_name, 'User') AS full_name,
    u.role,
    u.store_id
  FROM public.users u
  WHERE u.role IN ('cashier', 'manager', 'admin')
    AND (
      -- Preferred secure storage
      (u.pos_pin_hash IS NOT NULL AND crypt(p_pin, u.pos_pin_hash) = u.pos_pin_hash)
      -- Backward compatibility while old rows are still migrating
      OR (u.pos_pin_hash IS NULL AND u.pos_pin = p_pin)
    )
  LIMIT 1;
END;
$$;


ALTER FUNCTION public.authenticate_staff_pin(p_pin text) OWNER TO postgres;

--
-- Name: FUNCTION authenticate_staff_pin(p_pin text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.authenticate_staff_pin(p_pin text) IS 'Server-authoritative PIN authentication for POS staff roles.';


--
-- Name: check_idempotency(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_idempotency(p_key text, p_tenant_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_response JSONB;
BEGIN
    SELECT response_body INTO v_response
    FROM idempotency_keys
    WHERE idempotency_key = p_key AND tenant_id = p_tenant_id;

    IF FOUND THEN
        RETURN v_response;
    END IF;

    INSERT INTO idempotency_keys (idempotency_key, tenant_id, locked_at)
    VALUES (p_key, p_tenant_id, NOW());

    RETURN NULL;
END;
$$;


ALTER FUNCTION public.check_idempotency(p_key text, p_tenant_id uuid) OWNER TO postgres;

--
-- Name: check_ledger_batch_balance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_ledger_batch_balance() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_balance numeric(14,2);
BEGIN
  SELECT SUM(debit) - SUM(credit) INTO v_balance
  FROM public.ledger_entries
  WHERE batch_id = NEW.batch_id;

  IF v_balance <> 0 THEN
    RAISE EXCEPTION 'Ledger batch % is out of balance by %', NEW.batch_id, v_balance;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_ledger_batch_balance() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ledger_posting_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_posting_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    store_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_by text,
    locked_at timestamp with time zone,
    lock_expires_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_posting_queue_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT ledger_posting_queue_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT ledger_posting_queue_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'CLAIMED'::text, 'POSTED'::text, 'FAILED'::text])))
);


ALTER TABLE public.ledger_posting_queue OWNER TO postgres;

--
-- Name: claim_ledger_posting_jobs(text, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.claim_ledger_posting_jobs(p_worker_id text, p_batch_size integer DEFAULT 10, p_store_id uuid DEFAULT NULL::uuid) RETURNS SETOF public.ledger_posting_queue
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF public.is_ledger_worker_alive(p_worker_id, interval '2 minutes') IS NOT TRUE THEN
    RAISE EXCEPTION 'worker not active or stale: %', p_worker_id;
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT q.id
    FROM public.ledger_posting_queue q
    WHERE q.status = 'PENDING'
      AND q.attempt_count < q.max_attempts
      AND q.next_retry_at <= now()
      AND (q.lock_expires_at IS NULL OR q.lock_expires_at < now())
      AND (p_store_id IS NULL OR q.store_id = p_store_id)
    ORDER BY q.priority DESC, q.created_at
    LIMIT GREATEST(1, COALESCE(p_batch_size, 1))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.ledger_posting_queue q
  SET status = 'CLAIMED',
      locked_by = p_worker_id,
      locked_at = now(),
      lock_expires_at = now() + interval '2 minutes',
      updated_at = now()
  FROM claimable c
  WHERE q.id = c.id
  RETURNING q.*;
END;
$$;


ALTER FUNCTION public.claim_ledger_posting_jobs(p_worker_id text, p_batch_size integer, p_store_id uuid) OWNER TO postgres;

--
-- Name: close_accounting_period(uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_accounting_period(p_store_id uuid, p_period_start date, p_period_end date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user record;
  v_tb jsonb;
BEGIN
  SELECT id, role INTO v_user
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user.id IS NULL OR v_user.role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object('status', 'REJECTED', 'message', 'Manager/Admin required');
  END IF;

  v_tb := public.validate_trial_balance(p_store_id, p_period_start, p_period_end);
  IF COALESCE((v_tb->>'is_balanced')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'message', 'Trial balance mismatch; cannot close period',
      'trial_balance', v_tb
    );
  END IF;

  INSERT INTO public.accounting_periods(
    store_id, period_start, period_end, status, closed_at, closed_by
  )
  VALUES (
    p_store_id, p_period_start, p_period_end, 'CLOSED', now(), v_user.id
  )
  ON CONFLICT (store_id, period_start, period_end)
  DO UPDATE SET
    status = 'CLOSED',
    closed_at = EXCLUDED.closed_at,
    closed_by = EXCLUDED.closed_by;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'store_id', p_store_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'trial_balance', v_tb
  );
END;
$$;


ALTER FUNCTION public.close_accounting_period(p_store_id uuid, p_period_start date, p_period_end date) OWNER TO postgres;

--
-- Name: close_pos_session(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_pos_session(p_session_id uuid, p_closing_cash numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_session public.pos_sessions;
  v_expected numeric;
  v_difference numeric;
BEGIN
  SELECT * INTO v_session FROM public.pos_sessions WHERE id = p_session_id;
  
  IF v_session.status = 'closed' THEN
    RAISE EXCEPTION 'Session is already closed.';
  END IF;

  -- Get expected drawer from same logic
  SELECT (get_session_summary(p_session_id)->>'expected_drawer')::numeric INTO v_expected;
  
  v_difference := p_closing_cash - v_expected;

  -- Here we can enforce strict validation if we wanted to prevent closing on discrepancy,
  -- but generally POS allows closing with discrepancy and logs it.
  
  UPDATE public.pos_sessions
  SET 
    status = 'closed',
    closed_at = now(),
    closing_cash = p_closing_cash,
    total_sales = (get_session_summary(p_session_id)->>'total_cash_sales')::numeric
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'expected', v_expected,
    'actual', p_closing_cash,
    'difference', v_difference
  );
END;
$$;


ALTER FUNCTION public.close_pos_session(p_session_id uuid, p_closing_cash numeric) OWNER TO postgres;

--
-- Name: reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    reminder_date date NOT NULL,
    reminder_type text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['payment_due'::text, 'follow_up'::text, 'stock_check'::text, 'other'::text])))
);


ALTER TABLE public.reminders OWNER TO postgres;

--
-- Name: create_reminder(uuid, uuid, text, text, date, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_reminder(p_tenant_id uuid, p_store_id uuid, p_title text, p_description text, p_reminder_date date, p_reminder_type text, p_created_by uuid DEFAULT NULL::uuid) RETURNS public.reminders
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    new_row reminders%ROWTYPE;
BEGIN
    INSERT INTO reminders (tenant_id, store_id, title, description, reminder_date, reminder_type, created_by)
    VALUES (p_tenant_id, p_store_id, p_title, p_description, p_reminder_date, p_reminder_type, p_created_by)
    RETURNING * INTO new_row;
    RETURN new_row;
END;
$$;


ALTER FUNCTION public.create_reminder(p_tenant_id uuid, p_store_id uuid, p_title text, p_description text, p_reminder_date date, p_reminder_type text, p_created_by uuid) OWNER TO postgres;

--
-- Name: create_sale(uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_sale(p_store_id uuid, p_cashier_id uuid, p_session_id uuid DEFAULT NULL::uuid, p_items jsonb DEFAULT '[]'::jsonb, p_payments jsonb DEFAULT '[]'::jsonb, p_discount numeric DEFAULT 0, p_client_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_snapshot jsonb DEFAULT NULL::jsonb, p_fulfillment_policy text DEFAULT 'STRICT'::text, p_override_token text DEFAULT NULL::text, p_override_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_existing record;
  v_item record;
  v_live record;
  v_payment record;
  v_sale_id uuid;
  v_sale_number text;
  v_subtotal numeric(12,2) := 0;
  v_fulfilled_subtotal numeric(12,2) := 0;
  v_backordered_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tendered numeric(12,2) := 0;
  v_change numeric(12,2) := 0;
  v_status text := 'SUCCESS';
  v_adjustments jsonb := '[]'::jsonb;
  v_partial jsonb := '[]'::jsonb;
  v_user_id uuid;
  v_user_role text;
  v_override_row record;
  v_override_required boolean := false;
  v_stock_delta jsonb := '[]'::jsonb;
  v_fulfilled_qty integer;
  v_backordered_qty integer;
  v_line_price numeric(12,2);
  v_line_total numeric(12,2);
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'REJECTED', 'message', 'Not authenticated');
  END IF;

  IF p_client_transaction_id IS NULL OR btrim(p_client_transaction_id) = '' THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'client_transaction_id_required',
      'message', 'client_transaction_id is required',
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb
    );
  END IF;

  SELECT id, sale_number, subtotal, discount_amount, total_amount, amount_tendered, change_due, ledger_batch_id
    INTO v_existing
  FROM public.sales
  WHERE store_id = p_store_id
    AND client_transaction_id = p_client_transaction_id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'SUCCESS',
      'sale_id', v_existing.id,
      'sale_number', v_existing.sale_number,
      'subtotal', COALESCE(v_existing.subtotal, 0),
      'discount', COALESCE(v_existing.discount_amount, 0),
      'total_amount', COALESCE(v_existing.total_amount, 0),
      'tendered', COALESCE(v_existing.amount_tendered, 0),
      'change_due', COALESCE(v_existing.change_due, 0),
      'ledger_batch_id', v_existing.ledger_batch_id,
      'adjustments', '[]'::jsonb,
      'partial_fulfillment', '[]'::jsonb
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT i.id, i.name, i.is_active AS active, i.price, COALESCE(sl.qty, 0) AS qty_on_hand
      INTO v_live
    FROM public.items i
    LEFT JOIN public.stock_levels sl
      ON sl.item_id = i.id AND sl.store_id = p_store_id
    WHERE i.id = v_item.item_id;

    IF v_live.id IS NULL OR v_live.active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'status', 'CONFLICT',
        'conflict_reason', 'deleted_or_inactive_product',
        'message', 'Product deleted/inactive',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    IF ROUND(COALESCE(v_item.unit_price, 0), 2) < ROUND(COALESCE(v_live.price, 0), 2) THEN
      v_override_required := true;
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_increase',
        'snapshot_price', v_item.unit_price,
        'server_price', v_live.price
      );
    ELSIF ROUND(COALESCE(v_item.unit_price, 0), 2) > ROUND(COALESCE(v_live.price, 0), 2) THEN
      v_status := 'ADJUSTED';
      v_adjustments := v_adjustments || jsonb_build_object(
        'item_id', v_item.item_id,
        'type', 'price_decrease_auto_adjust',
        'snapshot_price', v_item.unit_price,
        'applied_price', v_live.price
      );
    END IF;

    IF COALESCE(v_live.qty_on_hand, 0) < COALESCE(v_item.qty, 0) THEN
      IF UPPER(COALESCE(p_fulfillment_policy, 'STRICT')) = 'PARTIAL_ALLOWED' THEN
        v_fulfilled_qty := GREATEST(COALESCE(v_live.qty_on_hand, 0), 0);
        v_backordered_qty := GREATEST(COALESCE(v_item.qty, 0) - v_fulfilled_qty, 0);
        v_partial := v_partial || jsonb_build_object(
          'item_id', v_item.item_id,
          'requested_qty', v_item.qty,
          'fulfilled_qty', v_fulfilled_qty,
          'backordered_qty', v_backordered_qty,
          'remaining_stock', GREATEST(COALESCE(v_live.qty_on_hand, 0) - v_fulfilled_qty, 0)
        );
      ELSE
        RETURN jsonb_build_object(
          'status', 'REJECTED',
          'conflict_reason', 'insufficient_stock_strict_policy',
          'message', format('Insufficient stock for %s', v_live.name),
          'adjustments', v_adjustments,
          'partial_fulfillment', v_partial
        );
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_partial) > 0 THEN
    RETURN jsonb_build_object(
      'status', 'PARTIAL_FULFILLMENT',
      'conflict_reason', 'partial_fulfillment_required',
      'message', 'Server computed partial fulfillment proposal',
      'adjustments', v_adjustments,
      'partial_fulfillment', v_partial
    );
  END IF;

  IF v_override_required THEN
    IF p_override_token IS NULL OR btrim(p_override_token) = '' THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'override_token_required',
        'message', 'Manager override token required for price increase',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    SELECT *
      INTO v_override_row
    FROM public.pos_override_tokens t
    WHERE t.store_id = p_store_id
      AND t.token_hash = encode(digest(p_override_token, 'sha256'), 'hex')
      AND t.used_at IS NULL
      AND t.expires_at > now()
    LIMIT 1;

    IF v_override_row.id IS NULL OR v_user_role NOT IN ('admin', 'manager') THEN
      RETURN jsonb_build_object(
        'status', 'REJECTED',
        'conflict_reason', 'invalid_override_token',
        'message', 'Invalid or expired override token',
        'adjustments', v_adjustments,
        'partial_fulfillment', v_partial
      );
    END IF;

    UPDATE public.pos_override_tokens
    SET used_at = now(),
        used_by = v_user_id
    WHERE id = v_override_row.id;
  END IF;

  INSERT INTO public.sales (
    store_id, cashier_id, session_id, status, notes, client_transaction_id,
    accounting_posting_status
  ) VALUES (
    p_store_id, p_cashier_id, p_session_id, 'completed', p_notes, p_client_transaction_id,
    'PENDING_POSTING'
  ) RETURNING id, sale_number INTO v_sale_id, v_sale_number;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(
      item_id uuid,
      qty integer,
      unit_price numeric,
      cost numeric,
      discount numeric
    )
  LOOP
    SELECT i.price INTO v_live
    FROM public.items i
    WHERE i.id = v_item.item_id;

    v_line_price := LEAST(COALESCE(v_item.unit_price, 0), COALESCE(v_live.price, 0));
    v_line_total := ROUND((v_line_price - COALESCE(v_item.discount, 0)) * v_item.qty, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_fulfilled_subtotal := v_fulfilled_subtotal + v_line_total;

    INSERT INTO public.sale_items (
      sale_id, item_id, qty, unit_price, cost, discount, line_total
    ) VALUES (
      v_sale_id,
      v_item.item_id,
      v_item.qty,
      v_line_price,
      COALESCE(v_item.cost, 0),
      COALESCE(v_item.discount, 0),
      v_line_total
    );

    PERFORM public.adjust_stock(
      p_store_id,
      v_item.item_id,
      -v_item.qty,
      'sale',
      'Sale: ' || v_sale_number,
      v_user_id
    );

    v_stock_delta := v_stock_delta || jsonb_build_object(
      'item_id', v_item.item_id,
      'delta_qty', -v_item.qty
    );
  END LOOP;

  v_total := GREATEST(ROUND(v_subtotal - COALESCE(p_discount, 0), 2), 0);

  FOR v_payment IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_payments, '[]'::jsonb)) AS x(
      payment_method_id uuid,
      amount numeric,
      reference text
    )
  LOOP
    v_tendered := v_tendered + COALESCE(v_payment.amount, 0);
    INSERT INTO public.sale_payments(sale_id, payment_method_id, amount, reference)
    VALUES (v_sale_id, v_payment.payment_method_id, v_payment.amount, v_payment.reference);
  END LOOP;

  IF v_tendered < v_total THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'conflict_reason', 'payment_insufficient',
      'message', 'Payment insufficient',
      'adjustments', v_adjustments,
      'partial_fulfillment', v_partial
    );
  END IF;

  v_change := GREATEST(ROUND(v_tendered - v_total, 2), 0);
  UPDATE public.sales
  SET subtotal = v_subtotal,
      fulfilled_subtotal = v_fulfilled_subtotal,
      backordered_subtotal = v_backordered_subtotal,
      discount_amount = COALESCE(p_discount, 0),
      total_amount = v_total,
      amount_tendered = v_tendered,
      change_due = v_change
  WHERE id = v_sale_id;

  INSERT INTO public.sale_audit_log (
    sale_id,
    client_transaction_id,
    store_id,
    operator_user_id,
    status,
    before_state,
    after_state,
    override_used,
    override_user_id,
    override_reason,
    stock_delta
  ) VALUES (
    v_sale_id,
    p_client_transaction_id,
    p_store_id,
    v_user_id,
    v_status,
    jsonb_build_object('snapshot', COALESCE(p_snapshot, '{}'::jsonb)),
    jsonb_build_object(
      'sale_id', v_sale_id,
      'subtotal', v_subtotal,
      'discount', COALESCE(p_discount, 0),
      'total_amount', v_total,
      'tendered', v_tendered,
      'change_due', v_change,
      'accounting_posting_status', 'PENDING_POSTING'
    ),
    v_override_required,
    CASE WHEN v_override_required THEN v_user_id ELSE NULL END,
    p_override_reason,
    v_stock_delta
  );

  RETURN jsonb_build_object(
    'status', v_status,
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'subtotal', v_subtotal,
    'discount', COALESCE(p_discount, 0),
    'total_amount', v_total,
    'tendered', v_tendered,
    'change_due', v_change,
    'accounting_posting_status', 'PENDING_POSTING',
    'adjustments', v_adjustments,
    'partial_fulfillment', v_partial,
    'conflict_reason', NULL
  );
END;
$$;


ALTER FUNCTION public.create_sale(p_store_id uuid, p_cashier_id uuid, p_session_id uuid, p_items jsonb, p_payments jsonb, p_discount numeric, p_client_transaction_id text, p_notes text, p_snapshot jsonb, p_fulfillment_policy text, p_override_token text, p_override_reason text) OWNER TO postgres;

--
-- Name: create_stock_transfer(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_stock_transfer(p_from_store_id uuid, p_to_store_id uuid, p_notes text, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_transfer_id uuid;
  v_user_id uuid;
  v_item record;
BEGIN
  -- Get current user
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Source and destination stores must be different';
  END IF;

  -- Create transfer record
  INSERT INTO public.stock_transfers (from_store_id, to_store_id, notes, created_by, updated_by)
  VALUES (p_from_store_id, p_to_store_id, p_notes, v_user_id, v_user_id)
  RETURNING id INTO v_transfer_id;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id uuid, qty integer) 
  LOOP
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Transfer quantity must be > 0 (item %)', v_item.item_id;
    END IF;

    INSERT INTO public.stock_transfer_items (transfer_id, item_id, qty)
    VALUES (v_transfer_id, v_item.item_id, v_item.qty);
  END LOOP;

  RETURN v_transfer_id;
END;
$$;


ALTER FUNCTION public.create_stock_transfer(p_from_store_id uuid, p_to_store_id uuid, p_notes text, p_items jsonb) OWNER TO postgres;

--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- In a real app, extract from auth.jwt()
  -- For local dev/testing without full auth, we can mock or rely on service_role.
  RETURN (current_setting('request.jwt.claims', true)::json->>'tenant_id')::UUID;
END;
$$;


ALTER FUNCTION public.current_tenant_id() OWNER TO postgres;

--
-- Name: decrement_stock(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.decrement_stock(p_store_id uuid, p_item_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update stock level with atomic decrement
  UPDATE stock_levels
  SET qty = qty - p_quantity
  WHERE store_id = p_store_id
    AND item_id = p_item_id
    AND qty >= p_quantity;  -- Only decrement if sufficient stock
  
  -- Check if update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_item_id;
  END IF;
END;
$$;


ALTER FUNCTION public.decrement_stock(p_store_id uuid, p_item_id uuid, p_quantity integer) OWNER TO postgres;

--
-- Name: deduct_stock(uuid, uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Get tenant id
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    -- NEW LEDGER INTEGRATION
    INSERT INTO public.inventory_movements (
      tenant_id,
      store_id,
      product_id,
      movement_type,
      quantity_delta,
      reference_type,
      reference_id,
      previous_quantity,
      new_quantity,
      notes,
      created_by
    ) VALUES (
      v_tenant_id,
      p_store_id,
      p_product_id,
      'sale',
      -p_quantity,
      'sale',
      (p_metadata->>'sale_id')::uuid,
      v_current_quantity,
      v_new_quantity,
      COALESCE(p_metadata->>'notes', 'POS transaction sale'),
      v_user_id
    ) RETURNING id INTO v_movement_id;

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;


ALTER FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb) OWNER TO postgres;

--
-- Name: deduct_stock(uuid, uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb DEFAULT '{}'::jsonb, p_operation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_stock_level_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_result jsonb;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
  v_existing_movement JSONB;
BEGIN
  -- Idempotency check
  IF p_operation_id IS NOT NULL THEN
      SELECT jsonb_build_object(
          'success', true,
          'movement_id', id,
          'stock_level_id', (SELECT id FROM stock_levels WHERE store_id = p_store_id AND item_id = p_product_id),
          'previous_quantity', previous_quantity,
          'new_quantity', new_quantity,
          'deducted', p_quantity,
          'idempotent_replay', true,
          'timestamp', created_at
      ) INTO v_existing_movement
      FROM public.inventory_movements
      WHERE operation_id = p_operation_id
      LIMIT 1;

      IF FOUND THEN
          RETURN v_existing_movement;
      END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  BEGIN
    SELECT id, qty INTO v_stock_level_id, v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id
      AND item_id = p_product_id
    FOR UPDATE;

    IF v_stock_level_id IS NULL THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'NO_STOCK_LEVEL',
          'message', format('No stock record found for product %s in store %s', p_product_id::text, p_store_id::text)
        ),
        'movement_id', NULL,
        'previous_quantity', 0,
        'new_quantity', 0,
        'deducted', 0
      );
    END IF;

    IF v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'code', 'INSUFFICIENT_STOCK',
          'message', format('Insufficient stock: available=%s, requested=%s', v_current_quantity::text, p_quantity::text),
          'available', v_current_quantity,
          'requested', p_quantity
        ),
        'movement_id', NULL,
        'previous_quantity', v_current_quantity,
        'new_quantity', v_current_quantity,
        'deducted', 0
      );
    END IF;

    v_new_quantity := v_current_quantity - p_quantity;

    UPDATE public.stock_levels
    SET qty = v_new_quantity,
        updated_at = now(),
        version = version + 1
    WHERE id = v_stock_level_id;

    INSERT INTO public.inventory_movements (
      tenant_id, store_id, product_id,
      movement_type, quantity_delta,
      reference_type, reference_id,
      previous_quantity, new_quantity,
      notes, created_by, operation_id
    ) VALUES (
      v_tenant_id, p_store_id, p_product_id,
      'sale', -p_quantity,
      'sale', (p_metadata->>'sale_id')::uuid,
      v_current_quantity, v_new_quantity,
      COALESCE(p_metadata->>'notes', 'POS transaction sale'),
      v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    v_result := jsonb_build_object(
      'success', true,
      'movement_id', v_movement_id,
      'stock_level_id', v_stock_level_id,
      'previous_quantity', v_current_quantity,
      'new_quantity', v_new_quantity,
      'deducted', p_quantity,
      'timestamp', now()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;


ALTER FUNCTION public.deduct_stock(p_store_id uuid, p_product_id uuid, p_quantity integer, p_metadata jsonb, p_operation_id uuid) OWNER TO postgres;

--
-- Name: deduct_stock(uuid, uuid, integer, jsonb, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.deduct_stock(p_store_id uuid, p_item_id uuid, p_quantity integer, p_metadata jsonb DEFAULT '{}'::jsonb, p_operation_id uuid DEFAULT NULL::uuid, p_expected_quantity integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_current_quantity integer;
  v_new_quantity integer;
  v_movement_id uuid;
  v_tenant_id uuid;
  v_user_id uuid;
  v_existing_movement JSONB;
BEGIN

  v_user_id := auth.uid();

  IF p_operation_id IS NOT NULL THEN
      SELECT jsonb_build_object(
          'success', true,
          'movement_id', id,
          'previous_quantity', previous_quantity,
          'new_quantity', new_quantity,
          'deducted', p_quantity,
          'idempotent_replay', true
      ) INTO v_existing_movement
      FROM public.inventory_movements
      WHERE operation_id = p_operation_id
      LIMIT 1;
      IF FOUND THEN RETURN v_existing_movement; END IF;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id;

  SELECT qty_on_hand INTO v_current_quantity
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
      RETURN jsonb_build_object('error', jsonb_build_object('code', 'NO_STOCK_LEVEL', 'message', format('No record found for item %s', p_item_id::text)));
  END IF;

  IF p_expected_quantity IS NOT NULL AND p_expected_quantity <> v_current_quantity THEN
      RETURN jsonb_build_object('success', false, 'conflict', true, 'expected', p_expected_quantity, 'actual', v_current_quantity);
  END IF;

  IF v_current_quantity < p_quantity THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'INSUFFICIENT_STOCK', 'available', v_current_quantity, 'requested', p_quantity));
  END IF;

  v_new_quantity := v_current_quantity - p_quantity;

  UPDATE public.stock_levels
  SET qty_on_hand = v_new_quantity, updated_at = now(), version = version + 1
  WHERE store_id = p_store_id AND item_id = p_item_id;

  INSERT INTO public.inventory_movements (
    tenant_id, store_id, item_id,
    movement_type, quantity_delta,
    reference_type, reference_id,
    previous_quantity, new_quantity,
    notes, created_by, operation_id
  ) VALUES (
    v_tenant_id, p_store_id, p_item_id,
    'sale', -p_quantity,
    'sale', (p_metadata->>'sale_id')::uuid,
    v_current_quantity, v_new_quantity,
    COALESCE(p_metadata->>'notes', 'POS transaction sale'),
    v_user_id, p_operation_id
  ) RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object('success', true, 'movement_id', v_movement_id, 'previous_quantity', v_current_quantity, 'new_quantity', v_new_quantity, 'deducted', p_quantity);
END;
$$;


ALTER FUNCTION public.deduct_stock(p_store_id uuid, p_item_id uuid, p_quantity integer, p_metadata jsonb, p_operation_id uuid, p_expected_quantity integer) OWNER TO postgres;

--
-- Name: delete_reminder(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_reminder(p_reminder_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    DELETE FROM reminders r
    WHERE r.id = p_reminder_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id);

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.delete_reminder(p_reminder_id uuid) OWNER TO postgres;

--
-- Name: ensure_expense_ledger_accounts(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_expense_ledger_accounts(p_store_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
  VALUES
    (p_store_id, '6000_CAPEX', 'Capital Expenditure', 'ASSET', true), -- CapEx is an asset until depreciated
    (p_store_id, '5200_UTILITIES', 'Utility Expenses', 'EXPENSE', true),
    (p_store_id, '5300_TRANSPORT', 'Transport & Conveyance', 'EXPENSE', true),
    (p_store_id, '5400_SALARY', 'Staff salary', 'EXPENSE', true),
    (p_store_id, '5500_MISC', 'All Other Expenses', 'EXPENSE', true),
    (p_store_id, '3100_PARTNERS_TAKE', 'Partners Take', 'EQUITY', true) -- Equity draw
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;


ALTER FUNCTION public.ensure_expense_ledger_accounts(p_store_id uuid) OWNER TO postgres;

--
-- Name: ensure_sale_ledger_accounts(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_sale_ledger_accounts(p_store_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.ledger_accounts (store_id, code, name, account_type, is_system)
  VALUES
    (p_store_id, '1000_CASH', 'Cash on Hand', 'ASSET', true),
    (p_store_id, '1010_BANK', 'Bank / Mobile Settlement', 'ASSET', true),
    (p_store_id, '4000_SALES_REVENUE', 'Sales Revenue (Gross)', 'REVENUE', true),
    (p_store_id, '5000_COGS', 'Cost of Goods Sold', 'EXPENSE', true),
    (p_store_id, '1200_INVENTORY', 'Inventory Asset', 'ASSET', true),
    (p_store_id, '5100_DISCOUNT_ABSORPTION', 'Discount Absorption (MRP delta)', 'EXPENSE', true)
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;


ALTER FUNCTION public.ensure_sale_ledger_accounts(p_store_id uuid) OWNER TO postgres;

--
-- Name: generate_daily_reconciliation(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_daily_reconciliation(p_store_id uuid, p_date date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_start timestamptz := (p_date::timestamptz);
  v_end timestamptz := ((p_date + 1)::timestamptz);
  v_total_sales numeric(14,2) := 0;
  v_total_cash_inflow numeric(14,2) := 0;
  v_inventory_delta_value numeric(14,2) := 0;
  v_expected_inventory_delta numeric(14,2) := 0;
  v_mismatch jsonb := '[]'::jsonb;
  v_risk_overrides integer := 0;
BEGIN
  SELECT COALESCE(SUM(s.total_amount), 0)
    INTO v_total_sales
  FROM public.sales s
  WHERE s.store_id = p_store_id
    AND s.created_at >= v_start
    AND s.created_at < v_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(le.debit), 0)
    INTO v_total_cash_inflow
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  JOIN public.ledger_accounts la ON la.id = le.account_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND la.code IN ('1000_CASH', '1010_BANK');

  SELECT COALESCE(SUM(si.qty * si.cost), 0)
    INTO v_expected_inventory_delta
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.store_id = p_store_id
    AND s.created_at >= v_start
    AND s.created_at < v_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(le.credit), 0)
    INTO v_inventory_delta_value
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  JOIN public.ledger_accounts la ON la.id = le.account_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND la.code = '1200_INVENTORY';

  SELECT COUNT(*)
    INTO v_risk_overrides
  FROM public.ledger_batches lb
  WHERE lb.store_id = p_store_id
    AND lb.posted_at >= v_start
    AND lb.posted_at < v_end
    AND lb.risk_flag = true;

  IF ROUND(v_total_sales, 2) <> ROUND(v_total_cash_inflow, 2) THEN
    v_mismatch := v_mismatch || jsonb_build_object(
      'type', 'cash_vs_sales_mismatch',
      'total_sales', v_total_sales,
      'total_cash_inflow', v_total_cash_inflow
    );
  END IF;

  IF ROUND(v_expected_inventory_delta, 2) <> ROUND(v_inventory_delta_value, 2) THEN
    v_mismatch := v_mismatch || jsonb_build_object(
      'type', 'inventory_vs_cogs_mismatch',
      'expected_inventory_delta', v_expected_inventory_delta,
      'ledger_inventory_delta', v_inventory_delta_value
    );
  END IF;

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'date', p_date,
    'total_sales', ROUND(v_total_sales, 2),
    'total_cash_inflow', ROUND(v_total_cash_inflow, 2),
    'inventory_movement_vs_sales_delta', jsonb_build_object(
      'expected_inventory_delta', ROUND(v_expected_inventory_delta, 2),
      'ledger_inventory_delta', ROUND(v_inventory_delta_value, 2)
    ),
    'risk_override_count', v_risk_overrides,
    'mismatches', v_mismatch,
    'is_balanced', (jsonb_array_length(v_mismatch) = 0)
  );
END;
$$;


ALTER FUNCTION public.generate_daily_reconciliation(p_store_id uuid, p_date date) OWNER TO postgres;

--
-- Name: generate_po_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_po_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('public.po_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_po_number() OWNER TO postgres;

--
-- Name: generate_sale_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_sale_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'SALE-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                       || LPAD(nextval('public.sale_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_sale_number() OWNER TO postgres;

--
-- Name: generate_session_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_session_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.session_number IS NULL OR NEW.session_number = '' THEN
    NEW.session_number := 'SES-' || TO_CHAR(now(), 'YYYYMMDD') || '-'
                          || LPAD(nextval('public.session_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_session_number() OWNER TO postgres;

--
-- Name: get_close_risk_analytics(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_close_risk_analytics(p_store_id uuid DEFAULT NULL::uuid, p_manager_user_id uuid DEFAULT NULL::uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_total_closes integer := 0;
  v_red_closes integer := 0;
  v_red_close_pct numeric(8,2) := 0;
  v_avg_queue_pending numeric(12,2) := 0;
  v_repeated_conflict_stores jsonb := '[]'::jsonb;
  v_risky_managers jsonb := '[]'::jsonb;
  v_override_total integer := 0;
  v_weak_reason_count integer := 0;
  v_overrides_by_user jsonb := '[]'::jsonb;
  v_overrides_by_store jsonb := '[]'::jsonb;
  v_overrides_by_reason_category jsonb := '[]'::jsonb;
  v_override_frequency_trend jsonb := '[]'::jsonb;
  v_repeat_offenders jsonb := jsonb_build_object('users', '[]'::jsonb, 'stores', '[]'::jsonb);
  v_anomalies jsonb := jsonb_build_object(
    'admins_over_monthly_threshold', '[]'::jsonb,
    'stores_over_monthly_threshold', '[]'::jsonb,
    'blank_or_weak_reasons', '[]'::jsonb
  );
BEGIN
  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE close_status = 'red'),
    COALESCE(AVG(queue_pending_count), 0)
  INTO v_total_closes, v_red_closes, v_avg_queue_pending
  FROM filtered;

  IF v_total_closes > 0 THEN
    v_red_close_pct := ROUND((v_red_closes::numeric / v_total_closes::numeric) * 100, 2);
  END IF;

  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'store_id', s.store_id,
        'store_name', s.store_name,
        'conflict_close_count', s.conflict_close_count
      )
      ORDER BY s.conflict_close_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_repeated_conflict_stores
  FROM (
    SELECT
      f.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      COUNT(*) FILTER (WHERE f.conflict_count > 0) AS conflict_close_count
    FROM filtered f
    LEFT JOIN public.stores st ON st.id = f.store_id
    GROUP BY f.store_id, st.name
    HAVING COUNT(*) FILTER (WHERE f.conflict_count > 0) >= 2
    ORDER BY conflict_close_count DESC
    LIMIT 10
  ) s;

  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', r.reviewer_user_id,
        'reviewer_name', r.reviewer_name,
        'risky_close_count', r.risky_close_count,
        'red_close_count', r.red_close_count
      )
      ORDER BY r.risky_close_count DESC, r.red_close_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_risky_managers
  FROM (
    SELECT
      f.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) FILTER (WHERE f.close_status IN ('yellow', 'red')) AS risky_close_count,
      COUNT(*) FILTER (WHERE f.close_status = 'red') AS red_close_count
    FROM filtered f
    LEFT JOIN public.users u ON u.id = f.reviewer_user_id
    GROUP BY f.reviewer_user_id, u.full_name, u.name
    ORDER BY risky_close_count DESC, red_close_count DESC
    LIMIT 10
  ) r;

  WITH filtered AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE
        l.override_reason IS NULL
        OR btrim(l.override_reason) = ''
        OR char_length(btrim(l.override_reason)) < 12
        OR lower(btrim(l.override_reason)) IN ('override', 'ok', 'na', 'n/a', 'urgent', 'approved', 'needed')
    )
  INTO v_override_total, v_weak_reason_count
  FROM filtered l;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', x.reviewer_user_id,
        'reviewer_name', x.reviewer_name,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_overrides_by_user
  FROM (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    GROUP BY o.reviewer_user_id, u.full_name, u.name
    ORDER BY override_count DESC
    LIMIT 20
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'store_id', x.store_id,
        'store_name', x.store_name,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_overrides_by_store
  FROM (
    SELECT
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores st ON st.id = o.store_id
    GROUP BY o.store_id, st.name
    ORDER BY override_count DESC
    LIMIT 20
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reason_category', x.reason_category,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_overrides_by_reason_category
  FROM (
    SELECT
      CASE
        WHEN o.override_reason IS NULL OR btrim(o.override_reason) = '' THEN 'blank'
        WHEN char_length(btrim(o.override_reason)) < 12 THEN 'weak'
        WHEN lower(o.override_reason) LIKE '%sync%' OR lower(o.override_reason) LIKE '%network%' OR lower(o.override_reason) LIKE '%offline%' THEN 'sync_or_connectivity'
        WHEN lower(o.override_reason) LIKE '%conflict%' OR lower(o.override_reason) LIKE '%stock%' OR lower(o.override_reason) LIKE '%inventory%' THEN 'inventory_or_conflict'
        WHEN lower(o.override_reason) LIKE '%cash%' OR lower(o.override_reason) LIKE '%drawer%' OR lower(o.override_reason) LIKE '%difference%' THEN 'cash_reconciliation'
        WHEN lower(o.override_reason) LIKE '%system%' OR lower(o.override_reason) LIKE '%bug%' OR lower(o.override_reason) LIKE '%error%' THEN 'system_issue'
        ELSE 'other'
      END AS reason_category,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    GROUP BY reason_category
    ORDER BY override_count DESC
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', x.period,
        'override_count', x.override_count
      )
      ORDER BY x.period
    ),
    '[]'::jsonb
  )
  INTO v_override_frequency_trend
  FROM (
    SELECT
      to_char(date_trunc('day', o.reviewed_at), 'YYYY-MM-DD') AS period,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    GROUP BY date_trunc('day', o.reviewed_at)
    ORDER BY period
  ) x;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  ),
  offenders_by_user AS (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    GROUP BY o.reviewer_user_id, u.full_name, u.name
    HAVING COUNT(*) >= 3
    ORDER BY override_count DESC
  ),
  offenders_by_store AS (
    SELECT
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores st ON st.id = o.store_id
    GROUP BY o.store_id, st.name
    HAVING COUNT(*) >= 3
    ORDER BY override_count DESC
  )
  SELECT jsonb_build_object(
    'users',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'reviewer_user_id', a.reviewer_user_id,
        'reviewer_name', a.reviewer_name,
        'override_count', a.override_count
      )) FROM offenders_by_user a),
      '[]'::jsonb
    ),
    'stores',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.store_id,
        'store_name', s.store_name,
        'override_count', s.override_count
      )) FROM offenders_by_store s),
      '[]'::jsonb
    )
  )
  INTO v_repeat_offenders;

  WITH filtered_overrides AS (
    SELECT l.*
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= COALESCE(
        p_from::timestamptz,
        date_trunc('month', now())
      )
      AND l.reviewed_at < COALESCE(
        (p_to + INTERVAL '1 day')::timestamptz,
        (date_trunc('month', now()) + INTERVAL '1 month')::timestamptz
      )
      AND l.admin_override = true
  ),
  admin_monthly AS (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      to_char(date_trunc('month', o.reviewed_at), 'YYYY-MM') AS month,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    GROUP BY o.reviewer_user_id, u.full_name, u.name, date_trunc('month', o.reviewed_at)
    HAVING COUNT(*) > 5
  ),
  store_monthly AS (
    SELECT
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      to_char(date_trunc('month', o.reviewed_at), 'YYYY-MM') AS month,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores st ON st.id = o.store_id
    GROUP BY o.store_id, st.name, date_trunc('month', o.reviewed_at)
    HAVING COUNT(*) > 3
  ),
  weak_reason_rows AS (
    SELECT
      o.id,
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      o.store_id,
      COALESCE(st.name, 'Unknown Store') AS store_name,
      o.override_reason,
      o.reviewed_at
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    LEFT JOIN public.stores st ON st.id = o.store_id
    WHERE
      o.override_reason IS NULL
      OR btrim(o.override_reason) = ''
      OR char_length(btrim(o.override_reason)) < 12
      OR lower(btrim(o.override_reason)) IN ('override', 'ok', 'na', 'n/a', 'urgent', 'approved', 'needed')
  )
  SELECT jsonb_build_object(
    'admins_over_monthly_threshold',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'reviewer_user_id', a.reviewer_user_id,
        'reviewer_name', a.reviewer_name,
        'month', a.month,
        'override_count', a.override_count,
        'threshold', 5
      )) FROM admin_monthly a),
      '[]'::jsonb
    ),
    'stores_over_monthly_threshold',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.store_id,
        'store_name', s.store_name,
        'month', s.month,
        'override_count', s.override_count,
        'threshold', 3
      )) FROM store_monthly s),
      '[]'::jsonb
    ),
    'blank_or_weak_reasons',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'close_review_id', w.id,
        'reviewer_user_id', w.reviewer_user_id,
        'reviewer_name', w.reviewer_name,
        'store_id', w.store_id,
        'store_name', w.store_name,
        'override_reason', w.override_reason,
        'reviewed_at', w.reviewed_at
      )) FROM weak_reason_rows w),
      '[]'::jsonb
    )
  )
  INTO v_anomalies;

  RETURN jsonb_build_object(
    'red_closes_percent', v_red_close_pct,
    'average_pending_queue_at_close', ROUND(v_avg_queue_pending, 2),
    'repeated_conflict_stores', v_repeated_conflict_stores,
    'managers_with_most_risky_closes', v_risky_managers,
    'override_total', v_override_total,
    'weak_reason_count', v_weak_reason_count,
    'overrides_by_user', v_overrides_by_user,
    'overrides_by_store', v_overrides_by_store,
    'overrides_by_reason_category', v_overrides_by_reason_category,
    'override_frequency_trend', v_override_frequency_trend,
    'repeat_offenders', v_repeat_offenders,
    'anomalies', v_anomalies
  );
END;
$$;


ALTER FUNCTION public.get_close_risk_analytics(p_store_id uuid, p_manager_user_id uuid, p_from date, p_to date) OWNER TO postgres;

--
-- Name: get_current_user_store_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_store_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT store_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;


ALTER FUNCTION public.get_current_user_store_id() OWNER TO postgres;

--
-- Name: get_current_user_tenant_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_id = (SELECT auth.uid())
  LIMIT 1;
$$;


ALTER FUNCTION public.get_current_user_tenant_id() OWNER TO postgres;

--
-- Name: get_daily_movement_trend(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_daily_movement_trend(p_store_id uuid, p_days integer DEFAULT 14) RETURNS TABLE(trend_date date, total_in bigint, total_out bigint, net_delta bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    DATE(sm.created_at AT TIME ZONE 'UTC')         AS trend_date,
    SUM(CASE WHEN sm.delta > 0 THEN  sm.delta ELSE 0 END) AS total_in,
    SUM(CASE WHEN sm.delta < 0 THEN -sm.delta ELSE 0 END) AS total_out,
    SUM(sm.delta)                                   AS net_delta
  FROM public.stock_movements sm
  WHERE sm.store_id = p_store_id
    AND sm.created_at >= now() - (p_days || ' days')::interval
  GROUP BY trend_date
  ORDER BY trend_date ASC;
$$;


ALTER FUNCTION public.get_daily_movement_trend(p_store_id uuid, p_days integer) OWNER TO postgres;

--
-- Name: get_expected_cash(uuid, uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_expected_cash(p_tenant_id uuid, p_store_id uuid, p_account_id uuid, p_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_balance
    FROM ledger_entries
    WHERE tenant_id = p_tenant_id
      AND store_id = p_store_id
      AND account_id = p_account_id
      AND effective_date = p_date;

    RETURN v_balance;
END;
$$;


ALTER FUNCTION public.get_expected_cash(p_tenant_id uuid, p_store_id uuid, p_account_id uuid, p_date date) OWNER TO postgres;

--
-- Name: get_expiring_batches(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_expiring_batches(p_store_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(batch_id uuid, batch_number text, item_id uuid, item_name text, sku text, qty integer, expires_at date, days_left integer, status text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    b.id            AS batch_id,
    b.batch_number,
    i.id            AS item_id,
    i.name          AS item_name,
    i.sku,
    b.qty,
    b.expires_at,
    (b.expires_at - CURRENT_DATE)::integer AS days_left,
    b.status
  FROM public.item_batches b
  JOIN public.items i ON i.id = b.item_id
  WHERE b.store_id = p_store_id
    AND b.status   = 'active'
    AND b.qty > 0
    AND b.expires_at IS NOT NULL
    AND b.expires_at <= (CURRENT_DATE + p_days)
  ORDER BY b.expires_at ASC;
$$;


ALTER FUNCTION public.get_expiring_batches(p_store_id uuid, p_days integer) OWNER TO postgres;

--
-- Name: get_inventory_list(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_inventory_list(p_store_id uuid) RETURNS TABLE(id uuid, name text, sku text, current_qty integer, min_qty integer, reorder_status text, last_updated timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.sku,
    COALESCE(sl.qty_on_hand, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    CASE 
      WHEN COALESCE(sl.qty_on_hand, 0) = 0 THEN 'OUT'
      WHEN COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5) THEN 'LOW'
      ELSE 'OK'
    END as reorder_status,
    COALESCE(sl.updated_at, i.updated_at) as last_updated
  FROM public.items i
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(sl.qty_on_hand, 0) = 0 THEN 0
      WHEN COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5) THEN 1
      ELSE 2
    END ASC,
    i.name ASC;
END;
$$;


ALTER FUNCTION public.get_inventory_list(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_inventory_movements(uuid, uuid, public.movement_type, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_inventory_movements(p_store_id uuid, p_product_id uuid DEFAULT NULL::uuid, p_movement_type public.movement_type DEFAULT NULL::public.movement_type, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, product_id uuid, product_name text, product_sku text, movement_type public.movement_type, quantity_delta integer, reference_type public.reference_type, reference_id uuid, previous_quantity integer, new_quantity integer, notes text, created_at timestamp with time zone, created_by uuid, performer_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Basic store auth check
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = auth.uid() AND us.store_id = p_store_id
    ) AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        im.id,
        im.product_id,
        i.name AS product_name,
        i.sku AS product_sku,
        im.movement_type,
        im.quantity_delta,
        im.reference_type,
        im.reference_id,
        im.previous_quantity,
        im.new_quantity,
        im.notes,
        im.created_at,
        im.created_by,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'System') AS performer_name
    FROM public.inventory_movements im
    JOIN public.inventory_items i ON i.id = im.product_id
    LEFT JOIN auth.users u ON u.id = im.created_by
    WHERE im.store_id = p_store_id
      AND (p_product_id IS NULL OR im.product_id = p_product_id)
      AND (p_movement_type IS NULL OR im.movement_type = p_movement_type)
    ORDER BY im.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.get_inventory_movements(p_store_id uuid, p_product_id uuid, p_movement_type public.movement_type, p_limit integer, p_offset integer) OWNER TO postgres;

--
-- Name: get_inventory_summary(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_inventory_summary(p_store_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_total_skus bigint;
  v_out_of_stock bigint;
  v_total_value numeric;
  v_total_cost numeric;
BEGIN
  SELECT 
    COUNT(DISTINCT i.id),
    SUM(CASE WHEN sl.qty_on_hand = 0 THEN 1 ELSE 0 END),
    COALESCE(SUM(sl.qty_on_hand * i.price), 0),
    COALESCE(SUM(sl.qty_on_hand * i.cost), 0)
  INTO 
    v_total_skus, 
    v_out_of_stock, 
    v_total_value, 
    v_total_cost
  FROM public.items i
  JOIN public.stock_levels sl ON sl.item_id = i.id
  WHERE sl.store_id = p_store_id
    AND i.is_active = true;

  RETURN jsonb_build_object(
    'total_skus', COALESCE(v_total_skus, 0),
    'out_of_stock_count', COALESCE(v_out_of_stock, 0),
    'total_value', v_total_value,
    'total_cost', v_total_cost
  );
END;
$$;


ALTER FUNCTION public.get_inventory_summary(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_low_stock_items(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_low_stock_items(p_store_id uuid) RETURNS TABLE(item_id uuid, item_name text, sku text, image_url text, category_name text, current_qty bigint, min_qty integer, reorder_qty integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT 
    i.id as item_id,
    i.name as item_name,
    i.sku as sku,
    i.image_url as image_url,
    c.name as category_name,
    COALESCE(sl.qty_on_hand, 0) as current_qty,
    COALESCE(sat.min_qty, 5) as min_qty,
    COALESCE(sat.reorder_qty, 20) as reorder_qty
  FROM public.items i
  LEFT JOIN public.categories c ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
  WHERE i.is_active = true
    AND COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5)
  ORDER BY COALESCE(sl.qty_on_hand, 0) ASC, i.name ASC
  LIMIT 50;
$$;


ALTER FUNCTION public.get_low_stock_items(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_manager_dashboard_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_manager_dashboard_stats(p_store_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_today_sales numeric(12,2) := 0;
  v_total_orders integer := 0;
  v_active_sessions integer := 0;
  v_low_stock_count integer := 0;
  v_recent_sessions jsonb;
  v_start_of_day timestamptz := CURRENT_DATE; 
BEGIN
  -- 1) Calculate Today's Sales & Orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(id)
  INTO 
    v_today_sales,
    v_total_orders
  FROM public.sales
  WHERE store_id = p_store_id
    AND status = 'completed'
    AND created_at >= v_start_of_day;

  -- 2) Count Active Sessions
  SELECT COUNT(id)
  INTO v_active_sessions
  FROM public.pos_sessions
  WHERE store_id = p_store_id
    AND status = 'open';

  -- 3) Calculate Low Stock Items accurately based on per-item thresholds
  SELECT COUNT(s.item_id)
  INTO v_low_stock_count
  FROM (
    SELECT i.id AS item_id
    FROM public.items i
    LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
    WHERE i.is_active = true
      AND COALESCE(sl.qty_on_hand, 0) <= COALESCE(sat.min_qty, 5)
  ) s;

  -- 4) Fetch Recent Sessions (limit to 10 for dashboard widget)
  SELECT jsonb_agg(row_to_json(rs))
  INTO v_recent_sessions
  FROM (
    SELECT 
      ps.id,
      ps.session_number,
      ps.status,
      ps.opened_at,
      ps.total_sales,
      u.name as cashier_name
    FROM public.pos_sessions ps
    LEFT JOIN public.users u ON u.id = ps.cashier_id
    WHERE ps.store_id = p_store_id
    ORDER BY ps.opened_at DESC
    LIMIT 10
  ) rs;

  RETURN jsonb_build_object(
    'today_sales', v_today_sales,
    'total_orders', v_total_orders,
    'active_sessions', v_active_sessions,
    'low_stock_count', v_low_stock_count,
    'recent_sessions', COALESCE(v_recent_sessions, '[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION public.get_manager_dashboard_stats(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_monthly_governance_scorecard(uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_monthly_governance_scorecard(p_store_id uuid DEFAULT NULL::uuid, p_manager_user_id uuid DEFAULT NULL::uuid, p_month date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_month_start date := date_trunc('month', COALESCE(p_month, CURRENT_DATE))::date;
  v_next_month_start date := (date_trunc('month', COALESCE(p_month, CURRENT_DATE)) + INTERVAL '1 month')::date;
  v_prev_month_start date := (date_trunc('month', COALESCE(p_month, CURRENT_DATE)) - INTERVAL '1 month')::date;
  v_curr_red_pct numeric(8,2) := 0;
  v_prev_red_pct numeric(8,2) := 0;
  v_risk_trend_improvement numeric(8,2) := 0;
  v_stores_with_most_overrides jsonb := '[]'::jsonb;
  v_managers_needing_coaching jsonb := '[]'::jsonb;
  v_admins_overriding_too_often jsonb := '[]'::jsonb;
  v_reasons_breakdown jsonb := '[]'::jsonb;
BEGIN
  WITH filtered AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    ROUND(
      (
        COUNT(*) FILTER (WHERE close_status = 'red')::numeric /
        NULLIF(COUNT(*)::numeric, 0)
      ) * 100,
      2
    ),
    0
  )
  INTO v_curr_red_pct
  FROM filtered;

  WITH filtered AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_prev_month_start::timestamptz
      AND l.reviewed_at < v_month_start::timestamptz
  )
  SELECT COALESCE(
    ROUND(
      (
        COUNT(*) FILTER (WHERE close_status = 'red')::numeric /
        NULLIF(COUNT(*)::numeric, 0)
      ) * 100,
      2
    ),
    0
  )
  INTO v_prev_red_pct
  FROM filtered;

  v_risk_trend_improvement := ROUND(v_prev_red_pct - v_curr_red_pct, 2);

  WITH filtered_overrides AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      l.admin_override = true
      AND (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'store_id', x.store_id,
        'store_name', x.store_name,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_stores_with_most_overrides
  FROM (
    SELECT
      o.store_id,
      COALESCE(s.name, 'Unknown Store') AS store_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.stores s ON s.id = o.store_id
    GROUP BY o.store_id, s.name
    ORDER BY override_count DESC
    LIMIT 10
  ) x;

  WITH filtered AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', x.reviewer_user_id,
        'reviewer_name', x.reviewer_name,
        'risky_close_count', x.risky_close_count,
        'override_count', x.override_count
      )
      ORDER BY x.risky_close_count DESC, x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_managers_needing_coaching
  FROM (
    SELECT
      f.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) FILTER (WHERE f.close_status IN ('yellow', 'red')) AS risky_close_count,
      COUNT(*) FILTER (WHERE f.admin_override = true) AS override_count
    FROM filtered f
    LEFT JOIN public.users u ON u.id = f.reviewer_user_id
    GROUP BY f.reviewer_user_id, u.full_name, u.name
    HAVING COUNT(*) FILTER (WHERE f.close_status IN ('yellow', 'red')) >= 3
    ORDER BY risky_close_count DESC, override_count DESC
    LIMIT 10
  ) x;

  WITH filtered_overrides AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      l.admin_override = true
      AND (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reviewer_user_id', x.reviewer_user_id,
        'reviewer_name', x.reviewer_name,
        'override_count', x.override_count,
        'threshold', 5
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_admins_overriding_too_often
  FROM (
    SELECT
      o.reviewer_user_id,
      COALESCE(u.full_name, u.name, 'Unknown User') AS reviewer_name,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    LEFT JOIN public.users u ON u.id = o.reviewer_user_id
    WHERE o.reviewer_role = 'admin'
    GROUP BY o.reviewer_user_id, u.full_name, u.name
    HAVING COUNT(*) > 5
    ORDER BY override_count DESC
  ) x;

  WITH filtered_overrides AS (
    SELECT *
    FROM public.close_review_log l
    WHERE
      l.admin_override = true
      AND (p_store_id IS NULL OR l.store_id = p_store_id)
      AND (p_manager_user_id IS NULL OR l.reviewer_user_id = p_manager_user_id)
      AND l.reviewed_at >= v_month_start::timestamptz
      AND l.reviewed_at < v_next_month_start::timestamptz
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'reason_category', x.reason_category,
        'override_count', x.override_count
      )
      ORDER BY x.override_count DESC
    ),
    '[]'::jsonb
  )
  INTO v_reasons_breakdown
  FROM (
    SELECT
      COALESCE(
        NULLIF(btrim(o.override_reason_category), ''),
        NULLIF(btrim(o.override_reason), ''),
        'unspecified'
      ) AS reason_category,
      COUNT(*) AS override_count
    FROM filtered_overrides o
    GROUP BY 1
    ORDER BY override_count DESC
  ) x;

  RETURN jsonb_build_object(
    'month', to_char(v_month_start, 'YYYY-MM'),
    'stores_with_most_overrides', v_stores_with_most_overrides,
    'managers_needing_coaching', v_managers_needing_coaching,
    'admins_overriding_too_often', v_admins_overriding_too_often,
    'reasons_breakdown', v_reasons_breakdown,
    'risk_trend_improvement', jsonb_build_object(
      'current_red_close_percent', v_curr_red_pct,
      'previous_red_close_percent', v_prev_red_pct,
      'improvement_percent_points', v_risk_trend_improvement
    )
  );
END;
$$;


ALTER FUNCTION public.get_monthly_governance_scorecard(p_store_id uuid, p_manager_user_id uuid, p_month date) OWNER TO postgres;

--
-- Name: get_or_create_ar_account(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_or_create_ar_account(p_tenant_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_account_id UUID;
BEGIN
    SELECT id INTO v_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Accounts Receivable' AND type = 'asset' LIMIT 1;
    IF v_account_id IS NULL THEN
        INSERT INTO accounts (tenant_id, name, type) VALUES (p_tenant_id, 'Accounts Receivable', 'asset') RETURNING id INTO v_account_id;
    END IF;
    RETURN v_account_id;
END;
$$;


ALTER FUNCTION public.get_or_create_ar_account(p_tenant_id uuid) OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    type public.payment_type DEFAULT 'cash'::public.payment_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: get_payment_methods(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_payment_methods(p_store_id uuid) RETURNS SETOF public.payment_methods
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT * FROM public.payment_methods WHERE store_id = p_store_id ORDER BY sort_order ASC;
$$;


ALTER FUNCTION public.get_payment_methods(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_pos_categories(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_pos_categories(p_store_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT jsonb_agg(row_to_json(r) ORDER BY r.name)
  FROM (
    SELECT DISTINCT
      c.id,
      c.name,
      COUNT(i.id) AS item_count
    FROM public.categories c
    JOIN public.items i ON i.category_id = c.id AND i.is_active = true
    GROUP BY c.id, c.name
    HAVING COUNT(i.id) > 0
  ) r;
$$;


ALTER FUNCTION public.get_pos_categories(p_store_id uuid) OWNER TO postgres;

--
-- Name: receipt_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipt_config (
    store_id uuid NOT NULL,
    store_name text,
    header_text text,
    footer_text text,
    logo_url text,
    currency_symbol text DEFAULT '৳'::text NOT NULL,
    show_tax boolean DEFAULT false NOT NULL,
    receipt_printer_type text DEFAULT 'bluetooth_escpos'::text,
    receipt_printer_name text,
    label_printer_type text DEFAULT 'tspl_bluetooth'::text,
    label_printer_name text,
    label_width_mm integer DEFAULT 40,
    label_height_mm integer DEFAULT 30,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.receipt_config OWNER TO postgres;

--
-- Name: get_receipt_config_simple(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_receipt_config_simple(p_store_id uuid) RETURNS public.receipt_config
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT * FROM public.receipt_config WHERE store_id = p_store_id;
$$;


ALTER FUNCTION public.get_receipt_config_simple(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_receivables_aging(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_receivables_aging(p_tenant_id uuid, p_store_id uuid, p_search text DEFAULT NULL::text) RETURNS TABLE(party_id uuid, customer_name text, phone text, balance_due numeric, days_overdue integer, last_note text, promise_to_pay_date date)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_ar_account_id UUID;
BEGIN
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);

    RETURN QUERY
    WITH party_balances AS (
        SELECT 
            le.party_id,
            SUM(le.debit_amount - le.credit_amount) AS balance_due,
            MAX(le.effective_date) FILTER (WHERE le.debit_amount > 0) AS last_credit_sale_date
        FROM ledger_entries le
        WHERE le.tenant_id = p_tenant_id 
          AND le.store_id = p_store_id
          AND le.account_id = v_ar_account_id
          AND le.party_id IS NOT NULL
        GROUP BY le.party_id
        HAVING SUM(le.debit_amount - le.credit_amount) > 0
    ),
    latest_notes AS (
        SELECT DISTINCT ON (fn.party_id) 
            fn.party_id,
            fn.note_text,
            fn.promise_to_pay_date
        FROM followup_notes fn
        WHERE fn.tenant_id = p_tenant_id AND fn.store_id = p_store_id
        ORDER BY fn.party_id, fn.created_at DESC
    )
    SELECT 
        pb.party_id,
        p.name AS customer_name,
        p.phone,
        pb.balance_due,
        COALESCE(CURRENT_DATE - pb.last_credit_sale_date, 0) AS days_overdue,
        ln.note_text AS last_note,
        ln.promise_to_pay_date
    FROM party_balances pb
    JOIN parties p ON p.id = pb.party_id
    LEFT JOIN latest_notes ln ON ln.party_id = pb.party_id
    WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY pb.balance_due DESC, pb.last_credit_sale_date ASC;
END;
$$;


ALTER FUNCTION public.get_receivables_aging(p_tenant_id uuid, p_store_id uuid, p_search text) OWNER TO postgres;

--
-- Name: get_sale_details(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sale_details(p_sale_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_sale_info jsonb;
  v_items jsonb;
  v_payments jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'sale_number', s.sale_number,
    'subtotal', s.subtotal,
    'discount_amount', s.discount_amount,
    'total_amount', s.total_amount,
    'amount_tendered', s.amount_tendered,
    'change_due', s.change_due,
    'status', s.status,
    'notes', s.notes,
    'created_at', s.created_at,
    'cashier_name', u.full_name,
    'voided_at', s.voided_at,
    'void_reason', s.void_reason,
    'voided_by_name', v.full_name
  ) INTO v_sale_info
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  LEFT JOIN public.users v ON v.id = s.voided_by
  WHERE s.id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'item_name', i.name,
    'qty', si.qty,
    'unit_price', si.price,
    'line_total', si.line_total,
    'sku', i.sku
  )) INTO v_items
  FROM public.sale_items si
  JOIN public.items i ON i.id = si.item_id
  WHERE si.sale_id = p_sale_id;

  SELECT jsonb_agg(jsonb_build_object(
    'method_name', pm.name,
    'amount', sp.amount,
    'reference', sp.reference
  )) INTO v_payments
  FROM public.sale_payments sp
  JOIN public.payment_methods pm ON pm.id = sp.payment_method_id
  WHERE sp.sale_id = p_sale_id;

  RETURN jsonb_build_object(
    'sale', v_sale_info,
    'items', COALESCE(v_items, '[]'::jsonb),
    'payments', COALESCE(v_payments, '[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION public.get_sale_details(p_sale_id uuid) OWNER TO postgres;

--
-- Name: get_sales_history(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sales_history(p_store_id uuid, p_search_query text DEFAULT NULL::text, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, sale_number text, total_amount numeric, status text, cashier_name text, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sale_number,
    s.total_amount,
    s.status::text,
    u.full_name as cashier_name,
    s.created_at
  FROM public.sales s
  JOIN public.users u ON u.id = s.cashier_id
  WHERE s.store_id = p_store_id
    AND (p_search_query IS NULL OR s.sale_number ILIKE '%' || p_search_query || '%')
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.get_sales_history(p_store_id uuid, p_search_query text, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_limit integer, p_offset integer) OWNER TO postgres;

--
-- Name: get_session_summary(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_session_summary(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_session public.pos_sessions;
  v_cashier_name text;
  v_total_cash_sales numeric := 0;
  v_expected_drawer numeric := 0;
BEGIN
  -- Get session details
  SELECT * INTO v_session FROM public.pos_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  SELECT name INTO v_cashier_name FROM public.users WHERE id = v_session.cashier_id;

  -- Calculate exact cash taken in this session
  -- This resolves the complex change math by letting the DB sum up the exact amounts.
  -- For a real POS, we sum (amount_tendered - change_due) for cash payments
  -- Here we assume total_amount is what went into the drawer.
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_cash_sales
  FROM public.sales
  WHERE session_id = p_session_id AND status = 'completed';

  v_expected_drawer := v_session.opening_cash + v_total_cash_sales;

  -- If it's already closed, it might already have the expected calculated.
  -- But we return current calculation.
  
  RETURN jsonb_build_object(
    'session', row_to_json(v_session),
    'cashier_name', v_cashier_name,
    'total_cash_sales', v_total_cash_sales,
    'expected_drawer', v_expected_drawer
  );
END;
$$;


ALTER FUNCTION public.get_session_summary(p_session_id uuid) OWNER TO postgres;

--
-- Name: get_slow_moving_items(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_slow_moving_items(p_store_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 50) RETURNS TABLE(item_id uuid, item_name text, sku text, category_name text, qty_on_hand bigint, total_cost numeric, last_sold_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    i.id                                        AS item_id,
    i.name                                      AS item_name,
    i.sku,
    c.name                                      AS category_name,
    COALESCE(sl.qty, 0)                         AS qty_on_hand,
    COALESCE(sl.qty, 0) * i.cost                AS total_cost,
    MAX(sa.created_at)                          AS last_sold_at
  FROM public.items i
  LEFT JOIN public.categories c    ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl  ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.sale_items si    ON si.item_id = i.id
  LEFT JOIN public.sales sa         ON sa.id = si.sale_id
                                    AND sa.store_id = p_store_id
                                    AND sa.status = 'completed'
                                    AND sa.created_at >= now() - (p_days || ' days')::interval
  WHERE i.is_active = true
    AND COALESCE(sl.qty, 0) > 0
  GROUP BY i.id, i.name, i.sku, c.name, sl.qty, i.cost
  HAVING COUNT(si.item_id) = 0   -- zero sales in window
  ORDER BY total_cost DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION public.get_slow_moving_items(p_store_id uuid, p_days integer, p_limit integer) OWNER TO postgres;

--
-- Name: get_stock_history_simple(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_stock_history_simple(p_store_id uuid, p_item_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, item_name text, delta integer, reason text, notes text, performer_name text, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    i.name as item_name,
    sm.delta,
    sm.reason,
    COALESCE(sm.meta->>'notes', '') as notes,
    u.full_name as performer_name,
    sm.created_at
  FROM public.stock_movements sm
  JOIN public.items i ON i.id = sm.item_id
  LEFT JOIN public.users u ON u.id = sm.performed_by
  WHERE sm.store_id = p_store_id
    AND (p_item_id IS NULL OR sm.item_id = p_item_id)
  ORDER BY sm.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_stock_history_simple(p_store_id uuid, p_item_id uuid, p_limit integer) OWNER TO postgres;

--
-- Name: get_stock_level_by_id(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_stock_level_by_id(p_stock_level_id uuid) RETURNS TABLE(stock_level_id uuid, store_id uuid, product_id uuid, quantity integer, last_updated timestamp with time zone, recent_movements jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT 
    sl.id,
    sl.store_id,
    sl.item_id,
    sl.qty,
    sl.updated_at,
    (
      SELECT jsonb_agg(row_to_json(lm))
      FROM (
        SELECT * FROM public.stock_ledger
        WHERE store_id = sl.store_id
          AND product_id = sl.item_id
        ORDER BY created_at DESC
        LIMIT 10
      ) lm
    ) AS recent_movements
  FROM public.stock_levels sl
  WHERE sl.id = p_stock_level_id;
$$;


ALTER FUNCTION public.get_stock_level_by_id(p_stock_level_id uuid) OWNER TO postgres;

--
-- Name: get_stock_level_by_id(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_stock_level_by_id(p_store_id uuid, p_item_id uuid) RETURNS TABLE(store_id uuid, item_id uuid, quantity integer, recent_movements jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    sl.store_id,
    sl.item_id,
    sl.qty,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', im.id,
        'delta', im.quantity_delta,
        'reason', im.movement_type,
        'created_at', im.created_at
      ))
      FROM (
        SELECT * FROM public.inventory_movements
        WHERE store_id = sl.store_id AND product_id = sl.item_id
        ORDER BY created_at DESC
        LIMIT 10
      ) im
    ) AS recent_movements
  FROM public.stock_levels sl
  WHERE sl.store_id = p_store_id AND sl.item_id = p_item_id;
$$;


ALTER FUNCTION public.get_stock_level_by_id(p_store_id uuid, p_item_id uuid) OWNER TO postgres;

--
-- Name: get_stock_movements(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_stock_movements(p_store_id uuid DEFAULT NULL::uuid, p_item_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, store_id uuid, item_id uuid, delta integer, reason text, notes text, meta jsonb, performed_by uuid, performer_name text, item_name text, store_code text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.store_id,
    sm.item_id,
    sm.delta,
    sm.reason,
    (sm.meta ->> 'notes')::text AS notes,
    sm.meta,
    sm.performed_by,
    u.full_name AS performer_name,
    i.name AS item_name,
    s.code AS store_code,
    sm.created_at
  FROM public.stock_movements sm
  LEFT JOIN public.users u ON u.id = sm.performed_by
  LEFT JOIN public.items i ON i.id = sm.item_id
  LEFT JOIN public.stores s ON s.id = sm.store_id
  WHERE (p_store_id IS NULL OR sm.store_id = p_store_id)
    AND (p_item_id IS NULL OR sm.item_id = p_item_id)
  ORDER BY sm.created_at DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.get_stock_movements(p_store_id uuid, p_item_id uuid, p_limit integer, p_offset integer) OWNER TO postgres;

--
-- Name: get_stock_valuation(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_stock_valuation(p_store_id uuid, p_limit integer DEFAULT 100) RETURNS TABLE(item_id uuid, item_name text, sku text, category_name text, qty_on_hand bigint, unit_cost numeric, unit_price numeric, total_cost numeric, total_value numeric, margin_pct numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    i.id                                          AS item_id,
    i.name                                        AS item_name,
    i.sku,
    c.name                                        AS category_name,
    COALESCE(sl.qty, 0)                           AS qty_on_hand,
    i.cost                                        AS unit_cost,
    i.price                                       AS unit_price,
    COALESCE(sl.qty, 0) * i.cost                  AS total_cost,
    COALESCE(sl.qty, 0) * i.price                 AS total_value,
    CASE
      WHEN i.price > 0
      THEN ROUND(((i.price - i.cost) / i.price) * 100, 2)
      ELSE 0
    END                                           AS margin_pct
  FROM public.items i
  LEFT JOIN public.categories c   ON c.id = i.category_id
  LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
  WHERE i.is_active = true
  ORDER BY total_value DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION public.get_stock_valuation(p_store_id uuid, p_limit integer) OWNER TO postgres;

--
-- Name: get_store_users(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_store_users(p_store_id uuid) RETURNS TABLE(id uuid, full_name text, role text, email text, last_login timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT id, full_name, role, email, last_login_at
  FROM public.users
  WHERE store_id = p_store_id OR role = 'admin'
  ORDER BY role ASC, full_name ASC;
$$;


ALTER FUNCTION public.get_store_users(p_store_id uuid) OWNER TO postgres;

--
-- Name: get_top_selling_items(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_top_selling_items(p_store_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 20) RETURNS TABLE(item_id uuid, item_name text, sku text, category_name text, total_qty bigint, total_revenue numeric, total_profit numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    i.id                     AS item_id,
    i.name                   AS item_name,
    i.sku,
    c.name                   AS category_name,
    SUM(si.qty)              AS total_qty,
    SUM(si.total)            AS total_revenue,
    SUM(si.total - (si.cost * si.qty)) AS total_profit
  FROM public.sale_items si
  JOIN public.sales    sa ON sa.id = si.sale_id
  JOIN public.items    i  ON i.id  = si.item_id
  LEFT JOIN public.categories c ON c.id = i.category_id
  WHERE sa.store_id = p_store_id
    AND sa.created_at >= now() - (p_days || ' days')::interval
    AND sa.status = 'completed'
  GROUP BY i.id, i.name, i.sku, c.name
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION public.get_top_selling_items(p_store_id uuid, p_days integer, p_limit integer) OWNER TO postgres;

--
-- Name: get_upcoming_reminders(uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_upcoming_reminders(p_store_id uuid, p_include_completed boolean DEFAULT false) RETURNS SETOF public.reminders
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT r.*
    FROM reminders r
    WHERE r.store_id = p_store_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id)
      AND (p_include_completed OR r.is_completed = false)
    ORDER BY r.reminder_date ASC, r.created_at ASC;
$$;


ALTER FUNCTION public.get_upcoming_reminders(p_store_id uuid, p_include_completed boolean) OWNER TO postgres;

--
-- Name: heartbeat_ledger_worker(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.heartbeat_ledger_worker(p_worker_id text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.ledger_workers (worker_id, active, last_heartbeat, updated_at)
  VALUES (p_worker_id, true, now(), now())
  ON CONFLICT (worker_id)
  DO UPDATE SET
    active = true,
    last_heartbeat = now(),
    updated_at = now();

  RETURN true;
END;
$$;


ALTER FUNCTION public.heartbeat_ledger_worker(p_worker_id text) OWNER TO postgres;

--
-- Name: import_apply_stock_delta(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.import_apply_stock_delta(p_store_id uuid, p_item_id uuid, p_delta integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_inserted boolean;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be > 0';
  END IF;

  WITH upserted AS (
    INSERT INTO public.stock_levels (store_id, item_id, qty)
    VALUES (p_store_id, p_item_id, p_delta)
    ON CONFLICT (store_id, item_id)
    DO UPDATE SET qty = public.stock_levels.qty + EXCLUDED.qty
    RETURNING (xmax = 0) AS inserted
  )
  SELECT inserted INTO v_inserted FROM upserted;

  RETURN COALESCE(v_inserted, false);
END;
$$;


ALTER FUNCTION public.import_apply_stock_delta(p_store_id uuid, p_item_id uuid, p_delta integer) OWNER TO postgres;

--
-- Name: import_historical_daily_sale(uuid, date, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.import_historical_daily_sale(p_store_id uuid, p_date date, p_cash_amount numeric, p_bkash_amount numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_batch_id uuid;
  v_user_id uuid;
  v_cash_account uuid;
  v_bank_account uuid;
  v_revenue_account uuid;
  v_total_amount numeric := ROUND(p_cash_amount + p_bkash_amount, 2);
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Ensure accounts exist
  PERFORM public.ensure_sale_ledger_accounts(p_store_id);

  SELECT id INTO v_cash_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1000_CASH';
  SELECT id INTO v_bank_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1010_BANK';
  SELECT id INTO v_revenue_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '4000_SALES_REVENUE';

  -- Create Ledger Batch for the Historical Daily Sale
  INSERT INTO public.ledger_batches (store_id, source_type, source_ref, status, created_by, posted_at)
  VALUES (p_store_id, 'historical_sale', 'Sheets Import: ' || p_date::text, 'POSTED', v_user_id, p_date::timestamptz)
  RETURNING id INTO v_batch_id;

  -- Debit Cash
  IF p_cash_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_cash_account, 'Historical Cash Sale', ROUND(p_cash_amount, 2), 0);
  END IF;

  -- Debit Bank/bKash
  IF p_bkash_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_bank_account, 'Historical bKash Sale', ROUND(p_bkash_amount, 2), 0);
  END IF;

  -- Credit Revenue
  IF v_total_amount > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
    VALUES (v_batch_id, v_revenue_account, 'Historical Gross Revenue', 0, v_total_amount);
  END IF;

  RETURN jsonb_build_object('status', 'SUCCESS', 'batch_id', v_batch_id, 'total_imported', v_total_amount);
END;
$$;


ALTER FUNCTION public.import_historical_daily_sale(p_store_id uuid, p_date date, p_cash_amount numeric, p_bkash_amount numeric) OWNER TO postgres;

--
-- Name: is_admin_in_tenant(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin_in_tenant(p_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('admin', 'manager', 'advisor')
      AND tenant_id = p_tenant_id
  );
$$;


ALTER FUNCTION public.is_admin_in_tenant(p_tenant_id uuid) OWNER TO postgres;

--
-- Name: is_ledger_worker_alive(text, interval); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_ledger_worker_alive(p_worker_id text, p_max_staleness interval DEFAULT '00:01:00'::interval) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ledger_workers w
    WHERE w.worker_id = p_worker_id
      AND w.active = true
      AND w.last_heartbeat >= now() - COALESCE(p_max_staleness, interval '60 seconds')
  );
$$;


ALTER FUNCTION public.is_ledger_worker_alive(p_worker_id text, p_max_staleness interval) OWNER TO postgres;

--
-- Name: is_period_closed(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_period_closed(p_store_id uuid, p_posted_at timestamp with time zone) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.store_id = p_store_id
      AND ap.status = 'CLOSED'
      AND p_posted_at::date >= ap.period_start
      AND p_posted_at::date < ap.period_end
  );
$$;


ALTER FUNCTION public.is_period_closed(p_store_id uuid, p_posted_at timestamp with time zone) OWNER TO postgres;

--
-- Name: issue_pos_override_token(uuid, text, jsonb, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.issue_pos_override_token(p_store_id uuid, p_reason text, p_affected_items jsonb DEFAULT '[]'::jsonb, p_ttl_minutes integer DEFAULT 10) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_plain_token text;
BEGIN
  SELECT id, role INTO v_user_id, v_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object(
      'status', 'REJECTED',
      'message', 'Manager/Admin role required'
    );
  END IF;

  v_plain_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.pos_override_tokens (
    store_id, issued_by, token_hash, reason, affected_items, expires_at
  ) VALUES (
    p_store_id,
    v_user_id,
    encode(digest(v_plain_token, 'sha256'), 'hex'),
    p_reason,
    COALESCE(p_affected_items, '[]'::jsonb),
    now() + make_interval(mins => GREATEST(1, p_ttl_minutes))
  );

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'override_token', v_plain_token,
    'expires_at', (now() + make_interval(mins => GREATEST(1, p_ttl_minutes)))
  );
END;
$$;


ALTER FUNCTION public.issue_pos_override_token(p_store_id uuid, p_reason text, p_affected_items jsonb, p_ttl_minutes integer) OWNER TO postgres;

--
-- Name: log_customer_reminder(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_customer_reminder(p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_type text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO customer_reminders (tenant_id, store_id, party_id, reminder_type, sent_by)
    VALUES (p_tenant_id, p_store_id, p_party_id, p_type, v_user_id)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


ALTER FUNCTION public.log_customer_reminder(p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_type text) OWNER TO postgres;

--
-- Name: log_sale_sync_conflict(uuid, text, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_sale_sync_conflict(p_store_id uuid, p_client_transaction_id text, p_conflict_type text, p_details jsonb DEFAULT '{}'::jsonb, p_requires_manager_review boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.sale_sync_conflicts (
    store_id,
    client_transaction_id,
    conflict_type,
    details,
    requires_manager_review
  )
  VALUES (
    p_store_id,
    p_client_transaction_id,
    p_conflict_type,
    COALESCE(p_details, '{}'::jsonb),
    p_requires_manager_review
  )
  ON CONFLICT (store_id, client_transaction_id, conflict_type)
  DO UPDATE SET
    details = EXCLUDED.details,
    requires_manager_review = EXCLUDED.requires_manager_review,
    status = CASE
      WHEN public.sale_sync_conflicts.status = 'resolved' THEN 'resolved'
      ELSE 'pending_review'
    END;
END;
$$;


ALTER FUNCTION public.log_sale_sync_conflict(p_store_id uuid, p_client_transaction_id text, p_conflict_type text, p_details jsonb, p_requires_manager_review boolean) OWNER TO postgres;

--
-- Name: log_stock_ledger_on_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_stock_ledger_on_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.qty IS DISTINCT FROM OLD.qty THEN
    INSERT INTO public.stock_ledger (
      store_id, product_id, previous_quantity, new_quantity,
      quantity_change, transaction_type, reason, movement_id, metadata
    ) VALUES (
      NEW.store_id, NEW.item_id, OLD.qty, NEW.qty,
      NEW.qty - OLD.qty, 'system_adjustment',
      'Stock level adjusted via system',
      gen_random_uuid(),
      jsonb_build_object('update_type', CASE
        WHEN NEW.qty > OLD.qty THEN 'restock' ELSE 'removal'
      END)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_stock_ledger_on_update() OWNER TO postgres;

--
-- Name: lookup_item_by_scan(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lookup_item_by_scan(p_scan_value text, p_store_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT jsonb_build_object(
    'id',           i.id,
    'sku',          i.sku,
    'short_code',   i.short_code,
    'barcode',      i.barcode,
    'name',         i.name,
    'brand',        i.brand,
    'mrp',          COALESCE(i.mrp, i.price),
    'price',        i.price,
    'cost',         i.cost,
    'group_tag',    i.group_tag,
    'image_url',    i.image_url,
    'qty_on_hand',  COALESCE(sl.qty_on_hand, 0),
    'category',     c.name
  )
  FROM public.items i
  LEFT JOIN public.stock_levels sl
         ON sl.item_id = i.id AND sl.store_id = p_store_id
  LEFT JOIN public.categories c
         ON c.id = i.category_id
  WHERE i.is_active = true
    AND (
      i.sku        = p_scan_value OR
      i.barcode    = p_scan_value OR
      i.short_code = p_scan_value
    )
  LIMIT 1;
$$;


ALTER FUNCTION public.lookup_item_by_scan(p_scan_value text, p_store_id uuid) OWNER TO postgres;

--
-- Name: mark_followup_resolved(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_followup_resolved(p_note_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    UPDATE followup_notes
    SET status = 'resolved'
    WHERE id = p_note_id;
    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.mark_followup_resolved(p_note_id uuid) OWNER TO postgres;

--
-- Name: post_draft_purchase_receipt(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.post_draft_purchase_receipt(p_receipt_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_receipt   RECORD;
  v_items     JSONB;
  v_result    JSONB;
BEGIN
  SELECT * INTO v_receipt
  FROM public.purchase_receipts
  WHERE id = p_receipt_id
  FOR UPDATE;

  IF v_receipt.id IS NULL THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  IF v_receipt.status <> 'draft' THEN
    RAISE EXCEPTION 'Receipt is already % (not draft)', v_receipt.status;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'item_id', pri.item_id,
      'quantity', pri.quantity,
      'unit_cost', pri.unit_cost
    )
  ) INTO v_items
  FROM public.purchase_receipt_items pri
  WHERE pri.receipt_id = p_receipt_id;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'No items found for this receipt';
  END IF;

  SELECT public.record_purchase_v2(
    'post_draft_' || p_receipt_id::TEXT || '_' || NOW()::TEXT,
    v_receipt.tenant_id,
    v_receipt.store_id,
    v_receipt.supplier_id,
    v_receipt.invoice_number,
    v_receipt.invoice_total,
    v_items,
    v_receipt.amount_paid,
    NULL,
    NULL,
    'posted',
    v_receipt.notes
  ) INTO v_result;

  UPDATE public.purchase_receipts
  SET status = 'posted',
      updated_at = NOW()
  WHERE id = p_receipt_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION public.post_draft_purchase_receipt(p_receipt_id uuid) OWNER TO postgres;

--
-- Name: post_sale_to_ledger(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.post_sale_to_ledger(p_sale_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_sale record;
  v_item record;
  v_payment record;
  v_batch_id uuid;
  v_revenue_account uuid;
  v_inventory_account uuid;
  v_cogs_account uuid;
  v_discount_account uuid;
  v_payment_account uuid;
  v_discount_absorption numeric(12,2) := 0;
  v_cogs_total numeric(12,2) := 0;
  v_gross_revenue numeric(12,2) := 0;
  v_existing_entries integer := 0;
  v_idem record;
BEGIN
  SELECT * INTO v_sale
  FROM public.sales s
  WHERE s.id = p_sale_id
  FOR UPDATE;

  IF v_sale.id IS NULL THEN
    RETURN jsonb_build_object('status', 'FAILED_POSTING', 'message', 'Sale not found');
  END IF;

  IF v_sale.accounting_posting_status = 'POSTED' AND v_sale.ledger_batch_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_sale.ledger_batch_id
    );
  END IF;

  IF public.is_period_closed(v_sale.store_id, COALESCE(v_sale.created_at, now())) THEN
    UPDATE public.sales
    SET accounting_posting_status = 'FAILED_POSTING',
        accounting_posting_error = 'period_closed'
    WHERE id = v_sale.id;

    INSERT INTO public.ledger_posting_idempotency (sale_id, posting_state, attempt_count, last_error, last_attempt_at)
    VALUES (v_sale.id, 'FAILED', 1, 'period_closed', now())
    ON CONFLICT (sale_id)
    DO UPDATE SET
      posting_state = 'FAILED',
      attempt_count = public.ledger_posting_idempotency.attempt_count + 1,
      last_error = 'period_closed',
      last_attempt_at = now();

    RETURN jsonb_build_object('status', 'FAILED_POSTING', 'message', 'Accounting period is closed');
  END IF;

  INSERT INTO public.ledger_posting_idempotency (sale_id, posting_state, attempt_count, last_attempt_at)
  VALUES (v_sale.id, 'IN_PROGRESS', 1, now())
  ON CONFLICT (sale_id)
  DO UPDATE SET
    posting_state = CASE
      WHEN public.ledger_posting_idempotency.posting_state = 'POSTED' THEN 'POSTED'
      ELSE 'IN_PROGRESS'
    END,
    attempt_count = public.ledger_posting_idempotency.attempt_count + 1,
    last_attempt_at = now()
  RETURNING * INTO v_idem;

  SELECT * INTO v_idem
  FROM public.ledger_posting_idempotency
  WHERE sale_id = v_sale.id
  FOR UPDATE;

  IF v_idem.posting_state = 'POSTED' AND v_idem.ledger_batch_id IS NOT NULL THEN
    UPDATE public.sales
    SET ledger_batch_id = COALESCE(v_sale.ledger_batch_id, v_idem.ledger_batch_id),
        accounting_posting_status = 'POSTED',
        accounting_posted_at = COALESCE(v_sale.accounting_posted_at, now()),
        accounting_posting_error = NULL
    WHERE id = v_sale.id;

    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_idem.ledger_batch_id
    );
  END IF;

  PERFORM public.ensure_sale_ledger_accounts(v_sale.store_id);

  SELECT id INTO v_batch_id
  FROM public.ledger_batches
  WHERE source_type = 'sale'
    AND source_id = v_sale.id
  LIMIT 1
  FOR UPDATE;

  IF v_batch_id IS NULL THEN
    INSERT INTO public.ledger_batches (
      store_id, source_type, source_id, source_ref, status, override_used, risk_flag, risk_note, created_by
    )
    VALUES (
      v_sale.store_id,
      'sale',
      v_sale.id,
      v_sale.client_transaction_id,
      'POSTED',
      false,
      false,
      NULL,
      v_sale.cashier_id
    )
    RETURNING id INTO v_batch_id;
  END IF;

  SELECT COUNT(*) INTO v_existing_entries
  FROM public.ledger_entries
  WHERE batch_id = v_batch_id;

  IF v_existing_entries > 0 THEN
    UPDATE public.sales
    SET ledger_batch_id = v_batch_id,
        accounting_posting_status = 'POSTED',
        accounting_posted_at = COALESCE(v_sale.accounting_posted_at, now()),
        accounting_posting_error = NULL
    WHERE id = v_sale.id;

    UPDATE public.ledger_posting_idempotency
    SET posting_state = 'POSTED',
        ledger_batch_id = v_batch_id,
        completed_at = now(),
        last_error = NULL,
        last_attempt_at = now()
    WHERE sale_id = v_sale.id;

    RETURN jsonb_build_object(
      'status', 'POSTED',
      'sale_id', v_sale.id,
      'ledger_batch_id', v_batch_id
    );
  END IF;

  SELECT id INTO v_revenue_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '4000_SALES_REVENUE';
  SELECT id INTO v_inventory_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '1200_INVENTORY';
  SELECT id INTO v_cogs_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '5000_COGS';
  SELECT id INTO v_discount_account FROM public.ledger_accounts WHERE store_id = v_sale.store_id AND code = '5100_DISCOUNT_ABSORPTION';

  FOR v_item IN
    SELECT si.*, i.mrp
    FROM public.sale_items si
    JOIN public.items i ON i.id = si.item_id
    WHERE si.sale_id = v_sale.id
  LOOP
    v_discount_absorption := v_discount_absorption + GREATEST(COALESCE(v_item.mrp, v_item.unit_price) - v_item.unit_price, 0) * v_item.qty;
    v_cogs_total := v_cogs_total + (v_item.cost * v_item.qty);
    v_gross_revenue := v_gross_revenue + v_item.line_total + (GREATEST(COALESCE(v_item.mrp, v_item.unit_price) - v_item.unit_price, 0) * v_item.qty);
  END LOOP;

  FOR v_payment IN
    SELECT row_number() OVER (ORDER BY sp.id) AS line_no, sp.*
    FROM public.sale_payments sp
    WHERE sp.sale_id = v_sale.id
  LOOP
    v_payment_account := public.resolve_payment_ledger_account(v_sale.store_id, v_payment.payment_method_id);
    INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
    VALUES (
      v_batch_id,
      v_payment_account,
      v_sale.id,
      format('payment_%s', v_payment.line_no),
      ROUND(v_payment.amount, 2),
      0,
      jsonb_build_object('payment_method_id', v_payment.payment_method_id, 'reference', v_payment.reference)
    );
  END LOOP;

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_revenue_account, v_sale.id, 'gross_revenue', 0, ROUND(v_gross_revenue, 2),
    jsonb_build_object('recognized_from_fulfilled_qty_only', true)
  );

  IF ROUND(v_discount_absorption, 2) > 0 THEN
    INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
    VALUES (
      v_batch_id, v_discount_account, v_sale.id, 'discount_absorption', ROUND(v_discount_absorption, 2), 0,
      jsonb_build_object('basis', 'mrp_minus_selling_price')
    );
  END IF;

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_cogs_account, v_sale.id, 'cogs', ROUND(v_cogs_total, 2), 0,
    jsonb_build_object('source', 'sale_items.cost')
  );

  INSERT INTO public.ledger_entries(batch_id, account_id, sale_id, line_ref, debit, credit, annotation)
  VALUES (
    v_batch_id, v_inventory_account, v_sale.id, 'inventory_reduction', 0, ROUND(v_cogs_total, 2),
    jsonb_build_object('source', 'sale_items.cost')
  );

  UPDATE public.sales
  SET ledger_batch_id = v_batch_id,
      accounting_posting_status = 'POSTED',
      accounting_posted_at = now(),
      accounting_posting_error = NULL
  WHERE id = v_sale.id;

  UPDATE public.ledger_posting_idempotency
  SET posting_state = 'POSTED',
      ledger_batch_id = v_batch_id,
      completed_at = now(),
      last_error = NULL,
      last_attempt_at = now()
  WHERE sale_id = v_sale.id;

  RETURN jsonb_build_object(
    'status', 'POSTED',
    'sale_id', v_sale.id,
    'ledger_batch_id', v_batch_id
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.sales
  SET accounting_posting_status = 'FAILED_POSTING',
      accounting_posting_error = SQLERRM
  WHERE id = p_sale_id;

  INSERT INTO public.ledger_posting_idempotency (sale_id, posting_state, attempt_count, last_error, last_attempt_at)
  VALUES (p_sale_id, 'FAILED', 1, SQLERRM, now())
  ON CONFLICT (sale_id)
  DO UPDATE SET
    posting_state = 'FAILED',
    attempt_count = public.ledger_posting_idempotency.attempt_count + 1,
    last_error = SQLERRM,
    last_attempt_at = now();

  RETURN jsonb_build_object(
    'status', 'FAILED_POSTING',
    'sale_id', p_sale_id,
    'message', SQLERRM
  );
END;
$$;


ALTER FUNCTION public.post_sale_to_ledger(p_sale_id uuid) OWNER TO postgres;

--
-- Name: prevent_inventory_movement_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_inventory_movement_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'inventory_movements is an append-only table. Updates are not allowed.';
END;
$$;


ALTER FUNCTION public.prevent_inventory_movement_update() OWNER TO postgres;

--
-- Name: prevent_ledger_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable once posted';
END;
$$;


ALTER FUNCTION public.prevent_ledger_mutation() OWNER TO postgres;

--
-- Name: prevent_sale_audit_log_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_sale_audit_log_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RAISE EXCEPTION 'sale_audit_log is immutable';
END;
$$;


ALTER FUNCTION public.prevent_sale_audit_log_mutation() OWNER TO postgres;

--
-- Name: process_ledger_posting_batch(text, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_ledger_posting_batch(p_worker_id text, p_batch_size integer DEFAULT 50, p_store_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_job public.ledger_posting_queue%ROWTYPE;
  v_sale record;
  v_result jsonb;
  v_status text;
  v_processed integer := 0;
  v_posted integer := 0;
  v_retry integer := 0;
  v_failed integer := 0;
BEGIN
  PERFORM public.register_ledger_worker(p_worker_id);
  PERFORM public.heartbeat_ledger_worker(p_worker_id);
  PERFORM public.reclaim_stale_ledger_locks();

  FOR v_job IN
    SELECT *
    FROM public.claim_ledger_posting_jobs(
      p_worker_id,
      GREATEST(1, COALESCE(p_batch_size, 1)),
      p_store_id
    )
  LOOP
    v_processed := v_processed + 1;

    BEGIN
      PERFORM public.heartbeat_ledger_worker(p_worker_id);
      PERFORM public.renew_ledger_job_lease(p_worker_id, v_job.id);

      SELECT s.id, s.store_id, s.accounting_posting_status, s.ledger_batch_id, s.created_at
      INTO v_sale
      FROM public.sales s
      WHERE s.id = v_job.sale_id
      FOR UPDATE;

      IF v_sale.id IS NULL THEN
        UPDATE public.ledger_posting_queue
        SET status = 'FAILED',
            attempt_count = attempt_count + 1,
            next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(attempt_count, 6)), 300)),
            last_error = 'sale_not_found',
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;
        v_failed := v_failed + 1;
        CONTINUE;
      END IF;

      IF v_sale.accounting_posting_status = 'POSTED' OR v_sale.ledger_batch_id IS NOT NULL THEN
        UPDATE public.ledger_posting_queue
        SET status = 'POSTED',
            last_error = NULL,
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;
        v_posted := v_posted + 1;
        CONTINUE;
      END IF;

      v_result := public.post_sale_to_ledger(v_sale.id);
      v_status := COALESCE(v_result->>'status', 'FAILED_POSTING');

      IF v_status = 'POSTED' THEN
        UPDATE public.ledger_posting_queue
        SET status = 'POSTED',
            last_error = NULL,
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;
        v_posted := v_posted + 1;
      ELSE
        UPDATE public.ledger_posting_queue
        SET status = CASE
              WHEN attempt_count + 1 >= max_attempts THEN 'FAILED'
              ELSE 'PENDING'
            END,
            attempt_count = attempt_count + 1,
            next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(attempt_count, 6)), 300)),
            last_error = COALESCE(v_result->>'message', 'posting_failed'),
            locked_by = NULL,
            locked_at = NULL,
            lock_expires_at = NULL,
            updated_at = now()
        WHERE id = v_job.id;

        IF (SELECT status FROM public.ledger_posting_queue WHERE id = v_job.id) = 'FAILED' THEN
          v_failed := v_failed + 1;
        ELSE
          v_retry := v_retry + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.ledger_posting_queue
      SET status = CASE
            WHEN attempt_count + 1 >= max_attempts THEN 'FAILED'
            ELSE 'PENDING'
          END,
          attempt_count = attempt_count + 1,
          next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(attempt_count, 6)), 300)),
          last_error = SQLERRM,
          locked_by = NULL,
          locked_at = NULL,
          lock_expires_at = NULL,
          updated_at = now()
      WHERE id = v_job.id;

      IF (SELECT status FROM public.ledger_posting_queue WHERE id = v_job.id) = 'FAILED' THEN
        v_failed := v_failed + 1;
      ELSE
        v_retry := v_retry + 1;
      END IF;
    END;
  END LOOP;

  PERFORM public.heartbeat_ledger_worker(p_worker_id);

  RETURN jsonb_build_object(
    'worker_id', p_worker_id,
    'processed', v_processed,
    'posted', v_posted,
    'retry_scheduled', v_retry,
    'failed', v_failed
  );
END;
$$;


ALTER FUNCTION public.process_ledger_posting_batch(p_worker_id text, p_batch_size integer, p_store_id uuid) OWNER TO postgres;

--
-- Name: process_pending_ledger_postings(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_pending_ledger_postings(p_store_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_sale record;
  v_result jsonb;
  v_processed integer := 0;
  v_failed integer := 0;
BEGIN
  FOR v_sale IN
    SELECT s.id
    FROM public.sales s
    WHERE s.accounting_posting_status = 'PENDING_POSTING'
      AND (p_store_id IS NULL OR s.store_id = p_store_id)
    ORDER BY s.created_at
    LIMIT GREATEST(1, p_limit)
  LOOP
    v_result := public.post_sale_to_ledger(v_sale.id);
    v_processed := v_processed + 1;
    IF (v_result->>'status') = 'FAILED_POSTING' THEN
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'failed', v_failed
  );
END;
$$;


ALTER FUNCTION public.process_pending_ledger_postings(p_store_id uuid, p_limit integer) OWNER TO postgres;

--
-- Name: receive_purchase_order(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.receive_purchase_order(p_po_id uuid, p_received_items jsonb, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_po            public.purchase_orders%ROWTYPE;
  v_user_id       uuid;
  v_poi           public.purchase_order_items%ROWTYPE;
  v_recv_item     record;
  v_all_received  boolean;
  v_any_received  boolean := false;
BEGIN
  -- Auth
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock PO
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF v_po.id IS NULL THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot receive a % purchase order', v_po.status;
  END IF;

  -- Process each received item
  FOR v_recv_item IN
    SELECT * FROM jsonb_to_recordset(p_received_items) AS x(po_item_id uuid, qty_received integer)
  LOOP
    IF v_recv_item.qty_received <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_poi FROM public.purchase_order_items WHERE id = v_recv_item.po_item_id AND po_id = p_po_id FOR UPDATE;
    IF v_poi.id IS NULL THEN RAISE EXCEPTION 'PO item not found: %', v_recv_item.po_item_id; END IF;

    -- Guard: can't receive more than ordered (minus already received)
    IF v_recv_item.qty_received > (v_poi.qty_ordered - v_poi.qty_received) THEN
      RAISE EXCEPTION 'Receiving % units exceeds remaining qty for item %', v_recv_item.qty_received, v_poi.item_id;
    END IF;

    -- Increment stock at destination store
    PERFORM public.adjust_stock(
      v_po.store_id,
      v_poi.item_id,
      v_recv_item.qty_received,
      'received',
      COALESCE(p_notes, 'PO Receipt: ' || v_po.po_number),
      v_user_id
    );

    -- Update po_item received qty
    UPDATE public.purchase_order_items
      SET qty_received = qty_received + v_recv_item.qty_received
      WHERE id = v_poi.id;

    v_any_received := true;
  END LOOP;

  IF NOT v_any_received THEN
    RAISE EXCEPTION 'No items were received';
  END IF;

  -- Recompute PO status
  SELECT bool_and(qty_received >= qty_ordered)
  INTO v_all_received
  FROM public.purchase_order_items
  WHERE po_id = p_po_id;

  UPDATE public.purchase_orders
    SET status = CASE WHEN v_all_received THEN 'received'::public.po_status ELSE 'partially_received'::public.po_status END,
        updated_by = v_user_id
    WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id,
    'new_status', CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END
  );
END;
$$;


ALTER FUNCTION public.receive_purchase_order(p_po_id uuid, p_received_items jsonb, p_notes text) OWNER TO postgres;

--
-- Name: reclaim_stale_ledger_locks(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reclaim_stale_ledger_locks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_reclaimed integer := 0;
BEGIN
  UPDATE public.ledger_posting_queue q
  SET status = 'PENDING',
      attempt_count = q.attempt_count + 1,
      next_retry_at = now() + make_interval(secs => LEAST(5 * (2 ^ LEAST(q.attempt_count, 6)), 300)),
      locked_by = NULL,
      locked_at = NULL,
      lock_expires_at = NULL,
      last_error = COALESCE(q.last_error, 'stale_lease_reclaimed'),
      updated_at = now()
  WHERE q.status = 'CLAIMED'
    AND q.lock_expires_at IS NOT NULL
    AND q.lock_expires_at < now()
    AND q.attempt_count < q.max_attempts
    AND (
      q.locked_by IS NULL
      OR public.is_ledger_worker_alive(q.locked_by, interval '60 seconds') IS NOT TRUE
    );

  GET DIAGNOSTICS v_reclaimed = ROW_COUNT;
  RETURN v_reclaimed;
END;
$$;


ALTER FUNCTION public.reclaim_stale_ledger_locks() OWNER TO postgres;

--
-- Name: record_cash_closing(text, uuid, uuid, uuid, numeric, date, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_cash_closing(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_account_id uuid, p_actual_cash numeric, p_date date DEFAULT CURRENT_DATE, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_response JSONB;
    v_expected_cash NUMERIC(15, 4);
    v_variance NUMERIC(15, 4);
    v_user_id UUID := auth.uid();
BEGIN
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    v_expected_cash := public.get_expected_cash(p_tenant_id, p_store_id, p_account_id, p_date);
    v_variance := p_actual_cash - v_expected_cash;

    v_response := jsonb_build_object(
        'status', 'success',
        'date', p_date,
        'expected_cash', v_expected_cash,
        'actual_cash', p_actual_cash,
        'variance', v_variance
    );

    UPDATE idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
END;
$$;


ALTER FUNCTION public.record_cash_closing(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_account_id uuid, p_actual_cash numeric, p_date date, p_notes text) OWNER TO postgres;

--
-- Name: record_customer_payment(text, uuid, uuid, uuid, numeric, uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_customer_payment(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_amount numeric, p_payment_account_id uuid, p_client_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_ar_account_id UUID;
    v_user_id UUID := auth.uid();
    v_new_balance NUMERIC;
BEGIN
    -- 1. Idempotency Check
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    -- 2. Accounts
    v_ar_account_id := public.get_or_create_ar_account(p_tenant_id);

    -- 3. Create Journal Batch
    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    -- 4. Ledger Entries (Double Entry)
    -- Debit the Payment Account (Asset/Bank/Cash)
    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by, notes)
    VALUES (p_tenant_id, p_store_id, v_batch_id, p_payment_account_id, p_amount, 'CUSTOMER_PAYMENT', v_batch_id, v_user_id, p_notes);

    -- Credit the Accounts Receivable Account for the Customer (Party)
    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, credit_amount, reference_type, reference_id, created_by, notes)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_ar_account_id, p_party_id, p_amount, 'CUSTOMER_PAYMENT', v_batch_id, v_user_id, p_notes);

    -- 5. Calculate new balance
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0) INTO v_new_balance
    FROM ledger_entries
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND account_id = v_ar_account_id AND party_id = p_party_id;

    -- 6. Update Idempotency
    v_response := jsonb_build_object(
        'status', 'success',
        'journal_batch_id', v_batch_id,
        'new_customer_balance', v_new_balance
    );
    UPDATE idempotency_keys 
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$;


ALTER FUNCTION public.record_customer_payment(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_amount numeric, p_payment_account_id uuid, p_client_transaction_id text, p_notes text) OWNER TO postgres;

--
-- Name: record_expense(uuid, date, text, text, numeric, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_expense(p_store_id uuid, p_date date, p_vendor text, p_description text, p_amount numeric, p_payment_type text, p_category text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense_id uuid;
  v_batch_id uuid;
  v_user_id uuid;
  v_debit_account uuid;
  v_credit_account uuid;
  v_account_code text;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  PERFORM public.ensure_expense_ledger_accounts(p_store_id);

  -- Determine Debit Account based on Category
  CASE p_category
    WHEN 'Capital Expenditure' THEN v_account_code := '6000_CAPEX';
    WHEN 'Utility Expenses' THEN v_account_code := '5200_UTILITIES';
    WHEN 'Transport & Conveyance' THEN v_account_code := '5300_TRANSPORT';
    WHEN 'Staff salary' THEN v_account_code := '5400_SALARY';
    WHEN 'Partners Take' THEN v_account_code := '3100_PARTNERS_TAKE';
    ELSE v_account_code := '5500_MISC';
  END CASE;

  SELECT id INTO v_debit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = v_account_code;

  -- Determine Credit Account (Payment Source)
  IF p_payment_type = 'Cash' THEN
    SELECT id INTO v_credit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1000_CASH';
  ELSE
    SELECT id INTO v_credit_account FROM public.ledger_accounts WHERE store_id = p_store_id AND code = '1010_BANK';
  END IF;

  -- Insert Expense Record
  INSERT INTO public.expenses (store_id, expense_date, vendor_name, description, amount, payment_type, category, created_by)
  VALUES (p_store_id, p_date, p_vendor, p_description, p_amount, p_payment_type, p_category, v_user_id)
  RETURNING id INTO v_expense_id;

  -- Create Ledger Batch (Atomic Transaction)
  INSERT INTO public.ledger_batches (store_id, source_type, source_id, source_ref, status, created_by)
  VALUES (p_store_id, 'expense', v_expense_id, 'Expense to ' || p_vendor, 'POSTED', v_user_id)
  RETURNING id INTO v_batch_id;

  -- Post Debit
  INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
  VALUES (v_batch_id, v_debit_account, 'Expense Debit', ROUND(p_amount, 2), 0);

  -- Post Credit
  INSERT INTO public.ledger_entries(batch_id, account_id, line_ref, debit, credit)
  VALUES (v_batch_id, v_credit_account, 'Payment Credit', 0, ROUND(p_amount, 2));

  -- Link Batch to Expense
  UPDATE public.expenses SET ledger_batch_id = v_batch_id WHERE id = v_expense_id;

  RETURN jsonb_build_object('status', 'SUCCESS', 'expense_id', v_expense_id, 'batch_id', v_batch_id);
END;
$$;


ALTER FUNCTION public.record_expense(p_store_id uuid, p_date date, p_vendor text, p_description text, p_amount numeric, p_payment_type text, p_category text) OWNER TO postgres;

--
-- Name: record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_purchase(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_account_id uuid, p_items jsonb, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_item RECORD;
    v_total_cost NUMERIC(15, 4) := 0;
    v_current_qty NUMERIC(15, 4);
    v_current_avg_cost NUMERIC(15, 4);
    v_new_avg_cost NUMERIC(15, 4);
    v_inventory_account_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    SELECT id INTO v_inventory_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset' LIMIT 1;
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'Inventory account not configured';
    END IF;

    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
    LOOP
        SELECT COALESCE(SUM(quantity_change), 0) INTO v_current_qty
        FROM stock_movements
        WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id;

        SELECT weighted_average_cost INTO v_current_avg_cost
        FROM stock_movements
        WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
        ORDER BY created_at DESC LIMIT 1;

        v_current_avg_cost := COALESCE(v_current_avg_cost, 0);

        IF (v_current_qty + v_item.quantity) > 0 THEN
            v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_item.quantity * v_item.unit_cost) / (v_current_qty + v_item.quantity);
        ELSE
            v_new_avg_cost := v_item.unit_cost;
        END IF;

        v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);

        INSERT INTO stock_movements (tenant_id, store_id, item_id, quantity_change, weighted_average_cost, reference_type, reference_id, created_by)
        VALUES (p_tenant_id, p_store_id, v_item.item_id, v_item.quantity, v_new_avg_cost, 'PURCHASE', v_batch_id, v_user_id);
    END LOOP;

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id, v_total_cost, 'PURCHASE', v_batch_id, v_user_id);

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, credit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, p_account_id, p_party_id, v_total_cost, 'PURCHASE', v_batch_id, v_user_id);

    v_response := jsonb_build_object('status', 'success', 'batch_id', v_batch_id, 'total_cost', v_total_cost);
    UPDATE idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$;


ALTER FUNCTION public.record_purchase(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_party_id uuid, p_account_id uuid, p_items jsonb, p_notes text) OWNER TO postgres;

--
-- Name: record_purchase_v2(text, uuid, uuid, uuid, text, numeric, jsonb, numeric, uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_purchase_v2(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_supplier_id uuid, p_invoice_number text DEFAULT NULL::text, p_invoice_total numeric DEFAULT NULL::numeric, p_items jsonb DEFAULT '[]'::jsonb, p_amount_paid numeric DEFAULT 0, p_payment_account_id uuid DEFAULT NULL::uuid, p_payable_account_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'posted'::text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_response            JSONB;
  v_receipt_id          UUID;
  v_item                RECORD;
  v_total_cost          NUMERIC(15, 4) := 0;
  v_user_id             UUID;
  v_current_quantity    INTEGER;
  v_new_quantity        INTEGER;
BEGIN

  v_user_id := auth.uid();
  v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
  IF v_response IS NOT NULL THEN RETURN v_response; END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    v_total_cost := v_total_cost + (v_item.quantity * v_item.unit_cost);
  END LOOP;

  INSERT INTO public.purchase_receipts (
    tenant_id, store_id, supplier_id, invoice_number, invoice_total, amount_paid, status, notes, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_supplier_id, p_invoice_number, v_total_cost, p_amount_paid, p_status, p_notes, v_user_id
  ) RETURNING id INTO v_receipt_id;

  IF p_status = 'draft' THEN
    v_response := jsonb_build_object('status', 'success', 'receipt_id', v_receipt_id, 'state', 'draft');
    UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
    RETURN v_response;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_cost NUMERIC)
  LOOP
    SELECT qty_on_hand INTO v_current_quantity FROM public.stock_levels WHERE store_id = p_store_id AND item_id = v_item.item_id FOR UPDATE;
    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version) VALUES (p_store_id, v_item.item_id, 0, 0) RETURNING qty_on_hand INTO v_current_quantity;
    END IF;
    v_new_quantity := v_current_quantity + v_item.quantity::INTEGER;

    UPDATE public.stock_levels SET qty_on_hand = v_new_quantity, updated_at = now(), version = version + 1 WHERE store_id = p_store_id AND item_id = v_item.item_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, item_id,
        movement_type, quantity_delta, reference_type, reference_id,
        previous_quantity, new_quantity, notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, v_item.item_id,
        'purchase', v_item.quantity::INTEGER, 'purchase', v_receipt_id,
        v_current_quantity, v_new_quantity, 'Purchase Receipt ' || COALESCE(p_invoice_number, ''), v_user_id,
        md5(p_idempotency_key || '_' || v_item.item_id::text)::uuid
    );
  END LOOP;

  v_response := jsonb_build_object('status', 'success', 'receipt_id', v_receipt_id, 'state', 'posted');
  UPDATE public.idempotency_keys SET completed_at = NOW(), response_body = v_response WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;
  RETURN v_response;
END;
$$;


ALTER FUNCTION public.record_purchase_v2(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_supplier_id uuid, p_invoice_number text, p_invoice_total numeric, p_items jsonb, p_amount_paid numeric, p_payment_account_id uuid, p_payable_account_id uuid, p_status text, p_notes text) OWNER TO postgres;

--
-- Name: record_sale(text, uuid, uuid, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_sale(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_items jsonb, p_payments jsonb, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_response JSONB;
    v_batch_id UUID;
    v_item RECORD;
    v_payment RECORD;
    v_total_revenue NUMERIC(15, 4) := 0;
    v_total_payment NUMERIC(15, 4) := 0;
    v_total_cogs NUMERIC(15, 4) := 0;
    v_current_avg_cost NUMERIC(15, 4);
    v_revenue_account_id UUID;
    v_inventory_account_id UUID;
    v_cogs_account_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    v_response := public.check_idempotency(p_idempotency_key, p_tenant_id);
    IF v_response IS NOT NULL THEN
        RETURN v_response;
    END IF;

    SELECT id INTO v_revenue_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Sales Revenue' LIMIT 1;
    SELECT id INTO v_inventory_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Inventory Asset' LIMIT 1;
    SELECT id INTO v_cogs_account_id FROM accounts WHERE tenant_id = p_tenant_id AND name = 'Cost of Goods Sold' LIMIT 1;

    IF v_revenue_account_id IS NULL OR v_inventory_account_id IS NULL OR v_cogs_account_id IS NULL THEN
        RAISE EXCEPTION 'System accounts not configured for tenant %', p_tenant_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_price NUMERIC)
    LOOP
        v_total_revenue := v_total_revenue + (v_item.quantity * v_item.unit_price);
    END LOOP;

    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(amount NUMERIC)
    LOOP
        v_total_payment := v_total_payment + v_payment.amount;
    END LOOP;

    IF ABS(v_total_revenue - v_total_payment) > 0.01 THEN
        RAISE EXCEPTION 'Total revenue (%) does not match total payments (%)', v_total_revenue, v_total_payment;
    END IF;

    INSERT INTO journal_batches (tenant_id, store_id, created_by, status)
    VALUES (p_tenant_id, p_store_id, v_user_id, 'posted')
    RETURNING id INTO v_batch_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC, unit_price NUMERIC)
    LOOP
        SELECT weighted_average_cost INTO v_current_avg_cost
        FROM stock_movements
        WHERE item_id = v_item.item_id AND tenant_id = p_tenant_id
        ORDER BY created_at DESC LIMIT 1;

        v_current_avg_cost := COALESCE(v_current_avg_cost, 0);
        v_total_cogs := v_total_cogs + (v_item.quantity * v_current_avg_cost);

        INSERT INTO stock_movements (tenant_id, store_id, item_id, quantity_change, weighted_average_cost, reference_type, reference_id, created_by)
        VALUES (p_tenant_id, p_store_id, v_item.item_id, -v_item.quantity, v_current_avg_cost, 'SALE', v_batch_id, v_user_id);
    END LOOP;

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, credit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_revenue_account_id, v_total_revenue, 'SALE', v_batch_id, v_user_id);

    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS x(account_id UUID, amount NUMERIC, party_id UUID)
    LOOP
        INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, party_id, debit_amount, reference_type, reference_id, created_by)
        VALUES (p_tenant_id, p_store_id, v_batch_id, v_payment.account_id, v_payment.party_id, v_payment.amount, 'SALE', v_batch_id, v_user_id);
    END LOOP;

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, debit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_cogs_account_id, v_total_cogs, 'SALE', v_batch_id, v_user_id);

    INSERT INTO ledger_entries (tenant_id, store_id, journal_batch_id, account_id, credit_amount, reference_type, reference_id, created_by)
    VALUES (p_tenant_id, p_store_id, v_batch_id, v_inventory_account_id, v_total_cogs, 'SALE', v_batch_id, v_user_id);

    v_response := jsonb_build_object('status', 'success', 'batch_id', v_batch_id, 'total_revenue', v_total_revenue);
    UPDATE idempotency_keys
    SET completed_at = NOW(), response_body = v_response
    WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id;

    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    DELETE FROM idempotency_keys WHERE idempotency_key = p_idempotency_key AND tenant_id = p_tenant_id AND completed_at IS NULL;
    RAISE;
END;
$$;


ALTER FUNCTION public.record_sale(p_idempotency_key text, p_tenant_id uuid, p_store_id uuid, p_items jsonb, p_payments jsonb, p_notes text) OWNER TO postgres;

--
-- Name: ledger_workers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_workers (
    worker_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_heartbeat timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ledger_workers OWNER TO postgres;

--
-- Name: register_ledger_worker(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.register_ledger_worker(p_worker_id text) RETURNS public.ledger_workers
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_worker public.ledger_workers;
BEGIN
  INSERT INTO public.ledger_workers (worker_id, active, last_heartbeat, updated_at)
  VALUES (p_worker_id, true, now(), now())
  ON CONFLICT (worker_id)
  DO UPDATE SET
    active = true,
    last_heartbeat = now(),
    updated_at = now()
  RETURNING * INTO v_worker;

  RETURN v_worker;
END;
$$;


ALTER FUNCTION public.register_ledger_worker(p_worker_id text) OWNER TO postgres;

--
-- Name: renew_ledger_job_lease(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.renew_ledger_job_lease(p_worker_id text, p_queue_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF public.is_ledger_worker_alive(p_worker_id, interval '60 seconds') IS NOT TRUE THEN
    RETURN false;
  END IF;

  UPDATE public.ledger_posting_queue
  SET lock_expires_at = now() + interval '2 minutes',
      updated_at = now()
  WHERE id = p_queue_id
    AND status = 'CLAIMED'
    AND locked_by = p_worker_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;


ALTER FUNCTION public.renew_ledger_job_lease(p_worker_id text, p_queue_id uuid) OWNER TO postgres;

--
-- Name: replay_sale_ledger_chain(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.replay_sale_ledger_chain(p_sale_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_sale jsonb;
  v_items jsonb;
  v_payments jsonb;
  v_audit jsonb;
  v_batch jsonb;
  v_entries jsonb;
BEGIN
  SELECT to_jsonb(s.*) INTO v_sale
  FROM public.sales s
  WHERE s.id = p_sale_id;

  IF v_sale IS NULL THEN
    RETURN jsonb_build_object('status', 'NOT_FOUND', 'message', 'Sale not found');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(si.*) ORDER BY si.id), '[]'::jsonb) INTO v_items
  FROM public.sale_items si
  WHERE si.sale_id = p_sale_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sp.*) ORDER BY sp.id), '[]'::jsonb) INTO v_payments
  FROM public.sale_payments sp
  WHERE sp.sale_id = p_sale_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sa.*) ORDER BY sa.created_at), '[]'::jsonb) INTO v_audit
  FROM public.sale_audit_log sa
  WHERE sa.sale_id = p_sale_id;

  SELECT to_jsonb(lb.*) INTO v_batch
  FROM public.ledger_batches lb
  WHERE lb.source_type = 'sale'
    AND lb.source_id = p_sale_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(le.*) ORDER BY le.id), '[]'::jsonb) INTO v_entries
  FROM public.ledger_entries le
  WHERE le.sale_id = p_sale_id;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'sale', v_sale,
    'sale_items', v_items,
    'sale_payments', v_payments,
    'sale_audit_log', v_audit,
    'ledger_batch', v_batch,
    'ledger_entries', v_entries
  );
END;
$$;


ALTER FUNCTION public.replay_sale_ledger_chain(p_sale_id uuid) OWNER TO postgres;

--
-- Name: resolve_payment_ledger_account(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.resolve_payment_ledger_account(p_store_id uuid, p_payment_method_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_type public.payment_type;
  v_account uuid;
BEGIN
  SELECT pm.type INTO v_type
  FROM public.payment_methods pm
  WHERE pm.id = p_payment_method_id
    AND pm.store_id = p_store_id
  LIMIT 1;

  IF v_type = 'cash' THEN
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1000_CASH';
  ELSE
    SELECT id INTO v_account
    FROM public.ledger_accounts
    WHERE store_id = p_store_id
      AND code = '1010_BANK';
  END IF;

  RETURN v_account;
END;
$$;


ALTER FUNCTION public.resolve_payment_ledger_account(p_store_id uuid, p_payment_method_id uuid) OWNER TO postgres;

--
-- Name: search_items_pos(uuid, text, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_items_pos(p_store_id uuid, p_query text DEFAULT ''::text, p_category_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT jsonb_agg(row_to_json(r))
  FROM (
    SELECT
      i.id,
      i.sku,
      i.barcode,
      i.short_code,
      i.name,
      i.brand,
      COALESCE(i.mrp, i.price) AS mrp,
      i.price,
      i.cost,
      i.group_tag,
      i.image_url,
      c.name AS category,
      c.id AS category_id,
      COALESCE(sl.qty_on_hand, 0) AS qty_on_hand
    FROM public.items i
    LEFT JOIN public.stock_levels sl
           ON sl.item_id = i.id AND sl.store_id = p_store_id
    LEFT JOIN public.categories c
           ON c.id = i.category_id
    WHERE i.is_active = true
      AND (
        p_query = '' OR
        i.name        ILIKE '%' || p_query || '%' OR
        i.brand       ILIKE '%' || p_query || '%' OR
        i.sku         ILIKE '%' || p_query || '%' OR
        i.short_code  ILIKE '%' || p_query || '%' OR
        i.barcode     ILIKE '%' || p_query || '%'
      )
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
    ORDER BY i.name ASC
    LIMIT p_limit OFFSET p_offset
  ) r;
$$;


ALTER FUNCTION public.search_items_pos(p_store_id uuid, p_query text, p_category_id uuid, p_limit integer, p_offset integer) OWNER TO postgres;

--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_current_timestamp_updated_at() OWNER TO postgres;

--
-- Name: set_inventory_stock(uuid, uuid, uuid, integer, public.movement_type, public.reference_type, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_item_id uuid, p_new_quantity integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_operation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_current_quantity INTEGER;
    v_quantity_delta INTEGER;
    v_movement_id UUID;
    v_user_id UUID;
    v_existing_movement JSONB;
BEGIN

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    IF p_operation_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'success', true,
            'movement_id', id,
            'previous_quantity', previous_quantity,
            'new_quantity', new_quantity,
            'idempotent_replay', true
        ) INTO v_existing_movement
        FROM public.inventory_movements
        WHERE operation_id = p_operation_id
        LIMIT 1;
        IF FOUND THEN RETURN v_existing_movement; END IF;
    END IF;

    SELECT qty_on_hand INTO v_current_quantity
    FROM public.stock_levels
    WHERE store_id = p_store_id AND item_id = p_item_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        INSERT INTO public.stock_levels (store_id, item_id, qty_on_hand, version)
        VALUES (p_store_id, p_item_id, 0, 0)
        RETURNING qty_on_hand INTO v_current_quantity;
    END IF;

    v_quantity_delta := p_new_quantity - v_current_quantity;
    IF v_quantity_delta = 0 THEN
        RETURN jsonb_build_object('success', true, 'movement_id', NULL, 'previous_quantity', v_current_quantity, 'new_quantity', v_current_quantity);
    END IF;

    UPDATE public.stock_levels
    SET qty_on_hand = p_new_quantity, updated_at = now(), version = version + 1
    WHERE store_id = p_store_id AND item_id = p_item_id;

    INSERT INTO public.inventory_movements (
        tenant_id, store_id, item_id,
        movement_type, quantity_delta,
        reference_type, reference_id,
        previous_quantity, new_quantity,
        notes, created_by, operation_id
    ) VALUES (
        p_tenant_id, p_store_id, p_item_id,
        p_movement_type, v_quantity_delta,
        p_reference_type, p_reference_id,
        v_current_quantity, p_new_quantity,
        p_notes, v_user_id, p_operation_id
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object('success', true, 'movement_id', v_movement_id, 'previous_quantity', v_current_quantity, 'new_quantity', p_new_quantity);
END;
$$;


ALTER FUNCTION public.set_inventory_stock(p_tenant_id uuid, p_store_id uuid, p_item_id uuid, p_new_quantity integer, p_movement_type public.movement_type, p_reference_type public.reference_type, p_reference_id uuid, p_notes text, p_operation_id uuid) OWNER TO postgres;

--
-- Name: set_stock(uuid, uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_stock(p_store_id uuid, p_item_id uuid, p_new_qty integer, p_reason text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_current_qty integer;
  v_delta integer;
  v_user_id uuid;
BEGIN
  -- Auth
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  -- IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Get current qty
  SELECT COALESCE(qty_on_hand, 0) INTO v_current_qty
  FROM public.stock_levels
  WHERE store_id = p_store_id AND item_id = p_item_id;

  v_delta := p_new_qty - v_current_qty;

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('status', 'no_change', 'qty', v_current_qty);
  END IF;

  RETURN public.adjust_stock(
    p_store_id,
    p_item_id,
    v_delta,
    p_reason,
    p_notes,
    v_user_id
  );
END;
$$;


ALTER FUNCTION public.set_stock(p_store_id uuid, p_item_id uuid, p_new_qty integer, p_reason text, p_notes text) OWNER TO postgres;

--
-- Name: update_receipt_config_simple(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_receipt_config_simple(p_store_id uuid, p_store_name text, p_header_text text, p_footer_text text) RETURNS public.receipt_config
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.receipt_config (store_id, store_name, header_text, footer_text)
  VALUES (p_store_id, p_store_name, p_header_text, p_footer_text)
  ON CONFLICT (store_id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    header_text = EXCLUDED.header_text,
    footer_text = EXCLUDED.footer_text;

  RETURN (SELECT * FROM public.receipt_config WHERE store_id = p_store_id);
END;
$$;


ALTER FUNCTION public.update_receipt_config_simple(p_store_id uuid, p_store_name text, p_header_text text, p_footer_text text) OWNER TO postgres;

--
-- Name: update_reminder(uuid, text, text, date, text, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_reminder(p_reminder_id uuid, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_reminder_date date DEFAULT NULL::date, p_reminder_type text DEFAULT NULL::text, p_is_completed boolean DEFAULT NULL::boolean) RETURNS public.reminders
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
    updated_row reminders%ROWTYPE;
BEGIN
    UPDATE reminders r
    SET
        title = COALESCE(p_title, r.title),
        description = COALESCE(p_description, r.description),
        reminder_date = COALESCE(p_reminder_date, r.reminder_date),
        reminder_type = COALESCE(p_reminder_type, r.reminder_type),
        is_completed = COALESCE(p_is_completed, r.is_completed),
        updated_at = now()
    WHERE r.id = p_reminder_id
      AND EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.tenant_id = r.tenant_id)
    RETURNING * INTO updated_row;

    IF updated_row.id IS NULL THEN
        RAISE EXCEPTION 'Reminder not found or access denied';
    END IF;

    RETURN updated_row;
END;
$$;


ALTER FUNCTION public.update_reminder(p_reminder_id uuid, p_title text, p_description text, p_reminder_date date, p_reminder_type text, p_is_completed boolean) OWNER TO postgres;

--
-- Name: update_stock_transfer_status(uuid, public.stock_transfer_status, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stock_transfer_status(p_transfer_id uuid, p_new_status public.stock_transfer_status, p_notes text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_transfer public.stock_transfers%ROWTYPE;
  v_user_id uuid;
  v_item record;
  v_from_store_name text;
  v_to_store_name text;
BEGIN
  -- Get current user
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock row
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF v_transfer.id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  -- Validate state transition
  IF v_transfer.status = 'completed' OR v_transfer.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update a completed or cancelled transfer';
  END IF;

  IF v_transfer.status = 'pending' AND p_new_status = 'completed' THEN
    RAISE EXCEPTION 'Transfer must be in_transit before being completed';
  END IF;

  IF v_transfer.status = p_new_status THEN
    RETURN true; -- No-op
  END IF;

  -- Get store names for logs
  SELECT name INTO v_from_store_name FROM public.stores WHERE id = v_transfer.from_store_id;
  SELECT name INTO v_to_store_name FROM public.stores WHERE id = v_transfer.to_store_id;

  -- TRANSITION: pending -> in_transit
  IF v_transfer.status = 'pending' AND p_new_status = 'in_transit' THEN
    -- Decrement stock from source
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.from_store_id, 
        v_item.item_id, 
        -v_item.qty, 
        'transfer_out', 
        COALESCE(p_notes, 'Transfer to ' || v_to_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')'), 
        v_user_id
      );
    END LOOP;

  -- TRANSITION: in_transit -> completed
  ELSIF v_transfer.status = 'in_transit' AND p_new_status = 'completed' THEN
    -- Increment stock at destination
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.to_store_id, 
        v_item.item_id, 
        v_item.qty, 
        'transfer_in', 
        COALESCE(p_notes, 'Transfer from ' || v_from_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')'), 
        v_user_id
      );
    END LOOP;

  -- TRANSITION: in_transit -> cancelled
  ELSIF v_transfer.status = 'in_transit' AND p_new_status = 'cancelled' THEN
    -- Rollback stock to source
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM public.adjust_stock(
        v_transfer.from_store_id, 
        v_item.item_id, 
        v_item.qty, 
        'correction', 
        'Cancelled transfer recovery from ' || v_to_store_name || ' (Ref: ' || left(p_transfer_id::text, 8) || ')', 
        v_user_id
      );
    END LOOP;
  END IF;

  -- Save status update
  UPDATE public.stock_transfers 
  SET 
    status = p_new_status, 
    updated_by = v_user_id,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END
  WHERE id = p_transfer_id;

  RETURN true;
END;
$$;


ALTER FUNCTION public.update_stock_transfer_status(p_transfer_id uuid, p_new_status public.stock_transfer_status, p_notes text) OWNER TO postgres;

--
-- Name: update_user_last_login(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_last_login() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE auth_id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_last_login() OWNER TO postgres;

--
-- Name: upsert_stock_level(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_stock_level(p_store_id uuid, p_item_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO stock_levels (store_id, item_id, qty)
  VALUES (p_store_id, p_item_id, p_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET qty = stock_levels.qty + p_quantity;
END;
$$;


ALTER FUNCTION public.upsert_stock_level(p_store_id uuid, p_item_id uuid, p_quantity integer) OWNER TO postgres;

--
-- Name: validate_sale_intent(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_sale_intent(p_snapshot jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_store_id uuid;
  v_trace_id text;
  v_item record;
  v_live_item record;
BEGIN
  v_store_id := NULLIF(p_snapshot->>'store_id', '')::uuid;
  v_trace_id := p_snapshot->>'transaction_trace_id';

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object(
      'validation_status', 'INSUFFICIENT_STOCK',
      'message', 'Missing store_id in snapshot',
      'transaction_trace_id', v_trace_id
    );
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_snapshot->'items', '[]'::jsonb)) AS x(
      product_id uuid,
      quantity integer,
      unit_price_snapshot numeric,
      stock_snapshot integer
    )
  LOOP
    SELECT
      i.id,
      i.is_active AS active,
      i.name,
      i.price,
      COALESCE(sl.qty, 0) AS qty_on_hand
    INTO v_live_item
    FROM public.items i
    LEFT JOIN public.stock_levels sl
      ON sl.item_id = i.id AND sl.store_id = v_store_id
    WHERE i.id = v_item.product_id;

    IF v_live_item.id IS NULL OR v_live_item.active IS DISTINCT FROM true THEN
      RETURN jsonb_build_object(
        'validation_status', 'INSUFFICIENT_STOCK',
        'message', 'Item is missing or inactive',
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;

    IF v_live_item.qty_on_hand < COALESCE(v_item.quantity, 0) THEN
      RETURN jsonb_build_object(
        'validation_status', 'INSUFFICIENT_STOCK',
        'message', format('Insufficient stock for %s', v_live_item.name),
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;

    IF ROUND(COALESCE(v_live_item.price, 0), 2) >
       ROUND(COALESCE(v_item.unit_price_snapshot, 0), 2) THEN
      RETURN jsonb_build_object(
        'validation_status', 'REQUIRES_OVERRIDE',
        'message', format('Price increased for %s', v_live_item.name),
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;

    IF ROUND(COALESCE(v_live_item.price, 0), 2) <>
       ROUND(COALESCE(v_item.unit_price_snapshot, 0), 2) THEN
      RETURN jsonb_build_object(
        'validation_status', 'PRICE_CHANGED',
        'message', format('Price changed for %s', v_live_item.name),
        'transaction_trace_id', v_trace_id,
        'item_id', v_item.product_id
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'validation_status', 'VALID',
    'message', 'Sale intent is valid',
    'transaction_trace_id', v_trace_id
  );
END;
$$;


ALTER FUNCTION public.validate_sale_intent(p_snapshot jsonb) OWNER TO postgres;

--
-- Name: validate_trial_balance(uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_trial_balance(p_store_id uuid, p_period_start date, p_period_end date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_debits numeric(14,2) := 0;
  v_credits numeric(14,2) := 0;
BEGIN
  SELECT COALESCE(SUM(le.debit), 0), COALESCE(SUM(le.credit), 0)
  INTO v_debits, v_credits
  FROM public.ledger_entries le
  JOIN public.ledger_batches lb ON lb.id = le.batch_id
  WHERE lb.store_id = p_store_id
    AND lb.posted_at::date >= p_period_start
    AND lb.posted_at::date < p_period_end
    AND lb.status = 'POSTED';

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_debits', ROUND(v_debits, 2),
    'total_credits', ROUND(v_credits, 2),
    'is_balanced', ROUND(v_debits, 2) = ROUND(v_credits, 2)
  );
END;
$$;


ALTER FUNCTION public.validate_trial_balance(p_store_id uuid, p_period_start date, p_period_end date) OWNER TO postgres;

--
-- Name: void_sale(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.void_sale(p_sale_id uuid, p_reason text DEFAULT 'Voided by manager'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
  v_sale    public.sales%ROWTYPE;
  v_item    record;
BEGIN
  -- Auth: manager/admin only
  SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = (SELECT auth.uid()) AND role IN ('admin','manager');
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Only managers and admins can void sales';
  END IF;

  -- Lock sale row
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_sale.status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot void a sale with status: %', v_sale.status;
  END IF;

  -- Restore stock for each line item
  FOR v_item IN
    SELECT item_id, qty FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    PERFORM public.adjust_stock(
      v_sale.store_id,
      v_item.item_id,
      v_item.qty,          -- positive = restore
      'void',
      'Void: ' || v_sale.sale_number,
      v_user_id
    );
  END LOOP;

  -- Mark sale voided
  UPDATE public.sales
    SET status      = 'voided',
        voided_by   = v_user_id,
        voided_at   = now(),
        void_reason = p_reason
    WHERE id = p_sale_id;

  -- Adjust session totals
  IF v_sale.session_id IS NOT NULL THEN
    UPDATE public.pos_sessions
      SET total_sales = total_sales - v_sale.total_amount
      WHERE id = v_sale.session_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id',     p_sale_id,
    'sale_number', v_sale.sale_number,
    'status',      'voided'
  );
END;
$$;


ALTER FUNCTION public.void_sale(p_sale_id uuid, p_reason text) OWNER TO postgres;

--
-- Name: void_sale(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.void_sale(p_sale_id uuid, p_reason text DEFAULT 'Voided by manager'::text, p_idempotency_key text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id       uuid;
  v_sale          public.sales%ROWTYPE;
  v_item          record;
  v_existing_void jsonb;
BEGIN
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'sale_id', id,
      'status', status,
      'is_duplicate', true
    ) INTO v_existing_void
    FROM public.sales 
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_void IS NOT NULL THEN
      RETURN v_existing_void;
    END IF;
  END IF;

  -- 2. Auth: manager/admin only
  SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = (SELECT auth.uid()) AND role IN ('admin','manager');
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Only managers and admins can void sales';
  END IF;

  -- 3. Lock sale row
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_sale.status = 'voided' THEN
    RETURN jsonb_build_object('sale_id', p_sale_id, 'status', 'voided', 'is_duplicate', true);
  END IF;
  IF v_sale.status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot void a sale with status: %', v_sale.status;
  END IF;

  -- 4. Restore stock
  FOR v_item IN
    SELECT item_id, qty FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    PERFORM public.adjust_stock(
      v_sale.store_id,
      v_item.item_id,
      v_item.qty,
      'void',
      'Void: ' || v_sale.sale_number,
      v_user_id,
      'void-' || p_sale_id || '-' || v_item.item_id
    );
  END LOOP;

  -- 5. Mark sale voided
  UPDATE public.sales
    SET status      = 'voided',
        voided_by   = v_user_id,
        voided_at   = now(),
        void_reason = p_reason,
        idempotency_key = COALESCE(p_idempotency_key, 'void-' || p_sale_id)
    WHERE id = p_sale_id;

  -- 6. Adjust session totals
  IF v_sale.session_id IS NOT NULL THEN
    UPDATE public.pos_sessions
      SET total_sales = total_sales - v_sale.total_amount
      WHERE id = v_sale.session_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id',     p_sale_id,
    'sale_number', v_sale.sale_number,
    'status',      'voided',
    'is_duplicate', false
  );
END;
$$;


ALTER FUNCTION public.void_sale(p_sale_id uuid, p_reason text, p_idempotency_key text) OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION storage.allow_any_operation(expected_operations text[]) OWNER TO supabase_storage_admin;

--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION storage.allow_only_operation(expected_operation text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
  DECLARE
    request_id bigint;
    payload jsonb;
    url text := TG_ARGV[0]::text;
    method text := TG_ARGV[1]::text;
    headers jsonb DEFAULT '{}'::jsonb;
    params jsonb DEFAULT '{}'::jsonb;
    timeout_ms integer DEFAULT 1000;
  BEGIN
    IF url IS NULL OR url = 'null' THEN
      RAISE EXCEPTION 'url argument is missing';
    END IF;

    IF method IS NULL OR method = 'null' THEN
      RAISE EXCEPTION 'method argument is missing';
    END IF;

    IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
      headers = '{"Content-Type": "application/json"}'::jsonb;
    ELSE
      headers = TG_ARGV[2]::jsonb;
    END IF;

    IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
      params = '{}'::jsonb;
    ELSE
      params = TG_ARGV[3]::jsonb;
    END IF;

    IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
      timeout_ms = 1000;
    ELSE
      timeout_ms = TG_ARGV[4]::integer;
    END IF;

    CASE
      WHEN method = 'GET' THEN
        SELECT http_get INTO request_id FROM net.http_get(
          url,
          params,
          headers,
          timeout_ms
        );
      WHEN method = 'POST' THEN
        payload = jsonb_build_object(
          'old_record', OLD,
          'record', NEW,
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA
        );

        SELECT http_post INTO request_id FROM net.http_post(
          url,
          payload,
          params,
          headers,
          timeout_ms
        );
      ELSE
        RAISE EXCEPTION 'method argument % is invalid', method;
    END CASE;

    INSERT INTO supabase_functions.hooks
      (hook_table_id, hook_name, request_id)
    VALUES
      (TG_RELID, TG_NAME, request_id);

    RETURN NEW;
  END
$$;


ALTER FUNCTION supabase_functions.http_request() OWNER TO supabase_functions_admin;

--
-- Name: extensions; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


ALTER TABLE _realtime.extensions OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE _realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: tenants; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer DEFAULT 200 NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    max_events_per_second integer DEFAULT 100 NOT NULL,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer DEFAULT 100000 NOT NULL,
    max_channels_per_client integer DEFAULT 100 NOT NULL,
    max_joins_per_second integer DEFAULT 500 NOT NULL,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean DEFAULT false NOT NULL,
    migrations_ran integer DEFAULT 0,
    broadcast_adapter character varying(255) DEFAULT 'gen_rpc'::character varying,
    max_presence_events_per_second integer DEFAULT 1000,
    max_payload_size_in_kb integer DEFAULT 3000,
    max_client_presence_events_per_window integer,
    client_presence_window_ms integer,
    presence_enabled boolean DEFAULT false NOT NULL,
    CONSTRAINT jwt_secret_or_jwt_jwks_required CHECK (((jwt_secret IS NOT NULL) OR (jwt_jwks IS NOT NULL)))
);


ALTER TABLE _realtime.tenants OWNER TO supabase_admin;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: accounting_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounting_periods_check CHECK ((period_end > period_start)),
    CONSTRAINT accounting_periods_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text])))
);


ALTER TABLE public.accounting_periods OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounts_type_check CHECK ((type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text])))
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    batch_number text NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    expires_at date,
    manufactured_at date,
    notes text,
    po_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    name text NOT NULL,
    category text,
    description text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: close_review_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.close_review_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    session_id uuid NOT NULL,
    reviewer_user_id uuid NOT NULL,
    reviewer_role text NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    queue_pending_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    conflict_count integer DEFAULT 0 NOT NULL,
    last_sync_success_at timestamp with time zone,
    close_status text NOT NULL,
    acknowledgement_confirmed boolean DEFAULT false NOT NULL,
    notes text,
    admin_override boolean DEFAULT false NOT NULL,
    override_reason text,
    override_reason_category text,
    override_notes text,
    dual_approval_required boolean DEFAULT false NOT NULL,
    secondary_approver_user_id uuid,
    secondary_approver_role text,
    CONSTRAINT close_review_log_admin_override_requires_category_check CHECK (((admin_override = false) OR ((override_reason_category IS NOT NULL) AND (btrim(override_reason_category) <> ''::text)))),
    CONSTRAINT close_review_log_close_status_check CHECK ((close_status = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text]))),
    CONSTRAINT close_review_log_conflict_count_check CHECK ((conflict_count >= 0)),
    CONSTRAINT close_review_log_dual_approval_requires_secondary_check CHECK (((dual_approval_required = false) OR ((secondary_approver_user_id IS NOT NULL) AND (secondary_approver_role IS NOT NULL)))),
    CONSTRAINT close_review_log_failed_count_check CHECK ((failed_count >= 0)),
    CONSTRAINT close_review_log_override_reason_category_check CHECK (((override_reason_category IS NULL) OR (override_reason_category = ANY (ARRAY['internet outage'::text, 'queue corruption'::text, 'emergency close'::text, 'manager absence'::text, 'system incident'::text, 'other'::text])))),
    CONSTRAINT close_review_log_queue_pending_count_check CHECK ((queue_pending_count >= 0)),
    CONSTRAINT close_review_log_reviewer_role_check CHECK ((reviewer_role = ANY (ARRAY['manager'::text, 'admin'::text, 'owner'::text]))),
    CONSTRAINT close_review_log_secondary_approver_role_check CHECK (((secondary_approver_role IS NULL) OR (secondary_approver_role = ANY (ARRAY['admin'::text, 'owner'::text]))))
);


ALTER TABLE public.close_review_log OWNER TO postgres;

--
-- Name: competitor_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.competitor_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    item_id uuid NOT NULL,
    competitor_name text NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    source text,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.competitor_prices OWNER TO postgres;

--
-- Name: customer_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    party_id uuid NOT NULL,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['whatsapp'::text, 'call'::text, 'manual'::text])))
);


ALTER TABLE public.customer_reminders OWNER TO postgres;

--
-- Name: discounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    type public.discount_type DEFAULT 'percentage'::public.discount_type NOT NULL,
    value numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discounts_value_check CHECK ((value >= (0)::numeric))
);


ALTER TABLE public.discounts OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    category text NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    description text,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: followup_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.followup_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    party_id uuid NOT NULL,
    note_text text NOT NULL,
    promise_to_pay_date date,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT followup_notes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


ALTER TABLE public.followup_notes OWNER TO postgres;

--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.idempotency_keys (
    idempotency_key text NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    completed_at timestamp with time zone,
    response_body jsonb
);


ALTER TABLE public.idempotency_keys OWNER TO postgres;

--
-- Name: import_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    initiated_by uuid,
    row_count integer DEFAULT 0 NOT NULL,
    rows_succeeded integer DEFAULT 0 NOT NULL,
    rows_failed integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT import_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


ALTER TABLE public.import_runs OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    barcode text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    movement_type public.movement_type NOT NULL,
    quantity_delta integer NOT NULL,
    reference_type public.reference_type NOT NULL,
    reference_id uuid,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operation_id uuid,
    CONSTRAINT chk_inventory_movements_new_qty_non_negative CHECK ((new_quantity >= 0)),
    CONSTRAINT chk_inventory_movements_qty_math CHECK (((previous_quantity + quantity_delta) = new_quantity))
);


ALTER TABLE public.inventory_movements OWNER TO postgres;

--
-- Name: inventory_reconciliations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    expected_quantity integer NOT NULL,
    counted_quantity integer NOT NULL,
    difference integer NOT NULL,
    status public.reconciliation_status DEFAULT 'pending'::public.reconciliation_status NOT NULL,
    notes text,
    counted_by uuid NOT NULL,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone
);


ALTER TABLE public.inventory_reconciliations OWNER TO postgres;

--
-- Name: item_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    store_id uuid NOT NULL,
    batch_number text NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    manufactured_at date,
    expires_at date,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    po_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT item_batches_qty_check CHECK ((qty >= 0)),
    CONSTRAINT item_batches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'consumed'::text, 'recalled'::text])))
);


ALTER TABLE public.item_batches OWNER TO postgres;

--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category_id uuid,
    sku text,
    barcode text,
    name text NOT NULL,
    description text,
    brand text,
    image_url text,
    price numeric(15,2) DEFAULT 0 NOT NULL,
    cost numeric(15,2) DEFAULT 0,
    mrp numeric(15,2) DEFAULT 0,
    short_code text,
    group_tag text,
    active boolean DEFAULT true,
    is_active boolean DEFAULT true,
    has_variants boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: journal_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    created_by uuid,
    approved_by uuid,
    status text DEFAULT 'posted'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journal_batches_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'reversed'::text])))
);


ALTER TABLE public.journal_batches OWNER TO postgres;

--
-- Name: ledger_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    account_type text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_account_id uuid,
    CONSTRAINT ledger_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['ASSET'::text, 'LIABILITY'::text, 'EQUITY'::text, 'REVENUE'::text, 'EXPENSE'::text, 'CONTRA_REVENUE'::text])))
);


ALTER TABLE public.ledger_accounts OWNER TO postgres;

--
-- Name: ledger_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    source_ref text,
    status text DEFAULT 'POSTED'::text NOT NULL,
    override_used boolean DEFAULT false NOT NULL,
    risk_flag boolean DEFAULT false NOT NULL,
    risk_note text,
    posted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reverses_batch_id uuid,
    CONSTRAINT ledger_batches_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'POSTED'::text, 'VOIDED'::text])))
);


ALTER TABLE public.ledger_batches OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    account_id uuid NOT NULL,
    sale_id uuid,
    line_ref text,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    annotation jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_entries_check CHECK ((((debit = (0)::numeric) AND (credit > (0)::numeric)) OR ((credit = (0)::numeric) AND (debit > (0)::numeric)))),
    CONSTRAINT ledger_entries_credit_check CHECK ((credit >= (0)::numeric)),
    CONSTRAINT ledger_entries_debit_check CHECK ((debit >= (0)::numeric))
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: ledger_posting_idempotency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_posting_idempotency (
    sale_id uuid NOT NULL,
    posting_state text DEFAULT 'IN_PROGRESS'::text NOT NULL,
    ledger_batch_id uuid,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    first_started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT ledger_posting_idempotency_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT ledger_posting_idempotency_posting_state_check CHECK ((posting_state = ANY (ARRAY['IN_PROGRESS'::text, 'POSTED'::text, 'FAILED'::text])))
);


ALTER TABLE public.ledger_posting_idempotency OWNER TO postgres;

--
-- Name: parties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    name text NOT NULL,
    phone text,
    address text,
    type text DEFAULT 'customer'::text,
    balance numeric(12,2) DEFAULT 0,
    credit_limit numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.parties OWNER TO postgres;

--
-- Name: po_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_number_seq OWNER TO postgres;

--
-- Name: pos_override_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pos_override_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    issued_by uuid NOT NULL,
    token_hash text NOT NULL,
    reason text NOT NULL,
    affected_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    used_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pos_override_tokens OWNER TO postgres;

--
-- Name: pos_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pos_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_number text NOT NULL,
    store_id uuid NOT NULL,
    cashier_id uuid NOT NULL,
    status public.session_status DEFAULT 'open'::public.session_status NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    opening_cash numeric(12,2) DEFAULT 0 NOT NULL,
    closing_cash numeric(12,2),
    total_sales numeric(12,2) DEFAULT 0 NOT NULL,
    total_cash numeric(12,2) DEFAULT 0 NOT NULL,
    notes text
);


ALTER TABLE public.pos_sessions OWNER TO postgres;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty_ordered integer DEFAULT 0 NOT NULL,
    qty_received integer DEFAULT 0,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    total_price numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    supplier_id uuid,
    po_number text NOT NULL,
    status text DEFAULT 'draft'::text,
    total_amount numeric(12,2) DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_receipt_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_receipt_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit_cost numeric(15,4) DEFAULT 0 NOT NULL,
    CONSTRAINT purchase_receipt_items_quantity_check CHECK ((quantity > (0)::numeric))
);


ALTER TABLE public.purchase_receipt_items OWNER TO postgres;

--
-- Name: purchase_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    invoice_number text,
    invoice_total numeric(15,4) DEFAULT 0 NOT NULL,
    amount_paid numeric(15,4) DEFAULT 0 NOT NULL,
    status text DEFAULT 'posted'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text])))
);


ALTER TABLE public.purchase_receipts OWNER TO postgres;

--
-- Name: sale_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid,
    client_transaction_id text NOT NULL,
    store_id uuid NOT NULL,
    operator_user_id uuid,
    status text NOT NULL,
    before_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    after_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    override_used boolean DEFAULT false NOT NULL,
    override_user_id uuid,
    override_reason text,
    stock_delta jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sale_audit_log OWNER TO postgres;

--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    item_id uuid,
    qty integer DEFAULT 1 NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    cost numeric(12,2) DEFAULT 0,
    discount numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    unit_price numeric(12,2),
    line_total numeric(12,2)
);


ALTER TABLE public.sale_items OWNER TO postgres;

--
-- Name: sale_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sale_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sale_number_seq OWNER TO postgres;

--
-- Name: sale_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    method text NOT NULL,
    reference text,
    created_at timestamp with time zone DEFAULT now(),
    payment_method_id uuid
);


ALTER TABLE public.sale_payments OWNER TO postgres;

--
-- Name: sale_sync_conflicts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_sync_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    client_transaction_id text NOT NULL,
    conflict_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending_review'::text NOT NULL,
    requires_manager_review boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT sale_sync_conflicts_conflict_type_check CHECK ((conflict_type = ANY (ARRAY['insufficient_stock'::text, 'deleted_product'::text, 'changed_price'::text, 'duplicate_sale'::text]))),
    CONSTRAINT sale_sync_conflicts_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'resolved'::text, 'ignored'::text])))
);


ALTER TABLE public.sale_sync_conflicts OWNER TO postgres;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    receipt_number text NOT NULL,
    party_id uuid,
    cashier_id uuid,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_total numeric(12,2) DEFAULT 0,
    tax_total numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    status text DEFAULT 'completed'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sale_number text,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    amount_tendered numeric(12,2),
    change_due numeric(12,2),
    session_id uuid,
    voided_by uuid,
    voided_at timestamp with time zone,
    void_reason text,
    client_transaction_id text,
    ledger_batch_id uuid,
    fulfilled_subtotal numeric(12,2),
    backordered_subtotal numeric(12,2),
    accounting_posting_status text DEFAULT 'PENDING_POSTING'::text NOT NULL,
    accounting_posting_error text,
    accounting_posted_at timestamp with time zone,
    idempotency_key text,
    CONSTRAINT sales_accounting_posting_status_check CHECK ((accounting_posting_status = ANY (ARRAY['PENDING_POSTING'::text, 'POSTED'::text, 'FAILED_POSTING'::text])))
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: session_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_number_seq OWNER TO postgres;

--
-- Name: stock_alert_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_alert_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    item_id uuid NOT NULL,
    min_qty integer DEFAULT 0 NOT NULL,
    max_qty integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reorder_qty integer DEFAULT 20 NOT NULL
);


ALTER TABLE public.stock_alert_thresholds OWNER TO postgres;

--
-- Name: stock_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    previous_quantity integer DEFAULT 0 NOT NULL,
    new_quantity integer DEFAULT 0 NOT NULL,
    quantity_change integer NOT NULL,
    transaction_type text NOT NULL,
    reason text NOT NULL,
    movement_id uuid,
    performed_by uuid,
    reference_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_ledger_new_quantity_nonnegative CHECK ((new_quantity >= 0)),
    CONSTRAINT stock_ledger_quantity_change_nonzero CHECK ((quantity_change <> 0))
);


ALTER TABLE public.stock_ledger OWNER TO postgres;

--
-- Name: TABLE stock_ledger; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_ledger IS 'DEPRECATED: superseded by inventory_movements';


--
-- Name: COLUMN stock_ledger.movement_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stock_ledger.movement_id IS 'Unique movement identifier for deduplication and idempotency in offline scenarios.';


--
-- Name: stock_levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty_on_hand integer DEFAULT 0,
    reserved integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 5,
    version integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_levels OWNER TO postgres;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    item_id uuid,
    batch_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    meta jsonb,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    tenant_id uuid,
    quantity_change integer,
    weighted_average_cost numeric(15,4),
    reference_type text,
    reference_id uuid,
    created_by uuid,
    idempotency_key text
);


ALTER TABLE public.stock_movements OWNER TO postgres;

--
-- Name: stock_transfer_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_transfer_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_transfer_items OWNER TO postgres;

--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    from_store_id uuid,
    to_store_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    initiated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_transfers OWNER TO postgres;

--
-- Name: stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    code text,
    address text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stores OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    plan text DEFAULT 'free'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    store_id uuid,
    auth_id uuid,
    name text NOT NULL,
    full_name text,
    email text,
    role text DEFAULT 'staff'::text,
    pin text,
    pos_pin text,
    last_login_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pos_pin_hash text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.pos_pin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.pos_pin IS '4-digit PIN for POS cashier login (e.g., 1234)';


--
-- Name: COLUMN users.pos_pin_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.pos_pin_hash IS 'bcrypt hash of 4-digit POS PIN used by authenticate_staff_pin';


--
-- Name: user_stores; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_stores AS
 SELECT id AS user_id,
    auth_id,
    store_id,
    tenant_id
   FROM public.users;


ALTER VIEW public.user_stores OWNER TO postgres;

--
-- Name: v_stock_ledger_product_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_stock_ledger_product_summary AS
 SELECT sl.product_id,
    i.name AS product_name,
    i.sku,
    count(*) AS total_movements,
    sum(
        CASE
            WHEN (sl.transaction_type = 'sale_deduction'::text) THEN sl.quantity_change
            ELSE 0
        END) AS total_deducted,
    sum(
        CASE
            WHEN (sl.transaction_type = ANY (ARRAY['purchase_add'::text, 'adjustment'::text, 'return_in'::text])) THEN sl.quantity_change
            ELSE 0
        END) AS total_added,
    max(sl.quantity_change) AS largest_movement,
    min(sl.created_at) AS first_movement,
    max(sl.created_at) AS last_movement
   FROM (public.stock_ledger sl
     JOIN public.items i ON ((i.id = sl.product_id)))
  GROUP BY sl.product_id, i.name, i.sku;


ALTER VIEW public.v_stock_ledger_product_summary OWNER TO postgres;

--
-- Name: v_stock_ledger_recent; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_stock_ledger_recent AS
 SELECT sl.id,
    sl.store_id,
    sl.product_id,
    sl.previous_quantity,
    sl.new_quantity,
    sl.quantity_change,
    sl.transaction_type,
    sl.reason,
    sl.movement_id,
    sl.performed_by,
    sl.reference_id,
    sl.metadata,
    sl.created_at,
    i.name AS product_name,
    i.sku,
    i.barcode,
    s.name AS store_name,
    u.email AS performed_by_email
   FROM (((public.stock_ledger sl
     JOIN public.items i ON ((i.id = sl.product_id)))
     JOIN public.stores s ON ((s.id = sl.store_id)))
     LEFT JOIN public.users u ON ((u.id = sl.performed_by)))
  ORDER BY sl.created_at DESC;


ALTER VIEW public.v_stock_ledger_recent OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_05_16; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_05_16 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_05_16 OWNER TO supabase_admin;

--
-- Name: messages_2026_05_17; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_05_17 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_05_17 OWNER TO supabase_admin;

--
-- Name: messages_2026_05_18; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_05_18 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_05_18 OWNER TO supabase_admin;

--
-- Name: messages_2026_05_19; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_05_19 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_05_19 OWNER TO supabase_admin;

--
-- Name: messages_2026_05_20; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_05_20 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_05_20 OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: iceberg_namespaces; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.iceberg_namespaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_name text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    catalog_id uuid NOT NULL
);


ALTER TABLE storage.iceberg_namespaces OWNER TO supabase_storage_admin;

--
-- Name: iceberg_tables; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.iceberg_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    namespace_id uuid NOT NULL,
    bucket_name text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    location text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    remote_table_id text,
    shard_key text,
    shard_id text,
    catalog_id uuid NOT NULL
);


ALTER TABLE storage.iceberg_tables OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


ALTER TABLE supabase_functions.hooks OWNER TO supabase_functions_admin;

--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: supabase_functions_admin
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE supabase_functions.hooks_id_seq OWNER TO supabase_functions_admin;

--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE supabase_functions.migrations OWNER TO supabase_functions_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


ALTER TABLE supabase_migrations.seed_files OWNER TO postgres;

--
-- Name: messages_2026_05_16; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_05_16 FOR VALUES FROM ('2026-05-16 00:00:00') TO ('2026-05-17 00:00:00');


--
-- Name: messages_2026_05_17; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_05_17 FOR VALUES FROM ('2026-05-17 00:00:00') TO ('2026-05-18 00:00:00');


--
-- Name: messages_2026_05_18; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_05_18 FOR VALUES FROM ('2026-05-18 00:00:00') TO ('2026-05-19 00:00:00');


--
-- Name: messages_2026_05_19; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_05_19 FOR VALUES FROM ('2026-05-19 00:00:00') TO ('2026-05-20 00:00:00');


--
-- Name: messages_2026_05_20; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_05_20 FOR VALUES FROM ('2026-05-20 00:00:00') TO ('2026-05-21 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: accounting_periods accounting_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_pkey PRIMARY KEY (id);


--
-- Name: accounting_periods accounting_periods_store_id_period_start_period_end_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_store_id_period_start_period_end_key UNIQUE (store_id, period_start, period_end);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: close_review_log close_review_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_pkey PRIMARY KEY (id);


--
-- Name: close_review_log close_review_log_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_session_id_key UNIQUE (session_id);


--
-- Name: competitor_prices competitor_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_prices
    ADD CONSTRAINT competitor_prices_pkey PRIMARY KEY (id);


--
-- Name: customer_reminders customer_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: followup_notes followup_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (idempotency_key);


--
-- Name: import_runs import_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_operation_id_key UNIQUE (operation_id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory_reconciliations inventory_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: item_batches item_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: items items_tenant_id_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_sku_key UNIQUE (tenant_id, sku);


--
-- Name: journal_batches journal_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_pkey PRIMARY KEY (id);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (id);


--
-- Name: ledger_accounts ledger_accounts_store_id_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_store_id_code_key UNIQUE (store_id, code);


--
-- Name: ledger_batches ledger_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: ledger_posting_idempotency ledger_posting_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_idempotency
    ADD CONSTRAINT ledger_posting_idempotency_pkey PRIMARY KEY (sale_id);


--
-- Name: ledger_posting_queue ledger_posting_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_pkey PRIMARY KEY (id);


--
-- Name: ledger_workers ledger_workers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_workers
    ADD CONSTRAINT ledger_workers_pkey PRIMARY KEY (worker_id);


--
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: pos_override_tokens pos_override_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_pkey PRIMARY KEY (id);


--
-- Name: pos_override_tokens pos_override_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: pos_sessions pos_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_pkey PRIMARY KEY (id);


--
-- Name: pos_sessions pos_sessions_session_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_session_number_key UNIQUE (session_number);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_receipt_items purchase_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_receipt_items purchase_receipt_items_receipt_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_receipt_id_item_id_key UNIQUE (receipt_id, item_id);


--
-- Name: purchase_receipts purchase_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id);


--
-- Name: receipt_config receipt_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_config
    ADD CONSTRAINT receipt_config_pkey PRIMARY KEY (store_id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: sale_audit_log sale_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sale_payments sale_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_pkey PRIMARY KEY (id);


--
-- Name: sale_sync_conflicts sale_sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: sale_sync_conflicts sale_sync_conflicts_store_id_client_transaction_id_conflict_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_store_id_client_transaction_id_conflict_key UNIQUE (store_id, client_transaction_id, conflict_type);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: stock_alert_thresholds stock_alert_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_pkey PRIMARY KEY (id);


--
-- Name: stock_alert_thresholds stock_alert_thresholds_store_item_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_store_item_unique UNIQUE (store_id, item_id);


--
-- Name: stock_ledger stock_ledger_movement_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_movement_id_key UNIQUE (movement_id);


--
-- Name: stock_ledger stock_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_store_item_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_store_item_unique UNIQUE (store_id, item_id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users users_auth_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_05_16 messages_2026_05_16_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_05_16
    ADD CONSTRAINT messages_2026_05_16_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_05_17 messages_2026_05_17_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_05_17
    ADD CONSTRAINT messages_2026_05_17_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_05_18 messages_2026_05_18_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_05_18
    ADD CONSTRAINT messages_2026_05_18_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_05_19 messages_2026_05_19_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_05_19
    ADD CONSTRAINT messages_2026_05_19_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_05_20 messages_2026_05_20_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_05_20
    ADD CONSTRAINT messages_2026_05_20_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: iceberg_namespaces iceberg_namespaces_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id);


--
-- Name: iceberg_tables iceberg_tables_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: extensions_tenant_external_id_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id);


--
-- Name: extensions_tenant_external_id_type_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type);


--
-- Name: tenants_external_id_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_batches_store_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_batches_store_item ON public.batches USING btree (store_id, item_id);


--
-- Name: idx_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_name ON public.categories USING btree (name);


--
-- Name: idx_categories_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_tenant ON public.categories USING btree (tenant_id);


--
-- Name: idx_close_review_log_reviewer_reviewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_close_review_log_reviewer_reviewed_at ON public.close_review_log USING btree (reviewer_user_id, reviewed_at DESC);


--
-- Name: idx_close_review_log_status_reviewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_close_review_log_status_reviewed_at ON public.close_review_log USING btree (close_status, reviewed_at DESC);


--
-- Name: idx_close_review_log_store_reviewed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_close_review_log_store_reviewed_at ON public.close_review_log USING btree (store_id, reviewed_at DESC);


--
-- Name: idx_customer_reminders_party; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_reminders_party ON public.customer_reminders USING btree (party_id);


--
-- Name: idx_customer_reminders_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_reminders_sent_at ON public.customer_reminders USING btree (sent_at DESC);


--
-- Name: idx_customer_reminders_tenant_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_reminders_tenant_store ON public.customer_reminders USING btree (tenant_id, store_id);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_store ON public.expenses USING btree (store_id);


--
-- Name: idx_followup_notes_party; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followup_notes_party ON public.followup_notes USING btree (party_id);


--
-- Name: idx_followup_notes_promise_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followup_notes_promise_date ON public.followup_notes USING btree (promise_to_pay_date);


--
-- Name: idx_followup_notes_tenant_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followup_notes_tenant_store ON public.followup_notes USING btree (tenant_id, store_id);


--
-- Name: idx_import_runs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_runs_created_at ON public.import_runs USING btree (created_at DESC);


--
-- Name: idx_import_runs_initiated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_runs_initiated_by ON public.import_runs USING btree (initiated_by);


--
-- Name: idx_import_runs_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_runs_status_created_at ON public.import_runs USING btree (status, created_at DESC);


--
-- Name: idx_inv_movements_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_movements_created_at ON public.inventory_movements USING btree (created_at DESC);


--
-- Name: idx_inv_movements_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_movements_product ON public.inventory_movements USING btree (item_id);


--
-- Name: idx_inv_movements_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_movements_reference ON public.inventory_movements USING btree (reference_type, reference_id);


--
-- Name: idx_inv_movements_tenant_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_movements_tenant_store ON public.inventory_movements USING btree (tenant_id, store_id);


--
-- Name: idx_item_batches_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_item_batches_expires_at ON public.item_batches USING btree (expires_at) WHERE (status = 'active'::text);


--
-- Name: idx_item_batches_item_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_item_batches_item_store ON public.item_batches USING btree (item_id, store_id);


--
-- Name: idx_items_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_barcode ON public.items USING btree (barcode);


--
-- Name: idx_items_barcode_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_barcode_trgm ON public.items USING gin (barcode extensions.gin_trgm_ops) WHERE (barcode IS NOT NULL);


--
-- Name: idx_items_barcode_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_items_barcode_unique ON public.items USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_items_brand_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_brand_trgm ON public.items USING gin (brand extensions.gin_trgm_ops) WHERE (brand IS NOT NULL);


--
-- Name: idx_items_group_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_group_tag ON public.items USING btree (group_tag) WHERE (group_tag IS NOT NULL);


--
-- Name: idx_items_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_name_trgm ON public.items USING gin (name extensions.gin_trgm_ops);


--
-- Name: idx_items_short_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_short_code ON public.items USING btree (short_code) WHERE (short_code IS NOT NULL);


--
-- Name: idx_items_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_sku ON public.items USING btree (sku);


--
-- Name: idx_items_sku_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_sku_trgm ON public.items USING gin (sku extensions.gin_trgm_ops) WHERE (sku IS NOT NULL);


--
-- Name: idx_items_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_tenant ON public.items USING btree (tenant_id);


--
-- Name: idx_items_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_tenant_id ON public.items USING btree (tenant_id);


--
-- Name: idx_items_unique_barcode_non_empty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_items_unique_barcode_non_empty ON public.items USING btree (NULLIF(TRIM(BOTH FROM barcode), ''::text)) WHERE (NULLIF(TRIM(BOTH FROM barcode), ''::text) IS NOT NULL);


--
-- Name: idx_items_unique_sku_non_empty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_items_unique_sku_non_empty ON public.items USING btree (NULLIF(TRIM(BOTH FROM sku), ''::text)) WHERE (NULLIF(TRIM(BOTH FROM sku), ''::text) IS NOT NULL);


--
-- Name: idx_ledger_batches_store_posted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledger_batches_store_posted ON public.ledger_batches USING btree (store_id, posted_at DESC);


--
-- Name: idx_ledger_entries_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledger_entries_batch ON public.ledger_entries USING btree (batch_id);


--
-- Name: idx_ledger_sale_batch_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_ledger_sale_batch_unique ON public.ledger_batches USING btree (source_type, source_id) WHERE ((source_type = 'sale'::text) AND (source_id IS NOT NULL));


--
-- Name: idx_lpq_retry_schedule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lpq_retry_schedule ON public.ledger_posting_queue USING btree (status, next_retry_at, priority DESC, created_at);


--
-- Name: idx_parties_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_parties_tenant ON public.parties USING btree (tenant_id);


--
-- Name: idx_purchase_receipt_items_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_receipt_items_item ON public.purchase_receipt_items USING btree (item_id);


--
-- Name: idx_purchase_receipt_items_receipt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_receipt_items_receipt ON public.purchase_receipt_items USING btree (receipt_id);


--
-- Name: idx_purchase_receipts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_receipts_status ON public.purchase_receipts USING btree (status);


--
-- Name: idx_purchase_receipts_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_receipts_store ON public.purchase_receipts USING btree (store_id);


--
-- Name: idx_purchase_receipts_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_receipts_supplier ON public.purchase_receipts USING btree (supplier_id);


--
-- Name: idx_purchase_receipts_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_receipts_tenant ON public.purchase_receipts USING btree (tenant_id);


--
-- Name: idx_reconciliations_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliations_product ON public.inventory_reconciliations USING btree (item_id);


--
-- Name: idx_reconciliations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliations_status ON public.inventory_reconciliations USING btree (status);


--
-- Name: idx_reconciliations_tenant_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliations_tenant_store ON public.inventory_reconciliations USING btree (tenant_id, store_id);


--
-- Name: idx_reminders_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_completed ON public.reminders USING btree (is_completed);


--
-- Name: idx_reminders_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_date ON public.reminders USING btree (reminder_date);


--
-- Name: idx_reminders_tenant_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_tenant_store ON public.reminders USING btree (tenant_id, store_id);


--
-- Name: idx_reminders_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_type ON public.reminders USING btree (reminder_type);


--
-- Name: idx_sale_items_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_item ON public.sale_items USING btree (item_id);


--
-- Name: idx_sale_items_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_item_id ON public.sale_items USING btree (item_id);


--
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_sale ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sale_payments_sale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sale_payments_sale ON public.sale_payments USING btree (sale_id);


--
-- Name: idx_sales_cashier_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_cashier_created ON public.sales USING btree (cashier_id, created_at DESC);


--
-- Name: idx_sales_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_created ON public.sales USING btree (created_at);


--
-- Name: idx_sales_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_created_at ON public.sales USING btree (created_at);


--
-- Name: idx_sales_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_sales_idempotency ON public.sales USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_sales_ledger_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_ledger_batch ON public.sales USING btree (ledger_batch_id);


--
-- Name: idx_sales_receipt_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_receipt_number ON public.sales USING btree (receipt_number);


--
-- Name: idx_sales_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_session ON public.sales USING btree (session_id);


--
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_status ON public.sales USING btree (status);


--
-- Name: idx_sales_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_store ON public.sales USING btree (store_id);


--
-- Name: idx_sales_store_client_txn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_sales_store_client_txn ON public.sales USING btree (store_id, client_transaction_id) WHERE (client_transaction_id IS NOT NULL);


--
-- Name: idx_sales_store_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_store_created ON public.sales USING btree (store_id, created_at DESC);


--
-- Name: idx_sales_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_store_id ON public.sales USING btree (store_id);


--
-- Name: idx_sales_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_tenant ON public.sales USING btree (tenant_id);


--
-- Name: idx_stock_ledger_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_created_at ON public.stock_ledger USING btree (created_at DESC);


--
-- Name: idx_stock_ledger_metadata; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_metadata ON public.stock_ledger USING gin (metadata);


--
-- Name: idx_stock_ledger_movement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_movement_id ON public.stock_ledger USING btree (movement_id) WHERE (movement_id IS NOT NULL);


--
-- Name: idx_stock_ledger_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_product_id ON public.stock_ledger USING btree (product_id);


--
-- Name: idx_stock_ledger_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_store_id ON public.stock_ledger USING btree (store_id);


--
-- Name: idx_stock_ledger_store_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_store_product ON public.stock_ledger USING btree (store_id, product_id);


--
-- Name: idx_stock_ledger_store_product_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_store_product_date ON public.stock_ledger USING btree (store_id, product_id, created_at DESC);


--
-- Name: idx_stock_ledger_transaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_ledger_transaction_type ON public.stock_ledger USING btree (transaction_type);


--
-- Name: idx_stock_levels_store_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_levels_store_item ON public.stock_levels USING btree (store_id, item_id);


--
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at);


--
-- Name: idx_stock_movements_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_stock_movements_idempotency ON public.stock_movements USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_stock_movements_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_item ON public.stock_movements USING btree (item_id);


--
-- Name: idx_stock_movements_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_item_id ON public.stock_movements USING btree (item_id);


--
-- Name: idx_stock_movements_item_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_item_store ON public.stock_movements USING btree (item_id, store_id, created_at DESC);


--
-- Name: idx_stock_movements_reason; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_reason ON public.stock_movements USING btree (reason);


--
-- Name: idx_stock_movements_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_type, reference_id);


--
-- Name: idx_stock_movements_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_store ON public.stock_movements USING btree (store_id);


--
-- Name: idx_stock_movements_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_store_id ON public.stock_movements USING btree (store_id);


--
-- Name: idx_stock_movements_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_tenant_id ON public.stock_movements USING btree (tenant_id);


--
-- Name: idx_stores_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stores_code ON public.stores USING btree (code);


--
-- Name: idx_stores_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stores_tenant ON public.stores USING btree (tenant_id);


--
-- Name: idx_unique_supplier_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_supplier_invoice ON public.purchase_receipts USING btree (tenant_id, supplier_id, invoice_number) WHERE ((invoice_number IS NOT NULL) AND (invoice_number <> ''::text));


--
-- Name: idx_users_auth_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_auth_id ON public.users USING btree (auth_id);


--
-- Name: idx_users_last_login_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_last_login_at ON public.users USING btree (last_login_at DESC);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_05_16_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_05_16_inserted_at_topic_idx ON realtime.messages_2026_05_16 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_05_17_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_05_17_inserted_at_topic_idx ON realtime.messages_2026_05_17 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_05_18_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_05_18_inserted_at_topic_idx ON realtime.messages_2026_05_18 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_05_19_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_05_19_inserted_at_topic_idx ON realtime.messages_2026_05_19 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_05_20_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_05_20_inserted_at_topic_idx ON realtime.messages_2026_05_20 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_iceberg_namespaces_bucket_id; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (catalog_id, name);


--
-- Name: idx_iceberg_tables_location; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_iceberg_tables_location ON storage.iceberg_tables USING btree (location);


--
-- Name: idx_iceberg_tables_namespace_id; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (catalog_id, namespace_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: messages_2026_05_16_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_05_16_inserted_at_topic_idx;


--
-- Name: messages_2026_05_16_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_05_16_pkey;


--
-- Name: messages_2026_05_17_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_05_17_inserted_at_topic_idx;


--
-- Name: messages_2026_05_17_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_05_17_pkey;


--
-- Name: messages_2026_05_18_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_05_18_inserted_at_topic_idx;


--
-- Name: messages_2026_05_18_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_05_18_pkey;


--
-- Name: messages_2026_05_19_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_05_19_inserted_at_topic_idx;


--
-- Name: messages_2026_05_19_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_05_19_pkey;


--
-- Name: messages_2026_05_20_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_05_20_inserted_at_topic_idx;


--
-- Name: messages_2026_05_20_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_05_20_pkey;


--
-- Name: users trg_update_last_login; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER trg_update_last_login AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.update_user_last_login();


--
-- Name: purchase_orders auto_po_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER auto_po_number BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.generate_po_number();


--
-- Name: sales auto_sale_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER auto_sale_number BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.generate_sale_number();


--
-- Name: pos_sessions auto_session_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER auto_session_number BEFORE INSERT ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.generate_session_number();


--
-- Name: inventory_movements enforce_append_only; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER enforce_append_only BEFORE DELETE OR UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_movement_update();


--
-- Name: discounts set_discounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_discounts_updated_at BEFORE UPDATE ON public.discounts FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: item_batches set_item_batches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_item_batches_updated_at BEFORE UPDATE ON public.item_batches FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: purchase_orders set_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: purchase_receipts set_purchase_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_purchase_receipts_updated_at BEFORE UPDATE ON public.purchase_receipts FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: sales set_sales_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: stock_alert_thresholds set_stock_alert_thresholds_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_stock_alert_thresholds_updated_at BEFORE UPDATE ON public.stock_alert_thresholds FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: stock_transfers set_stock_transfers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: suppliers set_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: ledger_entries trg_deferred_ledger_balance; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_deferred_ledger_balance AFTER INSERT OR UPDATE ON public.ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_ledger_batch_balance();


--
-- Name: ledger_batches trg_prevent_ledger_batches_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_ledger_batches_mutation BEFORE DELETE OR UPDATE ON public.ledger_batches FOR EACH ROW WHEN ((old.status = 'POSTED'::text)) EXECUTE FUNCTION public.prevent_ledger_mutation();


--
-- Name: ledger_entries trg_prevent_ledger_entries_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_ledger_entries_mutation BEFORE DELETE OR UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();


--
-- Name: sale_audit_log trg_prevent_sale_audit_log_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_sale_audit_log_update BEFORE DELETE OR UPDATE ON public.sale_audit_log FOR EACH ROW EXECUTE FUNCTION public.prevent_sale_audit_log_mutation();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: extensions extensions_tenant_external_id_fkey; Type: FK CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_tenant_external_id_fkey FOREIGN KEY (tenant_external_id) REFERENCES _realtime.tenants(external_id) ON DELETE CASCADE;


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: accounting_periods accounting_periods_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);


--
-- Name: accounting_periods accounting_periods_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: accounts accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: batches batches_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: batches batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: batches batches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: categories categories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: categories categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: close_review_log close_review_log_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES public.users(id);


--
-- Name: close_review_log close_review_log_secondary_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_secondary_approver_user_id_fkey FOREIGN KEY (secondary_approver_user_id) REFERENCES public.users(id);


--
-- Name: close_review_log close_review_log_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.pos_sessions(id) ON DELETE CASCADE;


--
-- Name: close_review_log close_review_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.close_review_log
    ADD CONSTRAINT close_review_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: competitor_prices competitor_prices_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_prices
    ADD CONSTRAINT competitor_prices_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: competitor_prices competitor_prices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.competitor_prices
    ADD CONSTRAINT competitor_prices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: customer_reminders customer_reminders_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: customer_reminders customer_reminders_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: customer_reminders customer_reminders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: customer_reminders customer_reminders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_reminders
    ADD CONSTRAINT customer_reminders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: discounts discounts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: followup_notes followup_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: followup_notes followup_notes_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: followup_notes followup_notes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: followup_notes followup_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_notes
    ADD CONSTRAINT followup_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: idempotency_keys idempotency_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: import_runs import_runs_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: inventory_movements inventory_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_reconciliations inventory_reconciliations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: inventory_reconciliations inventory_reconciliations_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES auth.users(id);


--
-- Name: inventory_reconciliations inventory_reconciliations_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: inventory_reconciliations inventory_reconciliations_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: inventory_reconciliations inventory_reconciliations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_reconciliations
    ADD CONSTRAINT inventory_reconciliations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: item_batches item_batches_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_batches item_batches_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: item_batches item_batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_batches
    ADD CONSTRAINT item_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: items items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: items items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: journal_batches journal_batches_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: journal_batches journal_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_batches journal_batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: journal_batches journal_batches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_batches
    ADD CONSTRAINT journal_batches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: ledger_accounts ledger_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.ledger_accounts(id);


--
-- Name: ledger_accounts ledger_accounts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ledger_batches ledger_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ledger_batches ledger_batches_reverses_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_reverses_batch_id_fkey FOREIGN KEY (reverses_batch_id) REFERENCES public.ledger_batches(id);


--
-- Name: ledger_batches ledger_batches_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_batches
    ADD CONSTRAINT ledger_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ledger_batches(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: ledger_posting_idempotency ledger_posting_idempotency_ledger_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_idempotency
    ADD CONSTRAINT ledger_posting_idempotency_ledger_batch_id_fkey FOREIGN KEY (ledger_batch_id) REFERENCES public.ledger_batches(id) ON DELETE SET NULL;


--
-- Name: ledger_posting_idempotency ledger_posting_idempotency_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_idempotency
    ADD CONSTRAINT ledger_posting_idempotency_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: ledger_posting_queue ledger_posting_queue_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.ledger_workers(worker_id) ON DELETE SET NULL;


--
-- Name: ledger_posting_queue ledger_posting_queue_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: ledger_posting_queue ledger_posting_queue_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_posting_queue
    ADD CONSTRAINT ledger_posting_queue_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: parties parties_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: parties parties_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payment_methods payment_methods_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: pos_override_tokens pos_override_tokens_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: pos_override_tokens pos_override_tokens_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: pos_override_tokens pos_override_tokens_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_override_tokens
    ADD CONSTRAINT pos_override_tokens_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: pos_sessions pos_sessions_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- Name: pos_sessions pos_sessions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pos_sessions
    ADD CONSTRAINT pos_sessions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: purchase_order_items purchase_order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: purchase_receipt_items purchase_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipt_items
    ADD CONSTRAINT purchase_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.purchase_receipts(id) ON DELETE CASCADE;


--
-- Name: purchase_receipts purchase_receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_receipts purchase_receipts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;


--
-- Name: purchase_receipts purchase_receipts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.parties(id) ON DELETE RESTRICT;


--
-- Name: purchase_receipts purchase_receipts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: receipt_config receipt_config_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_config
    ADD CONSTRAINT receipt_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: reminders reminders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sale_audit_log sale_audit_log_operator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_operator_user_id_fkey FOREIGN KEY (operator_user_id) REFERENCES public.users(id);


--
-- Name: sale_audit_log sale_audit_log_override_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_override_user_id_fkey FOREIGN KEY (override_user_id) REFERENCES public.users(id);


--
-- Name: sale_audit_log sale_audit_log_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: sale_audit_log sale_audit_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_audit_log
    ADD CONSTRAINT sale_audit_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: sale_items sale_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- Name: sale_payments sale_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_sync_conflicts sale_sync_conflicts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: sale_sync_conflicts sale_sync_conflicts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_sync_conflicts
    ADD CONSTRAINT sale_sync_conflicts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: sales sales_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales sales_ledger_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_ledger_batch_id_fkey FOREIGN KEY (ledger_batch_id) REFERENCES public.ledger_batches(id);


--
-- Name: sales sales_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE SET NULL;


--
-- Name: sales sales_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.pos_sessions(id);


--
-- Name: sales sales_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: sales sales_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sales sales_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id);


--
-- Name: stock_alert_thresholds stock_alert_thresholds_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_alert_thresholds stock_alert_thresholds_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: stock_alert_thresholds stock_alert_thresholds_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alert_thresholds
    ADD CONSTRAINT stock_alert_thresholds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_ledger stock_ledger_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: stock_ledger stock_ledger_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_ledger stock_ledger_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: stock_transfer_items stock_transfer_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_from_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_from_store_id_fkey FOREIGN KEY (from_store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: stock_transfers stock_transfers_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_transfers stock_transfers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_to_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_to_store_id_fkey FOREIGN KEY (to_store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stores stores_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: users users_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: iceberg_namespaces iceberg_namespaces_catalog_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_namespaces
    ADD CONSTRAINT iceberg_namespaces_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_catalog_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES storage.buckets_analytics(id) ON DELETE CASCADE;


--
-- Name: iceberg_tables iceberg_tables_namespace_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.iceberg_tables
    ADD CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES storage.iceberg_namespaces(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_levels Admins managers can manage stock levels; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins managers can manage stock levels" ON public.stock_levels TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: users Users can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = auth_id));


--
-- Name: accounting_periods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_periods ap_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ap_select ON public.accounting_periods FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: batches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

--
-- Name: batches batches_no_client_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY batches_no_client_access ON public.batches TO authenticated USING (false) WITH CHECK (false);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_delete_authenticated ON public.categories FOR DELETE TO authenticated USING (true);


--
-- Name: categories categories_delete_tenant_scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_delete_tenant_scoped ON public.categories FOR DELETE TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id))))));


--
-- Name: categories categories_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_insert_authenticated ON public.categories FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: categories categories_insert_tenant_scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_insert_tenant_scoped ON public.categories FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id)))));


--
-- Name: categories categories_manage_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_manage_authorized ON public.categories TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: categories categories_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_select_tenant_isolated ON public.categories FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: categories categories_update_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_update_authenticated ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: categories categories_update_tenant_scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_update_tenant_scoped ON public.categories FOR UPDATE TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id)))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id))))));


--
-- Name: close_review_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.close_review_log ENABLE ROW LEVEL SECURITY;

--
-- Name: competitor_prices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_reminders cr_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cr_insert ON public.customer_reminders FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.tenant_id = customer_reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: customer_reminders cr_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cr_select ON public.customer_reminders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.tenant_id = customer_reminders.tenant_id)))));


--
-- Name: close_review_log crl_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY crl_insert ON public.close_review_log FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.id = close_review_log.reviewer_user_id) AND (actor.store_id = close_review_log.store_id) AND (actor.role = ANY (ARRAY['manager'::text, 'admin'::text, 'owner'::text]))))));


--
-- Name: close_review_log crl_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY crl_select ON public.close_review_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND ((actor.role = ANY (ARRAY['admin'::text, 'owner'::text])) OR ((actor.role = 'manager'::text) AND (actor.store_id = close_review_log.store_id)))))));


--
-- Name: close_review_log crl_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY crl_update ON public.close_review_log FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.role = ANY (ARRAY['admin'::text, 'owner'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


--
-- Name: customer_reminders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.customer_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: discounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

--
-- Name: discounts discounts_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY discounts_select_tenant_isolated ON public.discounts FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: discounts discounts_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY discounts_write_authorized ON public.discounts TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses expenses_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: expenses expenses_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: expenses expenses_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expenses_select_tenant_isolated ON public.expenses FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: followup_notes fn_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY fn_insert ON public.followup_notes FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.tenant_id = followup_notes.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: followup_notes fn_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY fn_select ON public.followup_notes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.tenant_id = followup_notes.tenant_id)))));


--
-- Name: followup_notes fn_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY fn_update ON public.followup_notes FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.tenant_id = followup_notes.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: followup_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.followup_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: idempotency_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: import_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: import_runs import_runs_admin_manager_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY import_runs_admin_manager_select ON public.import_runs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: inventory_movements insert_inventory_movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY insert_inventory_movements ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK ((store_id IN ( SELECT user_stores.store_id
   FROM public.user_stores
  WHERE (user_stores.user_id = auth.uid()))));


--
-- Name: inventory_reconciliations insert_reconciliations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY insert_reconciliations ON public.inventory_reconciliations FOR INSERT TO authenticated WITH CHECK ((store_id IN ( SELECT user_stores.store_id
   FROM public.user_stores
  WHERE (user_stores.user_id = auth.uid()))));


--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_reconciliations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory_reconciliations ENABLE ROW LEVEL SECURITY;

--
-- Name: item_batches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: item_batches item_batches_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY item_batches_select_tenant_isolated ON public.item_batches FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: item_batches item_batches_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY item_batches_write_authorized ON public.item_batches TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

--
-- Name: items items_manage_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY items_manage_authorized ON public.items TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: items items_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY items_select_tenant_isolated ON public.items FOR SELECT TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: journal_batches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journal_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_accounts la_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY la_select ON public.ledger_accounts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: ledger_batches lb_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lb_select ON public.ledger_batches FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: ledger_entries le_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY le_select ON public.ledger_entries FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.ledger_batches lb
     JOIN public.users u ON ((u.auth_id = auth.uid())))
  WHERE ((lb.id = ledger_entries.batch_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: ledger_accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_batches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_posting_idempotency; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ledger_posting_idempotency ENABLE ROW LEVEL SECURITY;

--
-- Name: parties; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

--
-- Name: parties parties_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY parties_select_tenant_isolated ON public.parties FOR SELECT TO authenticated USING ((tenant_id = public.get_current_user_tenant_id()));


--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods payment_methods_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY payment_methods_select_tenant_isolated ON public.payment_methods FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: payment_methods payment_methods_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY payment_methods_write_authorized ON public.payment_methods TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: pos_override_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pos_override_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: pos_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: pos_override_tokens pot_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pot_select ON public.pos_override_tokens FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: purchase_order_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_items purchase_order_items_select_tenant; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purchase_order_items_select_tenant ON public.purchase_order_items FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = public.get_current_user_store_id())))) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: purchase_order_items purchase_order_items_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purchase_order_items_select_tenant_isolated ON public.purchase_order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND ((po.store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id())))))))));


--
-- Name: purchase_order_items purchase_order_items_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purchase_order_items_write_authorized ON public.purchase_order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))))));


--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders purchase_orders_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purchase_orders_select_tenant_isolated ON public.purchase_orders FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: purchase_orders purchase_orders_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purchase_orders_write_authorized ON public.purchase_orders TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: purchase_receipt_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_receipts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.receipt_config ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_config receipt_config_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipt_config_select_tenant_isolated ON public.receipt_config FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: receipt_config receipt_config_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipt_config_write_authorized ON public.receipt_config TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: purchase_receipt_items receipt_items_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipt_items_select ON public.purchase_receipt_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.purchase_receipts pr
  WHERE ((pr.id = purchase_receipt_items.receipt_id) AND (pr.tenant_id = public.current_tenant_id())))));


--
-- Name: purchase_receipt_items receipt_items_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipt_items_write ON public.purchase_receipt_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.purchase_receipts pr
  WHERE ((pr.id = purchase_receipt_items.receipt_id) AND (pr.tenant_id = public.current_tenant_id()) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text])))))))));


--
-- Name: purchase_receipts receipts_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipts_select ON public.purchase_receipts FOR SELECT TO authenticated USING ((tenant_id = public.current_tenant_id()));


--
-- Name: purchase_receipts receipts_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipts_write ON public.purchase_receipts TO authenticated USING (((tenant_id = public.current_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text])))))));


--
-- Name: reminders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders reminders_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reminders_delete ON public.reminders FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: reminders reminders_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reminders_insert ON public.reminders FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: reminders reminders_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reminders_select ON public.reminders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id)))));


--
-- Name: reminders reminders_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reminders_update ON public.reminders FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sale_audit_log sal_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sal_select ON public.sale_audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sale_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sale_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items sale_items_select_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sale_items_select_staff ON public.sale_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text]))))));


--
-- Name: sale_payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_sync_conflicts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sale_sync_conflicts ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: sales sales_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: sales sales_select_manager; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sales_select_manager ON public.sales FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sales sales_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sales_select_own ON public.sales FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.id = sales.cashier_id) AND (u.created_at >= CURRENT_DATE)))));


--
-- Name: sales sales_void; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sales_void ON public.sales FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: inventory_movements select_inventory_movements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_inventory_movements ON public.inventory_movements FOR SELECT TO authenticated USING ((store_id IN ( SELECT user_stores.store_id
   FROM public.user_stores
  WHERE (user_stores.user_id = auth.uid()))));


--
-- Name: inventory_reconciliations select_reconciliations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_reconciliations ON public.inventory_reconciliations FOR SELECT TO authenticated USING ((store_id IN ( SELECT user_stores.store_id
   FROM public.user_stores
  WHERE (user_stores.user_id = auth.uid()))));


--
-- Name: pos_sessions ses_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ses_insert ON public.pos_sessions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: pos_sessions ses_select_manager; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ses_select_manager ON public.pos_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: pos_sessions ses_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ses_select_own ON public.pos_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.id = pos_sessions.cashier_id)))));


--
-- Name: pos_sessions ses_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ses_update ON public.pos_sessions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND ((u.id = pos_sessions.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: sale_items si_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY si_insert ON public.sale_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: sale_items si_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY si_select ON public.sale_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sales s
     JOIN public.users u ON ((u.auth_id = ( SELECT auth.uid() AS uid))))
  WHERE ((s.id = sale_items.sale_id) AND ((u.id = s.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: sale_payments sp_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sp_insert ON public.sale_payments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: sale_payments sp_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sp_select ON public.sale_payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sales s
     JOIN public.users u ON ((u.auth_id = ( SELECT auth.uid() AS uid))))
  WHERE ((s.id = sale_payments.sale_id) AND ((u.id = s.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: sale_sync_conflicts ssc_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ssc_insert ON public.sale_sync_conflicts FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));


--
-- Name: sale_sync_conflicts ssc_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ssc_select ON public.sale_sync_conflicts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: sale_sync_conflicts ssc_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ssc_update ON public.sale_sync_conflicts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));


--
-- Name: stock_alert_thresholds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_alert_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_alert_thresholds stock_alert_thresholds_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_alert_thresholds_select_tenant_isolated ON public.stock_alert_thresholds FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: stock_alert_thresholds stock_alert_thresholds_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_alert_thresholds_write_authorized ON public.stock_alert_thresholds TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));


--
-- Name: stock_ledger; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_ledger stock_ledger_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_ledger_insert_authenticated ON public.stock_ledger FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id IN ( SELECT stores.tenant_id
           FROM public.stores
          WHERE (stores.id = stock_ledger.store_id)))))));


--
-- Name: stock_ledger stock_ledger_read_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_ledger_read_authenticated ON public.stock_ledger FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id IN ( SELECT stores.tenant_id
           FROM public.stores
          WHERE (stores.id = stock_ledger.store_id)))))));


--
-- Name: stock_ledger stock_ledger_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_ledger_service_role_all ON public.stock_ledger TO service_role USING (true) WITH CHECK (true);


--
-- Name: stock_levels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_levels stock_levels_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_levels_select_tenant_isolated ON public.stock_levels FOR SELECT TO authenticated USING (((store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: stock_levels stock_levels_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_levels_write_authorized ON public.stock_levels TO authenticated USING (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK (((store_id = public.get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));


--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements stock_movements_insert_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_movements_insert_staff ON public.stock_movements FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text]))))));


--
-- Name: stock_movements stock_movements_select_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_movements_select_staff ON public.stock_movements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text]))))));


--
-- Name: stock_transfer_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_transfer_items stock_transfer_items_select_tenant; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_transfer_items_select_tenant ON public.stock_transfer_items FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id()))))) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: stock_transfer_items stock_transfer_items_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_transfer_items_select_tenant_isolated ON public.stock_transfer_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id())))))))));


--
-- Name: stock_transfer_items stock_transfer_items_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_transfer_items_write_authorized ON public.stock_transfer_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = public.get_current_user_store_id()) OR (st.to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))))));


--
-- Name: stock_transfers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_transfers stock_transfers_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_transfers_select_tenant_isolated ON public.stock_transfers FOR SELECT TO authenticated USING (((from_store_id = public.get_current_user_store_id()) OR (to_store_id = public.get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: stock_transfers stock_transfers_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_transfers_write_authorized ON public.stock_transfers TO authenticated USING ((((from_store_id = public.get_current_user_store_id()) OR (to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK ((((from_store_id = public.get_current_user_store_id()) OR (to_store_id = public.get_current_user_store_id())) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));


--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: stores stores_delete_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_delete_authenticated ON public.stores FOR DELETE TO authenticated USING (true);


--
-- Name: stores stores_delete_tenant_scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_delete_tenant_scoped ON public.stores FOR DELETE TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = u.tenant_id))))));


--
-- Name: stores stores_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_insert_authenticated ON public.stores FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));


--
-- Name: stores stores_insert_tenant_scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_insert_tenant_scoped ON public.stores FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = u.tenant_id)))));


--
-- Name: stores stores_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_select_tenant_isolated ON public.stores FOR SELECT TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = stores.tenant_id))))));


--
-- Name: stores stores_update_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_update_authenticated ON public.stores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: stores stores_update_tenant_scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stores_update_tenant_scoped ON public.stores FOR UPDATE TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = u.tenant_id)))))) WITH CHECK (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = u.tenant_id))))));


--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers suppliers_select_tenant_isolated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY suppliers_select_tenant_isolated ON public.suppliers FOR SELECT TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = public.get_current_user_tenant_id()))))));


--
-- Name: suppliers suppliers_write_authorized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY suppliers_write_authorized ON public.suppliers TO authenticated USING (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((tenant_id = public.get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_reconciliations update_reconciliations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY update_reconciliations ON public.inventory_reconciliations FOR UPDATE TO authenticated USING ((store_id IN ( SELECT user_stores.store_id
   FROM public.user_stores
  WHERE (user_stores.user_id = auth.uid()))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_select_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_select_self ON public.users FOR SELECT TO authenticated USING ((auth_id = auth.uid()));


--
-- Name: users users_select_tenant_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_select_tenant_admin ON public.users FOR SELECT TO authenticated USING (public.is_admin_in_tenant(tenant_id));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated USING ((auth_id = auth.uid())) WITH CHECK ((auth_id = auth.uid()));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_namespaces; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.iceberg_namespaces ENABLE ROW LEVEL SECURITY;

--
-- Name: iceberg_tables; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.iceberg_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime stock_levels; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.stock_levels;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict w8PTdWASALczwfxle6cJFd3z2Cd9wa8pc1XoZnd0pjh8QOD3iZ6mrRxWwGpszcV


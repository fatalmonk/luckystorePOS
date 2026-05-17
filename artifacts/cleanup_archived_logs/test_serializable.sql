CREATE TABLE IF NOT EXISTS test_serial (id int, val int);
INSERT INTO test_serial VALUES (1, 1);
CREATE OR REPLACE FUNCTION test_retry() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  i int;
BEGIN
  SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  FOR i IN 1..3 LOOP
    BEGIN
      UPDATE test_serial SET val = val + 1 WHERE id = 1;
      RETURN;
    EXCEPTION WHEN serialization_failure THEN
      IF i = 3 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

-- ============================================
-- Migration: Create deal_cases table (fixed)
-- Date: 2026-05-20
-- ============================================

-- Rollback ของเก่าก่อน (ถ้ามี)
DROP TRIGGER IF EXISTS trg_deal_cases_updated_at ON deal_cases;
DROP FUNCTION IF EXISTS update_deal_cases_updated_at();
DROP TABLE IF EXISTS deal_cases;
DROP TYPE IF EXISTS deal_status;

CREATE TYPE deal_status AS ENUM ('pending', 'success');

CREATE TABLE deal_cases (
  id               SERIAL PRIMARY KEY,
  place_id         VARCHAR(255) NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
  sale_id          UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reference_code   VARCHAR(30)  NOT NULL,
  status           deal_status  NOT NULL DEFAULT 'pending',
  note             TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_cases_place_id  ON deal_cases(place_id);
CREATE INDEX idx_deal_cases_sale_id   ON deal_cases(sale_id);
CREATE INDEX idx_deal_cases_status    ON deal_cases(status);

CREATE OR REPLACE FUNCTION update_deal_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deal_cases_updated_at
BEFORE UPDATE ON deal_cases
FOR EACH ROW
EXECUTE FUNCTION update_deal_cases_updated_at();
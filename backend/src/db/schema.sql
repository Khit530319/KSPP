-- ============================================================
--  FreshCut ERP — PostgreSQL Schema
--  Version 1.0  |  Engine: PostgreSQL 15+
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('admin','manager','user','viewer');
CREATE TYPE stock_status   AS ENUM ('ok','low','critical','expired');
CREATE TYPE order_status   AS ENUM ('draft','confirmed','preparing','shipped','delivered','cancelled');
CREATE TYPE wo_status      AS ENUM ('queue','running','done','cancelled');
CREATE TYPE qc_result      AS ENUM ('pass','fail','hold');
CREATE TYPE doc_type       AS ENUM ('po','so','grn','invoice','payment','dn','wo','qc_report','stockadj');
CREATE TYPE import_status  AS ENUM ('success','warning','error');
CREATE TYPE product_cat    AS ENUM ('fresh','frozen','processed');
CREATE TYPE product_status AS ENUM ('active','oos','dev','discontinued');
CREATE TYPE loss_type      AS ENUM ('peel_seed','qc_fail','expired','cut_damage','size_reject','other');
CREATE TYPE shortfall_status AS ENUM ('urgent','pending','resolved');

-- ============================================================
--  USERS & PERMISSIONS
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  department    VARCHAR(100),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role       user_role NOT NULL,
  module_key VARCHAR(50) NOT NULL,
  can_view   BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, module_key)
);

CREATE TABLE user_finance_overrides (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key VARCHAR(50) NOT NULL,
  can_view   BOOLEAN,
  can_create BOOLEAN,
  can_edit   BOOLEAN,
  can_delete BOOLEAN,
  can_approve BOOLEAN,
  can_export BOOLEAN,
  approval_limit NUMERIC(15,2),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module_key)
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  module      VARCHAR(50),
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  PRODUCTS & RAW MATERIALS
-- ============================================================
CREATE TABLE raw_materials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  unit            VARCHAR(20) NOT NULL DEFAULT 'กก.',
  stock_qty       NUMERIC(12,3) NOT NULL DEFAULT 0,
  safety_stock    NUMERIC(12,3) NOT NULL DEFAULT 0,
  cost_per_unit   NUMERIC(10,2),
  supplier_id     UUID,
  expiry_days     INTEGER DEFAULT 3,
  storage_temp    VARCHAR(20),
  status          stock_status NOT NULL DEFAULT 'ok',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(20) UNIQUE NOT NULL,
  name_th         VARCHAR(200) NOT NULL,
  name_en         VARCHAR(200),
  category        product_cat NOT NULL DEFAULT 'fresh',
  net_weight      VARCHAR(20),
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_qty       INTEGER NOT NULL DEFAULT 0,
  safety_stock    INTEGER NOT NULL DEFAULT 0,
  shelf_days      INTEGER NOT NULL DEFAULT 3,
  storage_temp    VARCHAR(20),
  barcode         VARCHAR(50),
  description     TEXT,
  status          product_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_raw_materials (
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  qty_per_unit    NUMERIC(10,3) NOT NULL,
  unit            VARCHAR(20),
  PRIMARY KEY (product_id, raw_material_id)
);

-- ============================================================
--  SUPPLIERS & CUSTOMERS
-- ============================================================
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  address       TEXT,
  tax_id        VARCHAR(20),
  payment_terms INTEGER DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  type          VARCHAR(50),
  contact_name  VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  address       TEXT,
  tax_id        VARCHAR(20),
  credit_days   INTEGER DEFAULT 30,
  credit_limit  NUMERIC(15,2) DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  INVENTORY / RECEIVING
-- ============================================================
CREATE TABLE grn (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_no          VARCHAR(20) UNIQUE NOT NULL,
  supplier_id     UUID REFERENCES suppliers(id),
  received_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by     UUID REFERENCES users(id),
  total_amount    NUMERIC(15,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grn_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id          UUID NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  qty_received    NUMERIC(12,3) NOT NULL,
  unit_cost       NUMERIC(10,2),
  temperature     NUMERIC(5,2),
  lot_no          VARCHAR(50),
  expiry_date     DATE,
  qc_result       qc_result DEFAULT 'pass',
  notes           TEXT
);

CREATE TABLE stock_adjustments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adj_no          VARCHAR(20) UNIQUE NOT NULL,
  item_type       VARCHAR(10) NOT NULL CHECK (item_type IN ('raw','product')),
  item_id         UUID NOT NULL,
  qty_before      NUMERIC(12,3) NOT NULL,
  qty_after       NUMERIC(12,3) NOT NULL,
  reason          TEXT,
  approved_by     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  PRODUCTION
-- ============================================================
CREATE TABLE work_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_no           VARCHAR(20) UNIQUE NOT NULL,
  product_id      UUID NOT NULL REFERENCES products(id),
  target_qty      INTEGER NOT NULL,
  produced_qty    INTEGER NOT NULL DEFAULT 0,
  production_line VARCHAR(10),
  planned_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          wo_status NOT NULL DEFAULT 'queue',
  created_by      UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wo_material_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id           UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  planned_qty     NUMERIC(12,3),
  actual_qty      NUMERIC(12,3),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  QC
-- ============================================================
CREATE TABLE qc_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qc_no           VARCHAR(20) UNIQUE NOT NULL,
  wo_id           UUID REFERENCES work_orders(id),
  grn_id          UUID REFERENCES grn(id),
  product_id      UUID REFERENCES products(id),
  raw_material_id UUID REFERENCES raw_materials(id),
  sample_weight   NUMERIC(10,3),
  temperature     NUMERIC(5,2),
  color_result    VARCHAR(20),
  smell_result    VARCHAR(20),
  texture_result  VARCHAR(20),
  result          qc_result NOT NULL DEFAULT 'pass',
  inspector_id    UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  LOSS TRACKING
-- ============================================================
CREATE TABLE loss_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id           UUID REFERENCES work_orders(id),
  product_id      UUID REFERENCES products(id),
  raw_material_id UUID REFERENCES raw_materials(id),
  loss_type       loss_type NOT NULL DEFAULT 'other',
  loss_qty        NUMERIC(12,3) NOT NULL,
  total_qty       NUMERIC(12,3) NOT NULL,
  loss_rate       NUMERIC(5,2) GENERATED ALWAYS AS
                    (ROUND((loss_qty / NULLIF(total_qty,0)) * 100, 2)) STORED,
  loss_value      NUMERIC(12,2),
  production_line VARCHAR(10),
  recorded_by     UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SALES ORDERS & DELIVERY
-- ============================================================
CREATE TABLE sales_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  so_no           VARCHAR(20) UNIQUE NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  total_amount    NUMERIC(15,2) DEFAULT 0,
  status          order_status NOT NULL DEFAULT 'draft',
  confirmed_by    UUID REFERENCES users(id),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE so_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  so_id           UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  ordered_qty     INTEGER NOT NULL,
  delivered_qty   INTEGER NOT NULL DEFAULT 0,
  unit_price      NUMERIC(10,2) NOT NULL,
  discount_pct    NUMERIC(5,2) DEFAULT 0,
  line_total      NUMERIC(12,2)
);

CREATE TABLE delivery_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_no           VARCHAR(20) UNIQUE NOT NULL,
  so_id           UUID NOT NULL REFERENCES sales_orders(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  delivery_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  driver_id       UUID REFERENCES users(id),
  vehicle_plate   VARCHAR(20),
  delivered_by    UUID REFERENCES users(id),
  status          order_status NOT NULL DEFAULT 'confirmed',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dn_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  so_item_id      UUID REFERENCES so_items(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  ordered_qty     INTEGER NOT NULL,
  delivered_qty   INTEGER NOT NULL,
  shortfall_qty   INTEGER GENERATED ALWAYS AS (ordered_qty - delivered_qty) STORED
);

CREATE TABLE shortfall_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID REFERENCES delivery_notes(id),
  so_id           UUID NOT NULL REFERENCES sales_orders(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  ordered_qty     INTEGER NOT NULL,
  delivered_qty   INTEGER NOT NULL,
  shortfall_qty   INTEGER GENERATED ALWAYS AS (ordered_qty - delivered_qty) STORED,
  fill_rate       NUMERIC(5,2) GENERATED ALWAYS AS
                    (ROUND((delivered_qty::NUMERIC / NULLIF(ordered_qty,0)) * 100, 2)) STORED,
  cause           TEXT,
  status          shortfall_status NOT NULL DEFAULT 'pending',
  compensation    TEXT,
  notified_at     TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  FINANCE
-- ============================================================
CREATE TABLE ap_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no      VARCHAR(50) UNIQUE NOT NULL,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  grn_id          UUID REFERENCES grn(id),
  invoice_date    DATE NOT NULL,
  due_date        DATE NOT NULL,
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                    CHECK (status IN ('unpaid','partial','paid','overdue')),
  approved_by     UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ar_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no      VARCHAR(50) UNIQUE NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  so_id           UUID REFERENCES sales_orders(id),
  invoice_date    DATE NOT NULL,
  due_date        DATE NOT NULL,
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                    CHECK (status IN ('unpaid','partial','paid','overdue')),
  approved_by     UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_no      VARCHAR(20) UNIQUE NOT NULL,
  payment_type    VARCHAR(10) NOT NULL CHECK (payment_type IN ('ap','ar')),
  invoice_id      UUID NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  method          VARCHAR(30),
  bank_name       VARCHAR(100),
  reference_no    VARCHAR(100),
  approved_by     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  HR
-- ============================================================
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emp_no          VARCHAR(20) UNIQUE NOT NULL,
  user_id         UUID REFERENCES users(id),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  department      VARCHAR(100),
  position        VARCHAR(100),
  base_salary     NUMERIC(12,2),
  hire_date       DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  work_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in        TIME,
  check_out       TIME,
  status          VARCHAR(20) NOT NULL DEFAULT 'present'
                    CHECK (status IN ('present','absent','leave','late')),
  ot_hours        NUMERIC(5,2) DEFAULT 0,
  notes           TEXT,
  UNIQUE(employee_id, work_date)
);

-- ============================================================
--  DOCUMENT IMPORTS
-- ============================================================
CREATE TABLE document_imports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_no       VARCHAR(20) UNIQUE NOT NULL,
  doc_type        doc_type NOT NULL,
  file_name       VARCHAR(255),
  file_size       INTEGER,
  file_url        TEXT,
  row_count       INTEGER DEFAULT 0,
  success_count   INTEGER DEFAULT 0,
  error_count     INTEGER DEFAULT 0,
  status          import_status NOT NULL DEFAULT 'success',
  error_details   JSONB,
  target_module   VARCHAR(50),
  imported_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  COLD ROOM MONITORING
-- ============================================================
CREATE TABLE cold_room_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_name       VARCHAR(50) NOT NULL,
  temperature     NUMERIC(5,2) NOT NULL,
  humidity        NUMERIC(5,2),
  capacity_pct    INTEGER,
  is_alert        BOOLEAN NOT NULL DEFAULT false,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_rm_status         ON raw_materials(status);
CREATE INDEX idx_products_status   ON products(status);
CREATE INDEX idx_so_customer       ON sales_orders(customer_id);
CREATE INDEX idx_so_status         ON sales_orders(status);
CREATE INDEX idx_so_due            ON sales_orders(due_date);
CREATE INDEX idx_wo_status         ON work_orders(status);
CREATE INDEX idx_wo_date           ON work_orders(planned_date);
CREATE INDEX idx_loss_created      ON loss_records(created_at);
CREATE INDEX idx_shortfall_status  ON shortfall_records(status);
CREATE INDEX idx_audit_user        ON audit_logs(user_id);
CREATE INDEX idx_audit_created     ON audit_logs(created_at);
CREATE INDEX idx_cold_room_time    ON cold_room_logs(recorded_at);
CREATE INDEX idx_ap_status         ON ap_invoices(status);
CREATE INDEX idx_ar_status         ON ar_invoices(status);

-- ============================================================
--  AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','products','raw_materials','sales_orders','work_orders']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END;
$$;

-- ============================================================
--  SEED DATA
-- ============================================================
INSERT INTO users (first_name,last_name,email,password_hash,role,department) VALUES
('สมชาย','ใจดี',  'admin@freshcut.com',   crypt('Admin@1234',gen_salt('bf',12)),'admin',  'ผู้บริหาร'),
('สมศรี', 'รักงาน','manager@freshcut.com', crypt('Mgr@1234', gen_salt('bf',12)),'manager','ผลิต'),
('วิชัย', 'มานะ',  'sales@freshcut.com',   crypt('Sales@123',gen_salt('bf',12)),'manager','ขาย'),
('มานี',  'สุขสม', 'stock@freshcut.com',   crypt('Stock@123',gen_salt('bf',12)),'user',   'คลังสินค้า'),
('อนันต์','ดีมาก', 'acc@freshcut.com',     crypt('Acc@1234', gen_salt('bf',12)),'viewer', 'บัญชี');

INSERT INTO raw_materials (code,name,unit,stock_qty,safety_stock,cost_per_unit,expiry_days,storage_temp,status) VALUES
('RM-001','สับปะรด ตราด','กก.',320,500,12.50,4,'0-4','low'),
('RM-002','มะม่วงน้ำดอกไม้','กก.',850,400,30.00,4,'0-4','ok'),
('RM-003','แตงโม','กก.',1200,600,10.00,5,'0-4','ok'),
('RM-004','มะละกอแก้ว','กก.',540,300,20.00,4,'0-4','ok'),
('RM-005','เมลอน','กก.',45,200,30.00,4,'0-4','low'),
('RM-006','ลำไย','กก.',680,300,25.00,3,'0-4','ok'),
('RM-007','มะยงชิด','กก.',90,250,45.00,3,'-1 to 4','low');

INSERT INTO products (code,name_th,name_en,category,net_weight,price,cost,stock_qty,safety_stock,shelf_days,storage_temp,status) VALUES
('FG-001','ลำไยคว้านเมล็ด 100g','Pitted Longan 100g','fresh','100g',45,28,1840,500,3,'0-4','active'),
('FG-002','สับปะรดภูแลตัดแต่ง 100g','Phu Lae Pineapple Cut 100g','fresh','100g',35,18,2200,600,3,'0-4','active'),
('FG-003','มะยงชิดแช่แข็ง 500g','Frozen Marian Plum 500g','frozen','500g',180,95,120,200,365,'-18','oos'),
('FG-004','Fresh Cut Mix 250g','Fresh Cut Mix 250g','fresh','250g',55,32,2400,500,3,'0-4','active'),
('FG-005','สับปะรดหั่น 200g','Cut Pineapple 200g','fresh','200g',38,20,1860,400,3,'0-4','active'),
('FG-006','มะม่วงหั่น 200g','Cut Mango 200g','fresh','200g',60,38,980,300,3,'0-4','active'),
('FG-007','แตงโมหั่น 300g','Cut Watermelon 300g','fresh','300g',40,18,1540,400,2,'0-4','active');

INSERT INTO suppliers (code,name,contact_name,phone,payment_terms) VALUES
('SUP-001','สวนจำเริญ ตราด','คุณจำเริญ','081-234-5678',30),
('SUP-002','กลุ่มเกษตรกร เชียงใหม่','คุณสมบูรณ์','082-345-6789',30),
('SUP-003','บริษัท ABC บรรจุภัณฑ์','คุณอรุณ','02-123-4567',45);

INSERT INTO customers (code,name,type,phone,credit_days,credit_limit) VALUES
('C-001','7-Eleven (DC)','Modern Trade','02-777-8888',30,500000),
('C-002','BigC กรุงเทพ','Modern Trade','02-888-9999',30,400000),
('C-003','Tops Market','Modern Trade','02-999-0000',45,300000),
('C-004','Villa Market','Specialty','02-111-2222',30,200000),
('C-005','Makro ลาดพร้าว','Modern Trade','02-333-4444',30,350000),
('C-006','โรงแรม Marriott','HoReCa','02-444-5555',15,150000);

-- Default finance permissions
INSERT INTO finance_permissions (role,module_key,can_view,can_create,can_edit,can_delete,can_approve,can_export) VALUES
('admin','dashboard_fin',true,true,true,true,true,true),
('admin','ar',true,true,true,true,true,true),
('admin','ap',true,true,true,true,true,true),
('admin','payment',true,true,true,true,true,true),
('admin','invoice',true,true,true,true,true,true),
('admin','budget',true,true,true,true,true,true),
('admin','gl',true,true,true,true,true,true),
('admin','report_fin',true,true,true,true,true,true),
('manager','dashboard_fin',true,false,false,false,false,true),
('manager','ar',true,true,true,false,true,true),
('manager','ap',true,true,true,false,true,true),
('manager','payment',true,true,true,false,true,false),
('manager','report_fin',true,false,false,false,false,true),
('user','dashboard_fin',true,false,false,false,false,false),
('user','ar',true,true,false,false,false,false),
('user','ap',true,true,false,false,false,false),
('viewer','dashboard_fin',true,false,false,false,false,false),
('viewer','report_fin',true,false,false,false,false,false);

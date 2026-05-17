# 🌿 FreshCut ERP — Full-Stack Web Application

ระบบ ERP สำหรับโรงงานแปรรูปผลไม้ (Fresh Cut Fruit)  
**Stack:** React + Node.js + PostgreSQL + Redis + Docker

---

## 📁 โครงสร้างโปรเจกต์

```
freshcut-erp/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express entry point + WebSocket
│   │   ├── db/
│   │   │   ├── index.js       # PostgreSQL connection pool
│   │   │   └── schema.sql     # Full DB schema + seed data
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT auth + RBAC + audit log
│   │   └── routes/
│   │       ├── auth.js        # Login / me / change-password
│   │       ├── dashboard.js   # KPIs + alerts
│   │       ├── inventory.js   # Raw materials + products CRUD
│   │       ├── production.js  # Work orders
│   │       ├── quality.js     # QC + Loss + Shortfalls
│   │       ├── orders.js      # Sales orders
│   │       ├── finance.js     # AP / AR / Payments + ACL
│   │       ├── users.js       # User management + audit logs
│   │       └── imports.js     # Document upload & parse
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.js      # Fetch wrapper + JWT + WS
│       └── hooks/
│           └── useApi.js      # React hooks for all endpoints
├── docker/
│   └── nginx.conf             # Nginx reverse proxy config
├── docker-compose.yml         # Full stack: DB + Redis + API + Web
├── .env.example               # Environment variables template
└── README.md
```

---

## 🚀 วิธี Run ด้วย Docker (ง่ายที่สุด)

```bash
# 1. Clone / copy โปรเจกต์
cd freshcut-erp

# 2. สร้าง .env
cp .env.example .env
# แก้ไข JWT_SECRET และ passwords ใน .env

# 3. Start ทั้งระบบ
docker compose up -d

# 4. ตรวจสอบ
docker compose ps
docker compose logs backend -f

# เข้าใช้งาน:
# Frontend:  http://localhost
# API:       http://localhost:3001/health
# pgAdmin:   docker compose --profile tools up -d pgadmin
#            http://localhost:5050
```

---

## 💻 Development (Local)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env   # แก้ DATABASE_URL ให้ชี้ไป local Postgres

# รัน migration + seed
psql $DATABASE_URL -f src/db/schema.sql

# Start dev server (hot reload)
npm run dev
# API: http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install               # Vite + React project
echo "VITE_API_URL=http://localhost:3001/api" > .env.local
npm run dev
# App: http://localhost:5173
```

---

## ☁️ Deploy บน Cloud

### Option A: Railway (แนะนำ — ง่ายสุด ~$10-40/เดือน)

```bash
# 1. สมัคร railway.app
# 2. New Project → Deploy from GitHub
# 3. Add PostgreSQL plugin → copy DATABASE_URL
# 4. Set environment variables:
#    DATABASE_URL = (จาก PostgreSQL plugin)
#    JWT_SECRET   = (random 32+ chars)
#    NODE_ENV     = production
#    FRONTEND_URL = https://your-frontend.vercel.app

# Frontend → Deploy บน Vercel
# VITE_API_URL = https://your-api.up.railway.app/api
```

### Option B: AWS / GCP / Azure

```bash
# Backend → ECS Fargate / Cloud Run / App Service
# Database → RDS PostgreSQL / Cloud SQL / Azure Database
# Frontend → S3+CloudFront / Firebase Hosting / Azure Static Web Apps
# ดูรายละเอียดใน docs/cloud-deploy.md
```

---

## 🔐 Default Login Credentials

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@freshcut.com     | Admin@1234  |
| Manager | manager@freshcut.com   | Mgr@1234    |
| Sales   | sales@freshcut.com     | Sales@123   |
| Stock   | stock@freshcut.com     | Stock@123   |
| Viewer  | acc@freshcut.com       | Acc@1234    |

> ⚠️ **เปลี่ยนรหัสผ่านทันทีหลัง deploy สู่ production**

---

## 🗄️ Database Tables (15 ตาราง)

| Table                  | คำอธิบาย                        |
|------------------------|---------------------------------|
| users                  | ผู้ใช้งานและ Role               |
| finance_permissions    | สิทธิ์โมดูลการเงินตาม Role      |
| user_finance_overrides | Override สิทธิ์รายบุคคล         |
| audit_logs             | บันทึกการใช้งาน                 |
| raw_materials          | วัตถุดิบ                        |
| products               | สินค้าสำเร็จรูป                 |
| suppliers              | ผู้จำหน่าย                      |
| customers              | ลูกค้า                          |
| grn / grn_items        | ใบรับสินค้า                     |
| work_orders            | ใบสั่งผลิต                      |
| qc_records             | ผล QC                           |
| loss_records           | บันทึกการสูญเสีย (Loss Rate คำนวณอัตโนมัติ) |
| sales_orders / so_items| คำสั่งซื้อ                      |
| delivery_notes         | ใบส่งของ                        |
| shortfall_records      | การขาดส่ง (Fill Rate คำนวณอัตโนมัติ) |
| ap_invoices            | เจ้าหนี้ (AP)                   |
| ar_invoices            | ลูกหนี้ (AR)                    |
| payments               | การชำระเงิน                     |
| employees / attendance | พนักงาน / การมาทำงาน            |
| document_imports       | บันทึกการนำเข้าเอกสาร           |
| cold_room_logs         | บันทึก Cold Room                |

---

## 🔌 API Endpoints สำคัญ

```
POST /api/auth/login              Login → JWT token
GET  /api/auth/me                 ข้อมูลผู้ใช้ปัจจุบัน
GET  /api/dashboard               KPIs + alerts
GET  /api/inventory/products      รายการสินค้า
GET  /api/inventory/raw-materials วัตถุดิบ
GET  /api/production              ใบสั่งผลิตวันนี้
POST /api/production              สร้างใบสั่งผลิต
GET  /api/quality/qc              ผล QC
GET  /api/quality/loss            บันทึกสูญเสีย
GET  /api/quality/shortfalls      การขาดส่ง
GET  /api/orders                  คำสั่งซื้อ
POST /api/orders                  สร้างคำสั่งซื้อ
GET  /api/finance/summary         สรุปการเงิน
GET  /api/finance/ap              เจ้าหนี้
GET  /api/finance/ar              ลูกหนี้
POST /api/finance/payments        ชำระเงิน (ตรวจ approval limit)
GET  /api/users                   รายชื่อผู้ใช้ (admin/manager)
POST /api/imports/upload          อัพโหลด PDF/Excel/CSV
GET  /api/imports                 ประวัติการนำเข้า
WS   /ws                          Real-time alerts
```

---

## 📦 Tech Stack

| Layer    | Technology              | Cloud Option         |
|----------|-------------------------|----------------------|
| Frontend | React 18 + Vite         | Vercel / Netlify     |
| Backend  | Node.js + Express 4     | Railway / Cloud Run  |
| Database | PostgreSQL 15           | Supabase / Neon / RDS|
| Cache    | Redis 7                 | Upstash / ElastiCache|
| Storage  | Local / S3-compatible   | Cloudflare R2 / S3   |
| Proxy    | Nginx                   | Included in container|
| CI/CD    | GitHub Actions          | Auto-deploy on push  |

---

## 📈 ขั้นตอนต่อไป (Optional)

- [ ] เพิ่ม LINE Notify / Email alerts
- [ ] สร้าง Mobile App ด้วย React Native (code sharing กับ frontend)
- [ ] เชื่อม BI Tool (Metabase / Grafana) กับ PostgreSQL
- [ ] เพิ่ม 2FA (TOTP) สำหรับ Admin
- [ ] GitHub Actions CI/CD pipeline

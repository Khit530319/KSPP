import { useState, useEffect, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const MODULES = [
  { id:"dashboard",   label:"Dashboard",           icon:"ti-layout-dashboard",  group:"ภาพรวม" },
  { id:"inventory",   label:"วัตถุดิบ/คลัง",       icon:"ti-package",           group:"คลังสินค้า" },
  { id:"receiving",   label:"รับวัตถุดิบ",          icon:"ti-truck-delivery",    group:"คลังสินค้า" },
  { id:"production",  label:"แผนการผลิต",           icon:"ti-clipboard-list",    group:"การผลิต" },
  { id:"qc",          label:"QC/คุณภาพ",            icon:"ti-shield-check",      group:"การผลิต" },
  { id:"loss",        label:"ตรวจสอบสูญเสีย",       icon:"ti-chart-pie",         group:"การผลิต" },
  { id:"orders",      label:"คำสั่งซื้อ/ขาย",      icon:"ti-shopping-cart",     group:"การขาย",  badge:5 },
  { id:"delivery",    label:"การจัดส่ง",            icon:"ti-truck",             group:"การขาย" },
  { id:"customers",   label:"ลูกค้า",               icon:"ti-users",             group:"การขาย" },
  { id:"products",    label:"รายการสินค้า",         icon:"ti-package",           group:"สินค้า" },
  { id:"finance",     label:"บัญชีการเงิน",         icon:"ti-report-money",      group:"บัญชี/HR" },
  { id:"hr",          label:"HR/พนักงาน",           icon:"ti-user-circle",       group:"บัญชี/HR" },
  { id:"reports",     label:"รายงาน",               icon:"ti-chart-bar",         group:"รายงาน" },
  { id:"users",       label:"จัดการผู้ใช้",         icon:"ti-user-cog",          group:"ตั้งค่า" },
  { id:"finance_acl", label:"สิทธิ์การเงิน",        icon:"ti-shield-lock",       group:"ตั้งค่า" },
  { id:"docimport",   label:"นำเข้าเอกสาร",         icon:"ti-file-upload",       group:"นำเข้าข้อมูล" },
];

const KPI_DATA = [
  { label:"ผลิตวันนี้",        value:"2,840 กก.",  sub:"↑ 12% จากเมื่อวาน", up:true },
  { label:"คำสั่งซื้อรอส่ง",   value:"5 ออเดอร์",  sub:"↑ 2 ใหม่วันนี้",     up:false },
  { label:"รายได้เดือนนี้",    value:"1.24M",       sub:"↑ 8.3% MoM",         up:true },
  { label:"Cold Room",         value:"4.2°C",       sub:"✓ ปกติ",              up:true },
  { label:"Fill Rate",         value:"91.4%",       sub:"เป้า ≥95%",           up:false },
  { label:"Loss Rate",         value:"8.4%",        sub:"เป้า ≤8.0%",          up:false },
];

const PRODUCTS = [
  { id:1,code:"FG-001",name:"ลำไยคว้านเมล็ด 100g",   cat:"fresh",  price:45, cost:28, stock:1840, safety:500,  shelf:3,  temp:"0-4",  status:"active" },
  { id:2,code:"FG-002",name:"สับปะรดภูแลตัดแต่ง 100g",cat:"fresh",  price:35, cost:18, stock:2200, safety:600,  shelf:3,  temp:"0-4",  status:"active" },
  { id:3,code:"FG-003",name:"มะยงชิดแช่แข็ง 500g",    cat:"frozen", price:180,cost:95, stock:120,  safety:200,  shelf:365,temp:"-18",  status:"oos" },
  { id:4,code:"FG-004",name:"Fresh Cut Mix 250g",      cat:"fresh",  price:55, cost:32, stock:2400, safety:500,  shelf:3,  temp:"0-4",  status:"active" },
  { id:5,code:"FG-005",name:"สับปะรดหั่น 200g",       cat:"fresh",  price:38, cost:20, stock:1860, safety:400,  shelf:3,  temp:"0-4",  status:"active" },
  { id:6,code:"FG-006",name:"มะม่วงหั่น 200g",        cat:"fresh",  price:60, cost:38, stock:980,  safety:300,  shelf:3,  temp:"0-4",  status:"active" },
  { id:7,code:"FG-007",name:"แตงโมหั่น 300g",         cat:"fresh",  price:40, cost:18, stock:1540, safety:400,  shelf:2,  temp:"0-4",  status:"active" },
];

const RAW_MATERIALS = [
  { code:"RM-001",name:"สับปะรด ตราด",      unit:"กก.",stock:320,  safety:500, expiry:"19 พ.ค.", status:"low"  },
  { code:"RM-002",name:"มะม่วงน้ำดอกไม้",   unit:"กก.",stock:850,  safety:400, expiry:"20 พ.ค.", status:"ok"   },
  { code:"RM-003",name:"แตงโม",             unit:"กก.",stock:1200, safety:600, expiry:"21 พ.ค.", status:"ok"   },
  { code:"RM-004",name:"มะละกอแก้ว",        unit:"กก.",stock:540,  safety:300, expiry:"20 พ.ค.", status:"ok"   },
  { code:"RM-005",name:"เมลอน",             unit:"กก.",stock:45,   safety:200, expiry:"18 พ.ค.", status:"low"  },
  { code:"RM-006",name:"ลำไย",              unit:"กก.",stock:680,  safety:300, expiry:"19 พ.ค.", status:"ok"   },
  { code:"RM-007",name:"มะยงชิด",           unit:"กก.",stock:90,   safety:250, expiry:"18 พ.ค.", status:"low"  },
];

const ORDERS = [
  { so:"SO-2568-0051",cust:"Tops Market",    date:"15 พ.ค.",due:"18 พ.ค.",val:48200,  status:"pending",  items:3 },
  { so:"SO-2568-0050",cust:"BigC กรุงเทพ",  date:"14 พ.ค.",due:"17 พ.ค.",val:72500,  status:"shipped",  items:5 },
  { so:"SO-2568-0049",cust:"Villa Market",   date:"14 พ.ค.",due:"17 พ.ค.",val:31000,  status:"preparing",items:2 },
  { so:"SO-2568-0048",cust:"7-Eleven DC",    date:"13 พ.ค.",due:"15 พ.ค.",val:125000, status:"shipped",  items:8 },
  { so:"SO-2568-0047",cust:"Makro ลาดพร้าว",date:"12 พ.ค.",due:"19 พ.ค.",val:95000,  status:"pending",  items:6 },
];

const WO_LIST = [
  { wo:"WO-0217",product:"Fresh Cut Mix 250g",  target:1000,done:1000,line:"A",status:"done"    },
  { wo:"WO-0218",product:"สับปะรดหั่น 200g",   target:800, done:800, line:"A",status:"done"    },
  { wo:"WO-0219",product:"มะม่วงหั่น 200g",    target:600, done:420, line:"B",status:"running" },
  { wo:"WO-0220",product:"แตงโมหั่น 300g",     target:500, done:180, line:"B",status:"running" },
  { wo:"WO-0221",product:"ลำไยคว้านเมล็ด 100g",target:400, done:0,   line:"C",status:"queue"   },
];

const LOSS_RECORDS = [
  { wo:"WO-0219",product:"มะม่วงหั่น",   type:"เปลือก/เมล็ด",kg:46,  total:650, rate:7.1 },
  { wo:"WO-0218",product:"สับปะรดหั่น",  type:"QC ไม่ผ่าน",   kg:48,  total:480, rate:10.0 },
  { wo:"WO-0220",product:"แตงโมหั่น",    type:"เปลือก/เมล็ด",kg:81,  total:900, rate:9.0 },
  { wo:"WO-0216",product:"มะละกอหั่น",   type:"เปลือก/เมล็ด",kg:32,  total:480, rate:6.7 },
  { wo:"WO-0215",product:"เมลอนหั่น",    type:"หมดอายุ",       kg:31,  total:330, rate:9.4 },
];

const SHORTFALLS = [
  { so:"SO-0051",cust:"Tops Market",  product:"Fresh Cut Mix",short:240,fill:60.0, cause:"ผลิตไม่ทัน",   status:"urgent"  },
  { so:"SO-0048",cust:"7-Eleven DC",  product:"สับปะรดหั่น",  short:180,fill:91.0, cause:"วัตถุดิบขาด",  status:"pending" },
  { so:"SO-0047",cust:"Makro",        product:"Fresh Cut Mix",short:84, fill:93.0, cause:"QC ไม่ผ่าน",   status:"pending" },
  { so:"SO-0044",cust:"BigC",         product:"มะม่วงหั่น",   short:32, fill:96.0, cause:"ผลิตไม่ทัน",   status:"resolved"},
];

const USERS_DATA = [
  { id:1,first:"สมชาย",last:"ใจดี",   email:"somchai@freshcut.com", role:"admin",   dept:"ผู้บริหาร",active:true,  last_login:"17 พ.ค. 10:02" },
  { id:2,first:"สมศรี", last:"รักงาน", email:"somsri@freshcut.com",  role:"manager", dept:"ผลิต",     active:true,  last_login:"17 พ.ค. 09:45" },
  { id:3,first:"วิชัย", last:"มานะ",   email:"wichai@freshcut.com",  role:"manager", dept:"ขาย",      active:true,  last_login:"17 พ.ค. 08:30" },
  { id:4,first:"มานี",  last:"สุขสม",  email:"manee@freshcut.com",   role:"user",    dept:"คลัง",     active:true,  last_login:"17 พ.ค. 07:55" },
  { id:5,first:"อนันต์",last:"ดีมาก",  email:"anan@freshcut.com",    role:"viewer",  dept:"บัญชี",    active:true,  last_login:"16 พ.ค. 16:30" },
  { id:6,first:"ลัดดา", last:"สว่าง",  email:"ladda@freshcut.com",   role:"user",    dept:"HR",       active:false, last_login:"10 พ.ค. 14:00" },
];

const ROLE_META = {
  admin:   { label:"Admin",   color:"#c0392b", bg:"#fdecea", tc:"#7a1a1a" },
  manager: { label:"Manager", color:"#2471a3", bg:"#e6f0fb", tc:"#1a4e8a" },
  user:    { label:"User",    color:"#1a7a4a", bg:"#e8f5ee", tc:"#1a6e3e" },
  viewer:  { label:"Viewer",  color:"#888780", bg:"#f1efe8", tc:"#5f5e5a" },
};

const CUSTOMERS = [
  { code:"C-001",name:"7-Eleven (DC)",   type:"Modern Trade",credit:30,monthly:450000 },
  { code:"C-002",name:"BigC กรุงเทพ",   type:"Modern Trade",credit:30,monthly:280000 },
  { code:"C-003",name:"Tops Market",    type:"Modern Trade",credit:45,monthly:190000 },
  { code:"C-004",name:"Villa Market",   type:"Specialty",   credit:30,monthly:120000 },
  { code:"C-005",name:"Makro ลาดพร้าว", type:"Modern Trade",credit:30,monthly:210000 },
  { code:"C-006",name:"โรงแรม Marriott",type:"HoReCa",      credit:15,monthly:85000  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const Badge = ({ children, color="gray" }) => {
  const map = {
    green:"#e8f5ee:#1a6e3e", red:"#fdecea:#962b2b", yellow:"#fff3e0:#7d4e00",
    blue:"#e6f0fb:#1a4e8a",  gray:"#f1efe8:#5f5e5a", purple:"#eeedfe:#3c3489",
  };
  const [bg, tc] = (map[color]||map.gray).split(":");
  return <span style={{display:"inline-flex",alignItems:"center",fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:500,background:bg,color:tc,whiteSpace:"nowrap"}}>{children}</span>;
};

const Toggle = ({ checked, onChange, disabled }) => (
  <label style={{position:"relative",width:34,height:19,display:"inline-block",flexShrink:0}}>
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} disabled={disabled}
      style={{opacity:0,width:0,height:0,position:"absolute"}}/>
    <span style={{position:"absolute",inset:0,background:checked?"#1a7a4a":"var(--color-border-tertiary)",borderRadius:20,cursor:disabled?"not-allowed":"pointer",transition:".2s",opacity:disabled?.4:1}}>
      <span style={{position:"absolute",width:13,height:13,left:checked?18:3,top:3,background:"#fff",borderRadius:"50%",transition:".2s"}}/>
    </span>
  </label>
);

const ProgressBar = ({ value, max, color="#1a7a4a" }) => (
  <div style={{background:"var(--color-border-tertiary)",borderRadius:3,height:6,overflow:"hidden"}}>
    <div style={{height:"100%",borderRadius:3,background:color,width:`${Math.min(100,(value/max)*100)}%`,transition:".3s"}}/>
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:16,...style}}>{children}</div>
);

const SectionTitle = ({ children, action }) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
    <span style={{fontSize:13,fontWeight:500}}>{children}</span>
    {action}
  </div>
);

const StatusOrder = ({ status }) => {
  const m = {pending:["yellow","รอจัดส่ง"],shipped:["green","จัดส่งแล้ว"],preparing:["blue","เตรียมของ"]};
  const [c, l] = m[status]||["gray",status];
  return <Badge color={c}>{l}</Badge>;
};

const statusWO = s => { const m={done:["green","เสร็จ"],running:["yellow","กำลังผลิต"],queue:["gray","รอคิว"]}; return m[s]||["gray",s]; };

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, collapsed, setCollapsed }) {
  const groups = [...new Set(MODULES.map(m=>m.group))];
  return (
    <div style={{
      width: collapsed ? 56 : 220,
      background:"var(--color-background-primary)",
      borderRight:"0.5px solid var(--color-border-tertiary)",
      display:"flex",flexDirection:"column",flexShrink:0,
      transition:"width .2s",overflow:"hidden",
    }}>
      <div style={{padding:"14px 12px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:10,minHeight:56}}>
        <div style={{width:32,height:32,background:"#1a7a4a",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <i className="ti ti-building-factory-2" style={{color:"#fff",fontSize:17}}/>
        </div>
        {!collapsed && <div>
          <div style={{fontSize:13,fontWeight:500,lineHeight:1.2}}>FreshCut ERP</div>
          <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>โรงงานแปรรูปผลไม้</div>
        </div>}
        <button onClick={()=>setCollapsed(!collapsed)}
          style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:"var(--color-text-tertiary)",padding:2,flexShrink:0}}>
          <i className={`ti ${collapsed?"ti-layout-sidebar-right-expand":"ti-layout-sidebar-right-collapse"}`} style={{fontSize:16}}/>
        </button>
      </div>
      <div style={{overflowY:"auto",flex:1,paddingBottom:8}}>
        {groups.map(g=>(
          <div key={g}>
            {!collapsed && <div style={{fontSize:10,color:"var(--color-text-tertiary)",padding:"10px 16px 3px",textTransform:"uppercase",letterSpacing:".07em"}}>{g}</div>}
            {MODULES.filter(m=>m.group===g).map(m=>(
              <div key={m.id} onClick={()=>setActive(m.id)}
                title={collapsed ? m.label : ""}
                style={{
                  display:"flex",alignItems:"center",gap:10,padding:"8px 14px",fontSize:13,cursor:"pointer",
                  color: active===m.id ? "#1a7a4a" : "var(--color-text-secondary)",
                  background: active===m.id ? "#e8f5ee" : "transparent",
                  borderLeft: `2px solid ${active===m.id?"#1a7a4a":"transparent"}`,
                  transition:".1s",whiteSpace:"nowrap",
                }}>
                <i className={`ti ${m.icon}`} style={{fontSize:16,flexShrink:0}}/>
                {!collapsed && <><span style={{flex:1}}>{m.label}</span>
                {m.badge && <span style={{background:"#e07b2a",color:"#fff",fontSize:10,padding:"0 5px",borderRadius:8}}>{m.badge}</span>}</>}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!collapsed && <div style={{padding:"10px 14px",borderTop:"0.5px solid var(--color-border-tertiary)",fontSize:10,color:"var(--color-text-tertiary)"}}>v3.0.0 · 17 พ.ค. 2568</div>}
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div>
      <div style={{background:"#fff8ee",border:"0.5px solid #f0c060",color:"#7a4e10",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <i className="ti ti-alert-triangle" style={{fontSize:16,flexShrink:0}}/>
        วัตถุดิบสับปะรด/เมลอน/มะยงชิด เหลือต่ำกว่า Safety Stock · SO-0051 Tops Market ขาดส่ง 240 ถาด
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {KPI_DATA.map((k,i)=>(
          <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:500}}>{k.value}</div>
            <div style={{fontSize:11,marginTop:3,color:k.up?"#1a7a4a":"#c0392b"}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card>
          <SectionTitle>คำสั่งซื้อล่าสุด</SectionTitle>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["เลขที่","ลูกค้า","มูลค่า","สถานะ"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"5px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
            ))}</tr></thead>
            <tbody>{ORDERS.slice(0,4).map(o=>(
              <tr key={o.so}><td style={{padding:"6px 8px"}}>{o.so.slice(-4)}</td><td style={{padding:"6px 8px"}}>{o.cust}</td>
              <td style={{padding:"6px 8px"}}>{o.val.toLocaleString()}</td><td style={{padding:"6px 8px"}}><StatusOrder status={o.status}/></td></tr>
            ))}</tbody>
          </table>
        </Card>
        <Card>
          <SectionTitle>สต็อกวัตถุดิบวิกฤต</SectionTitle>
          {RAW_MATERIALS.filter(r=>r.status==="low").map(r=>(
            <div key={r.code} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                <span>{r.name}</span><span style={{color:"#c0392b",fontWeight:500}}>{r.stock} {r.unit}</span>
              </div>
              <ProgressBar value={r.stock} max={r.safety*1.5} color="#c0392b"/>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>Safety: {r.safety} {r.unit} · หมดอายุ {r.expiry}</div>
            </div>
          ))}
          <div style={{marginTop:8,padding:"8px 12px",background:"#edf7f2",borderRadius:6,fontSize:11,color:"#1a5e3a"}}>
            <i className="ti ti-temperature-celsius" style={{marginRight:4}}/> Cold Room A: 4.1°C · B: 4.3°C · Packing: 8.2°C
          </div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <SectionTitle>ใบสั่งผลิตวันนี้</SectionTitle>
          {WO_LIST.slice(0,4).map(w=>{
            const [bc,bl]=statusWO(w.status);
            const pct=Math.round(w.done/w.target*100);
            return (
              <div key={w.wo} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                  <span style={{fontWeight:500}}>{w.wo}</span>
                  <Badge color={bc}>{bl}</Badge>
                </div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>{w.product} · Line {w.line}</div>
                <ProgressBar value={w.done} max={w.target} color={w.status==="done"?"#1a7a4a":w.status==="running"?"#e07b2a":"#888"}/>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>{w.done}/{w.target} ถาด ({pct}%)</div>
              </div>
            );
          })}
        </Card>
        <Card>
          <SectionTitle>Loss & Fill Rate วันนี้</SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["Loss Rate","8.4%","เป้า ≤8.0%","#c0392b"],["Fill Rate","91.4%","เป้า ≥95%","#b8680a"],
              ["Yield","91.6%","↑ 0.3%","#1a7a4a"],["OEE","82.4%","ดีกว่าเป้า","#1a7a4a"]].map(([l,v,s,c])=>(
              <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{l}</div>
                <div style={{fontSize:18,fontWeight:500,color:c}}>{v}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10}}>
            {SHORTFALLS.filter(s=>s.status!=="resolved").map(s=>(
              <div key={s.so} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11}}>
                <span style={{color:"var(--color-text-secondary)"}}>{s.cust} — {s.product}</span>
                <span style={{color:"#c0392b",fontWeight:500}}>ขาด {s.short} ถาด</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Inventory() {
  const [tab, setTab] = useState("raw");
  return (
    <div>
      <div style={{display:"flex",gap:0,borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:16}}>
        {[["raw","วัตถุดิบ"],["fg","สำเร็จรูป"]].map(([k,l])=>(
          <div key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",fontSize:13,cursor:"pointer",color:tab===k?"#1a7a4a":"var(--color-text-secondary)",borderBottom:`2px solid ${tab===k?"#1a7a4a":"transparent"}`,fontWeight:tab===k?500:400}}>{l}</div>
        ))}
      </div>
      <Card>
        <SectionTitle>{tab==="raw"?"รายการวัตถุดิบ":"สินค้าสำเร็จรูป"}
          <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
            <i className="ti ti-plus" style={{fontSize:13}}/> เพิ่มรายการ
          </button>
        </SectionTitle>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
          <thead><tr>{["รหัส","ชื่อ","คงเหลือ","หน่วย","Safety","หมดอายุ","สถานะ"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {tab==="raw" ? RAW_MATERIALS.map(r=>(
              <tr key={r.code}>
                <td style={{padding:"7px 8px",color:"var(--color-text-tertiary)"}}>{r.code}</td>
                <td style={{padding:"7px 8px",fontWeight:500}}>{r.name}</td>
                <td style={{padding:"7px 8px",color:r.status==="low"?"#c0392b":"inherit",fontWeight:r.status==="low"?500:400}}>{r.stock.toLocaleString()}</td>
                <td style={{padding:"7px 8px"}}>{r.unit}</td>
                <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{r.safety}</td>
                <td style={{padding:"7px 8px"}}>{r.expiry}</td>
                <td style={{padding:"7px 8px"}}><Badge color={r.status==="low"?"red":"green"}>{r.status==="low"?"ต่ำกว่าเกณฑ์":"ปกติ"}</Badge></td>
              </tr>
            )) : PRODUCTS.map(p=>{
              const margin = Math.round((p.price-p.cost)/p.price*100);
              return (
                <tr key={p.code}>
                  <td style={{padding:"7px 8px",color:"var(--color-text-tertiary)"}}>{p.code}</td>
                  <td style={{padding:"7px 8px",fontWeight:500}}>{p.name}</td>
                  <td style={{padding:"7px 8px",color:p.stock<p.safety?"#c0392b":"inherit"}}>{p.stock.toLocaleString()}</td>
                  <td style={{padding:"7px 8px"}}>ถาด</td>
                  <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{p.safety}</td>
                  <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{p.shelf} วัน</td>
                  <td style={{padding:"7px 8px"}}><Badge color={p.status==="active"?"green":"yellow"}>{p.status==="active"?"พร้อมขาย":"หมดชั่วคราว"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function Production() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["ใบสั่งผลิตวันนี้","6","4 เสร็จ · 2 กำลังผลิต"],["เป้าหมาย","3,200 กก.","88% สำเร็จ"],["Loss Rate","8.4%","ดีกว่าเป้า 10%"],["ชั่วโมงแรงงาน","142 ชม.","18 คน"]].map(([l,v,s])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <Card style={{marginBottom:16}}>
        <SectionTitle>ใบสั่งผลิต
          <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
            <i className="ti ti-plus" style={{fontSize:13}}/> สร้างใบสั่งผลิต
          </button>
        </SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["เลขที่","สินค้า","เป้าหมาย","ผลิตได้","% สำเร็จ","สาย","สถานะ"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{WO_LIST.map(w=>{
            const [bc,bl]=statusWO(w.status);
            const pct=Math.round(w.done/w.target*100);
            return (
              <tr key={w.wo}>
                <td style={{padding:"7px 8px",fontWeight:500}}>{w.wo}</td>
                <td style={{padding:"7px 8px"}}>{w.product}</td>
                <td style={{padding:"7px 8px"}}>{w.target.toLocaleString()}</td>
                <td style={{padding:"7px 8px"}}>{w.done.toLocaleString()}</td>
                <td style={{padding:"7px 8px",width:120}}>
                  <ProgressBar value={w.done} max={w.target} color={w.status==="done"?"#1a7a4a":w.status==="running"?"#e07b2a":"#888"}/>
                  <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>{pct}%</div>
                </td>
                <td style={{padding:"7px 8px"}}>Line {w.line}</td>
                <td style={{padding:"7px 8px"}}><Badge color={bc}>{bl}</Badge></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>
    </div>
  );
}

function QC() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["ตรวจวันนี้","24 ล็อต",""],["ผ่านเกณฑ์","22","91.7%"],["ไม่ผ่าน","2","รอทำลาย"],["อุณหภูมิเฉลี่ย","4.1°C","✓ ปกติ"]].map(([l,v,s],i)=>(
          <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500,color:i===2?"#c0392b":i===1?"#1a7a4a":"inherit"}}>{v}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <SectionTitle>บันทึก QC</SectionTitle>
          {[["ใบสั่งผลิต","select"],["อุณหภูมิ (°C)","number"],["สี/รูปลักษณ์","select"],["ผล QC","select"]].map(([l,t])=>(
            <div key={l} style={{marginBottom:10}}>
              <label style={{display:"block",fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{l}</label>
              {t==="select"?
                <select style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12}}>
                  <option>WO-0219 มะม่วงหั่น</option><option>WO-0220 แตงโม</option>
                </select>:
                <input type="number" defaultValue="4.2" style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12}}/>
              }
            </div>
          ))}
          <button style={{width:"100%",padding:"8px 0",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <i className="ti ti-clipboard-check" style={{fontSize:14}}/> บันทึกผล QC
          </button>
        </Card>
        <Card>
          <SectionTitle>ผล QC ล่าสุด</SectionTitle>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["ล็อต","สินค้า","อุณหภูมิ","ผล"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
            ))}</tr></thead>
            <tbody>{[["QC-1042","Fresh Cut Mix","4.0°C","pass"],["QC-1043","สับปะรดหั่น","4.2°C","pass"],["QC-1044","มะม่วงหั่น","5.8°C","fail"],["QC-1045","แตงโมหั่น","4.1°C","pass"]].map(([c,p,t,r])=>(
              <tr key={c}><td style={{padding:"7px 8px"}}>{c}</td><td style={{padding:"7px 8px"}}>{p}</td><td style={{padding:"7px 8px"}}>{t}</td><td style={{padding:"7px 8px"}}><Badge color={r==="pass"?"green":"red"}>{r==="pass"?"ผ่าน":"ไม่ผ่าน"}</Badge></td></tr>
            ))}</tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function LossPage() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["Loss Rate รวม","8.4%","เป้า ≤8%","#c0392b"],["น้ำหนักสูญเสีย","238 กก.","จาก 2,840 กก.","#c0392b"],["มูลค่าสูญเสีย","4,284 บ.","สัปดาห์นี้ 26,140 บ.","#b8680a"],["Yield Rate","91.6%","↑ 0.3% จากเมื่อวาน","#1a7a4a"]].map(([l,v,s,c])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500,color:c}}>{v}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <Card>
        <SectionTitle>การสูญเสียแยกตามผลไม้ (วันนี้)</SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["ผลไม้","รับมา (กก.)","ผลิตได้","สูญเสีย","Loss%","มูลค่าสูญ","เทียบเป้า"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{LOSS_RECORDS.map(r=>(
            <tr key={r.wo}>
              <td style={{padding:"7px 8px",fontWeight:500}}>{r.product}</td>
              <td style={{padding:"7px 8px"}}>{r.total}</td>
              <td style={{padding:"7px 8px"}}>{r.total-r.kg}</td>
              <td style={{padding:"7px 8px",color:"#c0392b",fontWeight:500}}>{r.kg} กก.</td>
              <td style={{padding:"7px 8px",color:r.rate>9?"#c0392b":r.rate>8?"#b8680a":"#1a7a4a",fontWeight:500}}>{r.rate}%</td>
              <td style={{padding:"7px 8px"}}>{(r.kg*20).toLocaleString()} บ.</td>
              <td style={{padding:"7px 8px"}}><Badge color={r.rate>8?"red":"green"}>{r.rate>8?"เกินเป้า":"ผ่านเป้า"}</Badge></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

function Orders() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["รอดำเนินการ","5",""],["จัดส่งวันนี้","3",""],["มูลค่ารอจัดส่ง","276,700 บ.",""],["เดือนนี้","48 ออเดอร์","↑ 15%"]].map(([l,v,s])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
            {s&&<div style={{fontSize:11,color:"#1a7a4a",marginTop:3}}>{s}</div>}
          </div>
        ))}
      </div>
      <Card>
        <SectionTitle>คำสั่งซื้อทั้งหมด
          <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
            <i className="ti ti-plus" style={{fontSize:13}}/> สร้างใบสั่งขาย
          </button>
        </SectionTitle>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
          <thead><tr>{["เลขที่ SO","ลูกค้า","วันสั่ง","กำหนดส่ง","มูลค่า","สถานะ","ดำเนินการ"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{ORDERS.map(o=>(
            <tr key={o.so}>
              <td style={{padding:"7px 8px",fontWeight:500}}>{o.so}</td>
              <td style={{padding:"7px 8px"}}>{o.cust}</td>
              <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{o.date}</td>
              <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{o.due}</td>
              <td style={{padding:"7px 8px",fontWeight:500}}>{o.val.toLocaleString()}</td>
              <td style={{padding:"7px 8px"}}><StatusOrder status={o.status}/></td>
              <td style={{padding:"7px 8px"}}>
                <button style={{padding:"3px 10px",background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,fontSize:11,cursor:"pointer",color:"var(--color-text-secondary)"}}>ดูรายละเอียด</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function Delivery() {
  return (
    <div>
      <div style={{background:"#fdecea",border:"0.5px solid #f5b7b1",color:"#962b2b",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <i className="ti ti-alert-circle" style={{fontSize:16,flexShrink:0}}/>
        SO-0051 Tops Market ขาดส่ง 240 ถาด · กำหนดส่งวันนี้ · ยังไม่แจ้งลูกค้า
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["Fill Rate","91.4%","เป้า ≥95%","#c0392b"],["ขาดส่ง","8 ออเดอร์","เดือนนี้","#c0392b"],["มูลค่าขาดส่ง","126,400 บ.","","#b8680a"],["เร่งด่วน","3 ออเดอร์","วันนี้-พรุ่งนี้","#c0392b"]].map(([l,v,s,c])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500,color:c}}>{v}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <Card>
        <SectionTitle>รายการขาดส่ง</SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["SO","ลูกค้า","สินค้า","ขาด (ถาด)","Fill%","สาเหตุ","สถานะ"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{SHORTFALLS.map(s=>(
            <tr key={s.so}>
              <td style={{padding:"7px 8px",fontWeight:500}}>{s.so}</td>
              <td style={{padding:"7px 8px"}}>{s.cust}</td>
              <td style={{padding:"7px 8px"}}>{s.product}</td>
              <td style={{padding:"7px 8px",color:"#c0392b",fontWeight:500}}>{s.short}</td>
              <td style={{padding:"7px 8px",color:s.fill>=95?"#1a7a4a":s.fill>=88?"#b8680a":"#c0392b",fontWeight:500}}>{s.fill}%</td>
              <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{s.cause}</td>
              <td style={{padding:"7px 8px"}}><Badge color={s.status==="urgent"?"red":s.status==="pending"?"yellow":"green"}>{s.status==="urgent"?"เร่งด่วน":s.status==="pending"?"รอดำเนินการ":"แก้ไขแล้ว"}</Badge></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

function Customers() {
  return (
    <Card>
      <SectionTitle>รายชื่อลูกค้า
        <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
          <i className="ti ti-plus" style={{fontSize:13}}/> เพิ่มลูกค้า
        </button>
      </SectionTitle>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["รหัส","ชื่อลูกค้า","ประเภท","ยอดซื้อ/เดือน","เครดิต (วัน)"].map(h=>(
          <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
        ))}</tr></thead>
        <tbody>{CUSTOMERS.map(c=>(
          <tr key={c.code}><td style={{padding:"7px 8px",color:"var(--color-text-tertiary)"}}>{c.code}</td>
          <td style={{padding:"7px 8px",fontWeight:500}}>{c.name}</td>
          <td style={{padding:"7px 8px"}}><Badge color={c.type==="HoReCa"?"yellow":c.type==="Specialty"?"green":"blue"}>{c.type}</Badge></td>
          <td style={{padding:"7px 8px",fontWeight:500}}>{c.monthly.toLocaleString()}</td>
          <td style={{padding:"7px 8px"}}>{c.credit}</td></tr>
        ))}</tbody>
      </table>
    </Card>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState(PRODUCTS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({code:"",name:"",cat:"fresh",price:"",cost:"",stock:"",safety:"",shelf:"",temp:"",status:"active"});
  const save = () => {
    if(!form.code||!form.name) return;
    setProducts([...products,{id:Date.now(),...form,price:+form.price,cost:+form.cost,stock:+form.stock,safety:+form.safety,shelf:+form.shelf}]);
    setShowAdd(false);
    setForm({code:"",name:"",cat:"fresh",price:"",cost:"",stock:"",safety:"",shelf:"",temp:"",status:"active"});
  };
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["สินค้าทั้งหมด",products.length,""],["พร้อมขาย",products.filter(p=>p.status==="active").length,"Active"],["หมดชั่วคราว",products.filter(p=>p.status==="oos").length,"OOS"],["Fresh Cut",products.filter(p=>p.cat==="fresh").length,"รายการ"]].map(([l,v,s])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      {showAdd && (
        <Card style={{marginBottom:16,border:"2px solid #1a7a4a"}}>
          <SectionTitle>เพิ่มสินค้าใหม่
            <button onClick={()=>setShowAdd(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--color-text-tertiary)",fontSize:16}}><i className="ti ti-x"/></button>
          </SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[["รหัสสินค้า","code"],["ชื่อสินค้า","name"],["ราคาขาย (บ.)","price"],["ต้นทุน (บ.)","cost"],["สต็อก (ถาด)","stock"],["Safety Stock","safety"],["อายุ (วัน)","shelf"],["อุณหภูมิ","temp"]].map(([l,k])=>(
              <div key={k}>
                <label style={{display:"block",fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{l}</label>
                <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}
                  style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12,boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowAdd(false)} style={{padding:"7px 14px",background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>ยกเลิก</button>
            <button onClick={save} style={{padding:"7px 14px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>บันทึกสินค้า</button>
          </div>
        </Card>
      )}
      <Card>
        <SectionTitle>รายการสินค้าทั้งหมด
          <button onClick={()=>setShowAdd(true)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
            <i className="ti ti-plus" style={{fontSize:13}}/> เพิ่มสินค้า
          </button>
        </SectionTitle>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
          <thead><tr>{["รหัส","ชื่อสินค้า","หมวด","ราคา","ต้นทุน","Margin","สต็อก","สถานะ"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{products.map(p=>{
            const margin=p.price>0?Math.round((p.price-p.cost)/p.price*100):0;
            return (
              <tr key={p.id}>
                <td style={{padding:"7px 8px",color:"var(--color-text-tertiary)"}}>{p.code}</td>
                <td style={{padding:"7px 8px",fontWeight:500}}>{p.name}</td>
                <td style={{padding:"7px 8px"}}><Badge color={p.cat==="frozen"?"blue":"green"}>{p.cat==="frozen"?"แช่แข็ง":"Fresh Cut"}</Badge></td>
                <td style={{padding:"7px 8px",fontWeight:500}}>{p.price} บ.</td>
                <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{p.cost} บ.</td>
                <td style={{padding:"7px 8px",color:margin>=30?"#1a7a4a":margin>=20?"#b8680a":"#c0392b",fontWeight:500}}>{margin}%</td>
                <td style={{padding:"7px 8px",color:p.stock<p.safety?"#c0392b":"inherit"}}>{p.stock.toLocaleString()}</td>
                <td style={{padding:"7px 8px"}}><Badge color={p.status==="active"?"green":"yellow"}>{p.status==="active"?"พร้อมขาย":"หมดชั่วคราว"}</Badge></td>
              </tr>
            );
          })}</tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function Finance() {
  const [tab,setTab]=useState("summary");
  return (
    <div>
      <div style={{display:"flex",gap:0,borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:16}}>
        {[["summary","สรุป"],["ap","AP"],["ar","AR"]].map(([k,l])=>(
          <div key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",fontSize:13,cursor:"pointer",color:tab===k?"#1a4e8a":"var(--color-text-secondary)",borderBottom:`2px solid ${tab===k?"#1a4e8a":"transparent"}`,fontWeight:tab===k?500:400}}>{l}</div>
        ))}
      </div>
      {tab==="summary" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {[["รายได้เดือนนี้","1,240,000","↑ 8.3%"],["ต้นทุนวัตถุดิบ","682,000","55%"],["กำไรขั้นต้น","558,000","45% margin"],["กำไรสุทธิ","186,000","15%"]].map(([l,v,s])=>(
              <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
                <div style={{fontSize:20,fontWeight:500}}>{v}</div>
                <div style={{fontSize:11,color:"#1a7a4a",marginTop:3}}>{s}</div>
              </div>
            ))}
          </div>
          <Card>
            <SectionTitle>ค่าใช้จ่ายแยกตามหมวด</SectionTitle>
            {[["วัตถุดิบ",682000,55],["แรงงาน",248000,20],["บรรจุภัณฑ์",74400,6],["ค่าไฟ/Cold Room",49600,4],["อื่นๆ",186000,15]].map(([l,v,p])=>(
              <div key={l} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                  <span>{l}</span><span style={{fontWeight:500}}>{v.toLocaleString()} <span style={{color:"var(--color-text-tertiary)",fontSize:11}}>({p}%)</span></span>
                </div>
                <ProgressBar value={p} max={60} color={p>40?"#c0392b":p>15?"#e07b2a":"#1a7a4a"}/>
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab==="ap" && <Card><SectionTitle>เจ้าหนี้การค้า</SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["ผู้จำหน่าย","จำนวน (บ.)","ครบกำหนด","สถานะ"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>)}</tr></thead>
          <tbody>{[["สวนจำเริญ ตราด",48000,"20 พ.ค.","pending"],["กลุ่มเกษตร เชียงใหม่",32500,"22 พ.ค.","pending"],["บริษัท ABC บรรจุภัณฑ์",18200,"15 พ.ค.","overdue"]].map(([s,v,d,st])=>(
            <tr key={s}><td style={{padding:"7px 8px"}}>{s}</td><td style={{padding:"7px 8px",fontWeight:500}}>{v.toLocaleString()}</td><td style={{padding:"7px 8px"}}>{d}</td><td style={{padding:"7px 8px"}}><Badge color={st==="overdue"?"red":"yellow"}>{st==="overdue"?"เกินกำหนด":"รอชำระ"}</Badge></td></tr>
          ))}</tbody>
        </table>
      </Card>}
      {tab==="ar" && <Card><SectionTitle>ลูกหนี้การค้า</SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["ลูกค้า","จำนวน (บ.)","ครบกำหนด","สถานะ"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>)}</tr></thead>
          <tbody>{[["7-Eleven DC",125000,"14 มิ.ย.","ok"],["BigC กรุงเทพ",72500,"16 มิ.ย.","ok"],["Tops Market",95000,"1 มิ.ย.","ok"]].map(([c,v,d,st])=>(
            <tr key={c}><td style={{padding:"7px 8px"}}>{c}</td><td style={{padding:"7px 8px",fontWeight:500}}>{v.toLocaleString()}</td><td style={{padding:"7px 8px"}}>{d}</td><td style={{padding:"7px 8px"}}><Badge color="green">ปกติ</Badge></td></tr>
          ))}</tbody>
        </table>
      </Card>}
    </div>
  );
}

function HR() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["พนักงานทั้งหมด","42 คน",""],["มาวันนี้","38 คน","ขาด 2 · ลา 2"],["OT เดือนนี้","284 ชม.",""],["เงินเดือน/เดือน","248,000","บาท"]].map(([l,v,s])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>
      <Card>
        <SectionTitle>รายชื่อพนักงาน</SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["รหัส","ชื่อ","แผนก","ตำแหน่ง","สถานะ","OT (ชม.)"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{[["EMP-001","สมชาย ใจดี","ผลิต","หัวหน้าสาย A","present",4],["EMP-002","สมหญิง รักงาน","QC","เจ้าหน้าที่ QC","present",2],["EMP-003","วิชัย มานะ","คลัง","พนักงานคลัง","leave",0],["EMP-004","มานี สุขสม","ผลิต","พนักงานสาย B","present",2],["EMP-005","ประยุทธ ทำดี","จัดส่ง","พนักงานขับรถ","absent",0]].map(([c,n,d,p,s,o])=>(
            <tr key={c}><td style={{padding:"7px 8px",color:"var(--color-text-tertiary)"}}>{c}</td><td style={{padding:"7px 8px",fontWeight:500}}>{n}</td><td style={{padding:"7px 8px"}}>{d}</td><td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{p}</td>
            <td style={{padding:"7px 8px"}}><Badge color={s==="present"?"green":s==="leave"?"yellow":"red"}>{s==="present"?"มาทำงาน":s==="leave"?"ลากิจ":"ขาดงาน"}</Badge></td>
            <td style={{padding:"7px 8px"}}>{o}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

function Reports() {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card>
          <SectionTitle>ประสิทธิภาพการผลิต</SectionTitle>
          {[["OEE","82.4%"],["Yield Rate","91.6%"],["Loss Rate เฉลี่ย","8.4%"],["กำลังผลิต Line A","95%"],["กำลังผลิต Line B","78%"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:12}}>
              <span style={{color:"var(--color-text-secondary)"}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>ยอดขายตามลูกค้า</SectionTitle>
          {[["7-Eleven DC",450000],["BigC",280000],["Makro",210000],["Tops Market",190000],["อื่นๆ",110000]].map(([n,v])=>(
            <div key={n} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                <span>{n}</span><span style={{fontWeight:500}}>{v.toLocaleString()} บ.</span>
              </div>
              <ProgressBar value={v} max={500000} color="#1a4e8a"/>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <SectionTitle>Export รายงาน</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {["รายงานการผลิตรายวัน (.xlsx)","รายงานสต็อกวัตถุดิบ (.xlsx)","รายงานยอดขายประจำเดือน (.pdf)","รายงานการสูญเสีย (.pdf)","รายงานการขาดส่ง (.pdf)","สรุปบัญชีการเงิน (.pdf)"].map(r=>(
            <button key={r} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)",textAlign:"left"}}>
              <i className={`ti ${r.includes("xlsx")?"ti-file-spreadsheet":"ti-file-text"}`} style={{fontSize:14,color:"#1a4e8a"}}/>{r}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function UsersPage() {
  const [users, setUsers] = useState(USERS_DATA);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({first:"",last:"",email:"",role:"user",dept:"ผลิต",active:true});
  const save = () => {
    if(!form.first||!form.email) return;
    setUsers([...users,{id:Date.now(),...form,last_login:"ยังไม่เคยเข้า"}]);
    setShowAdd(false);
    setForm({first:"",last:"",email:"",role:"user",dept:"ผลิต",active:true});
  };
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["ทั้งหมด",users.length,""],["Admin",users.filter(u=>u.role==="admin").length,""],["Manager",users.filter(u=>u.role==="manager").length,""],["User/Viewer",users.filter(u=>u.role==="user"||u.role==="viewer").length,""]].map(([l,v,s])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      {showAdd && (
        <Card style={{marginBottom:16,border:"2px solid #1a4e8a"}}>
          <SectionTitle>เพิ่มผู้ใช้งานใหม่
            <button onClick={()=>setShowAdd(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--color-text-tertiary)",fontSize:16}}><i className="ti ti-x"/></button>
          </SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[["ชื่อ","first"],["นามสกุล","last"],["อีเมล","email"]].map(([l,k])=>(
              <div key={k}>
                <label style={{display:"block",fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{l}</label>
                <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12,boxSizing:"border-box"}}/>
              </div>
            ))}
            <div>
              <label style={{display:"block",fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>บทบาท</label>
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12}}>
                <option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option><option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowAdd(false)} style={{padding:"7px 14px",background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>ยกเลิก</button>
            <button onClick={save} style={{padding:"7px 14px",background:"#1a4e8a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>บันทึก</button>
          </div>
        </Card>
      )}
      <Card>
        <SectionTitle>ผู้ใช้งานทั้งหมด
          <button onClick={()=>setShowAdd(true)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#1a4e8a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
            <i className="ti ti-user-plus" style={{fontSize:13}}/> เพิ่มผู้ใช้งาน
          </button>
        </SectionTitle>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["","ชื่อ","อีเมล","บทบาท","แผนก","สถานะ","เข้าล่าสุด"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{users.map(u=>{
            const rm=ROLE_META[u.role];
            return (
              <tr key={u.id} style={{opacity:u.active?1:0.5}}>
                <td style={{padding:"7px 8px"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:rm.bg,color:rm.tc,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500}}>{u.first[0]+u.last[0]}</div>
                </td>
                <td style={{padding:"7px 8px",fontWeight:500}}>{u.first} {u.last}</td>
                <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{u.email}</td>
                <td style={{padding:"7px 8px"}}><Badge color={u.role==="admin"?"red":u.role==="manager"?"blue":u.role==="user"?"green":"gray"}>{rm.label}</Badge></td>
                <td style={{padding:"7px 8px",color:"var(--color-text-secondary)"}}>{u.dept}</td>
                <td style={{padding:"7px 8px"}}>
                  <Toggle checked={u.active} onChange={v=>setUsers(users.map(x=>x.id===u.id?{...x,active:v}:x))}/>
                </td>
                <td style={{padding:"7px 8px",fontSize:11,color:"var(--color-text-tertiary)"}}>{u.last_login}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>
    </div>
  );
}

function FinanceACL() {
  const FIN_SUBS=[
    {k:"dashboard_fin",l:"ภาพรวมการเงิน"},{k:"ar",l:"ลูกหนี้ (AR)"},{k:"ap",l:"เจ้าหนี้ (AP)"},
    {k:"payment",l:"ชำระเจ้าหนี้"},{k:"invoice",l:"ออกใบแจ้งหนี้"},{k:"budget",l:"งบประมาณ"},
    {k:"gl",l:"บัญชีแยกประเภท GL"},{k:"costsheet",l:"ต้นทุนการผลิต"},{k:"tax",l:"ภาษี/VAT"},
    {k:"report_fin",l:"รายงานการเงิน"},{k:"cashflow",l:"กระแสเงินสด"},
  ];
  const ACTS=["ดู","บันทึก","แก้ไข","ลบ","อนุมัติ","Export"];
  const initPerms = () => ({
    admin: Object.fromEntries(FIN_SUBS.map(m=>[m.k,[true,true,true,true,true,true]])),
    manager: Object.fromEntries(FIN_SUBS.map(m=>[m.k,["dashboard_fin","ar","report_fin","cashflow"].includes(m.k)?[true,false,false,false,false,true]:[true,true,true,false,true,true]])),
    user: Object.fromEntries(FIN_SUBS.map(m=>[m.k,["dashboard_fin","ar","ap"].includes(m.k)?[true,true,false,false,false,false]:["report_fin","cashflow"].includes(m.k)?[true,false,false,false,false,false]:[false,false,false,false,false,false]])),
    viewer: Object.fromEntries(FIN_SUBS.map(m=>[m.k,["dashboard_fin","report_fin"].includes(m.k)?[true,false,false,false,false,false]:[false,false,false,false,false,false]])),
  });
  const [perms,setPerms]=useState(initPerms);
  const [selRole,setSelRole]=useState("manager");
  const [saved,setSaved]=useState(false);
  const toggle=(role,mod,idx,val)=>{
    setPerms(p=>({...p,[role]:{...p[role],[mod]:p[role][mod].map((v,i)=>i===idx?val:v)}}));
    setSaved(false);
  };
  const rm=ROLE_META[selRole];
  return (
    <div>
      <div style={{background:"#fff8ee",border:"0.5px solid #f0c060",color:"#7a4e10",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <i className="ti ti-alert-triangle" style={{fontSize:16,flexShrink:0}}/>
        การเปลี่ยนแปลงสิทธิ์จะมีผลทันทีกับผู้ใช้ในระบบ — ตรวจสอบก่อนบันทึก
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {Object.entries(ROLE_META).map(([k,r])=>(
          <div key={k} onClick={()=>setSelRole(k)} style={{padding:"8px 16px",borderRadius:20,fontSize:12,cursor:"pointer",border:`0.5px solid ${selRole===k?r.color:"var(--color-border-tertiary)"}`,background:selRole===k?r.bg:"transparent",color:selRole===k?r.tc:"var(--color-text-secondary)",fontWeight:selRole===k?500:400,display:"flex",alignItems:"center",gap:6}}>
            <i className="ti ti-user-check" style={{fontSize:13}}/>{r.label}
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
        <Card>
          <SectionTitle style={{color:rm.color}}>{rm.label} — กำหนดสิทธิ์โมดูลการเงิน</SectionTitle>
          {FIN_SUBS.map(m=>{
            const p=perms[selRole][m.k]||[];
            return (
              <div key={m.k} style={{marginBottom:10,background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>{m.l}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                  {ACTS.map((a,i)=>(
                    <div key={a} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-primary)",borderRadius:6,padding:"5px 8px",border:`0.5px solid ${p[i]?rm.color:"var(--color-border-tertiary)"}`}}>
                      <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{a}</span>
                      <Toggle checked={!!p[i]} onChange={v=>toggle(selRole,m.k,i,v)} disabled={selRole==="admin"}/>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {selRole!=="admin" && (
            <button onClick={()=>setSaved(true)} style={{width:"100%",padding:"9px 0",background:rm.color,color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:4}}>
              <i className="ti ti-device-floppy" style={{fontSize:14}}/>{saved?"บันทึกแล้ว ✓":"บันทึกสิทธิ์ "+rm.label}
            </button>
          )}
        </Card>
        <Card>
          <SectionTitle>สรุปสิทธิ์</SectionTitle>
          {FIN_SUBS.map(m=>{
            const cnt=(perms[selRole][m.k]||[]).filter(Boolean).length;
            return (
              <div key={m.k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:12}}>
                <span style={{color:"var(--color-text-secondary)",fontSize:11}}>{m.l}</span>
                <span style={{fontWeight:500,color:cnt===0?"var(--color-text-tertiary)":cnt>=4?rm.color:"#b8680a",fontSize:11}}>{cnt===0?"ไม่มีสิทธิ์":cnt===6?"เต็ม":cnt+"/6"}</span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ─── DOCUMENT IMPORT ─────────────────────────────────────────────────────────

const DOC_TYPES = [
  { key:"po",       label:"ใบสั่งซื้อ (PO)",           icon:"ti-file-invoice",    target:"orders",    fields:["เลขที่ PO","ผู้จำหน่าย","วันที่","มูลค่า (บ.)","รายการสินค้า","หมายเหตุ"] },
  { key:"so",       label:"ใบสั่งขาย (SO)",            icon:"ti-shopping-cart",   target:"orders",    fields:["เลขที่ SO","ลูกค้า","วันที่","กำหนดส่ง","มูลค่า (บ.)","รายการสินค้า"] },
  { key:"grn",      label:"ใบรับสินค้า (GRN)",         icon:"ti-truck-delivery",  target:"receiving", fields:["เลขที่ GRN","อ้างอิง PO","ผู้จำหน่าย","วันที่รับ","น้ำหนัก (กก.)","หมายเหตุ"] },
  { key:"invoice",  label:"ใบแจ้งหนี้ / Invoice",      icon:"ti-receipt",         target:"finance",   fields:["เลขที่ Invoice","ผู้ออก","วันที่","วันครบกำหนด","จำนวนเงิน (บ.)","ภาษี (บ.)"] },
  { key:"payment",  label:"ใบสำคัญจ่าย",              icon:"ti-cash",            target:"finance",   fields:["เลขที่จ่าย","ผู้รับเงิน","วันที่","จำนวนเงิน (บ.)","ธนาคาร","หมายเหตุ"] },
  { key:"dn",       label:"ใบส่งของ / Delivery Note",  icon:"ti-clipboard-check", target:"delivery",  fields:["เลขที่ DN","อ้างอิง SO","ลูกค้า","วันที่ส่ง","จำนวน (ถาด)","พนักงานขับรถ"] },
  { key:"wo",       label:"ใบสั่งผลิต (WO)",           icon:"ti-clipboard-list",  target:"production",fields:["เลขที่ WO","สินค้า","เป้าหมาย (ถาด)","วันที่","สายผลิต","หมายเหตุ"] },
  { key:"qc_report",label:"ผล QC / ใบตรวจสอบ",        icon:"ti-shield-check",    target:"qc",        fields:["เลขที่ QC","อ้างอิง WO","ผลไม้","อุณหภูมิ (°C)","น้ำหนักตรวจ","ผล QC"] },
  { key:"stockadj", label:"ใบปรับปรุงสต็อก",          icon:"ti-package",         target:"inventory", fields:["เลขที่ปรับ","รายการ","จำนวนเดิม","จำนวนใหม่","เหตุผล","ผู้อนุมัติ"] },
];

const IMPORT_HISTORY = [
  { id:"IMP-0041",type:"ใบสั่งซื้อ (PO)",  file:"PO_2568_0118.pdf",   date:"17 พ.ค. 10:05",user:"สมศรี",  rows:3,  status:"success", target:"orders"    },
  { id:"IMP-0040",type:"ใบส่งของ (DN)",    file:"DN_BigC_0050.xlsx",   date:"17 พ.ค. 08:30",user:"วิชัย",  rows:5,  status:"success", target:"delivery"  },
  { id:"IMP-0039",type:"ใบแจ้งหนี้",       file:"INV_Supplier_88.pdf", date:"16 พ.ค. 15:20",user:"สมศรี",  rows:1,  status:"warning", target:"finance"   },
  { id:"IMP-0038",type:"ใบรับสินค้า (GRN)",file:"GRN_20250516.xlsx",   date:"16 พ.ค. 09:10",user:"มานี",   rows:4,  status:"success", target:"receiving" },
  { id:"IMP-0037",type:"ผล QC",            file:"QC_Report_May16.csv", date:"15 พ.ค. 16:45",user:"สมหญิง", rows:12, status:"success", target:"qc"        },
  { id:"IMP-0036",type:"ใบสั่งผลิต (WO)",  file:"WO_batch_0517.csv",   date:"15 พ.ค. 08:00",user:"สมชาย", rows:6,  status:"error",   target:"production"},
];

function DocImport() {
  const [tab, setTab]           = useState("upload");
  const [selType, setSelType]   = useState("po");
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles]       = useState([]);
  const [manualRows, setManualRows] = useState([{}]);
  const [previewData, setPreviewData] = useState(null);
  const [importDone, setImportDone]   = useState(false);
  const [history, setHistory]   = useState(IMPORT_HISTORY);
  const fileRef = useRef();

  const docType = DOC_TYPES.find(d=>d.key===selType)||DOC_TYPES[0];

  const handleFiles = (fl) => {
    const arr = Array.from(fl).map(f=>({
      name:f.name, size:f.size, type:f.type||"unknown",
      status:"ready", rows: Math.floor(Math.random()*8)+1,
    }));
    setFiles(arr);
    setPreviewData(null);
    setImportDone(false);
  };

  const simulateParse = () => {
    const rows = Array.from({length: files[0]?.rows||3}, (_,i)=>
      Object.fromEntries(docType.fields.map((f,j)=>[f, demoVal(f,i,j)]))
    );
    setPreviewData(rows);
  };

  const demoVal = (field, row, col) => {
    if(field.includes("เลขที่")||field.includes("อ้างอิง")) return `REF-${2568}-${String(row+1).padStart(4,"0")}`;
    if(field.includes("วันที่")) return `${17+row} พ.ค. 2568`;
    if(field.includes("มูลค่า")||field.includes("จำนวนเงิน")) return ((row+1)*12500).toLocaleString();
    if(field.includes("น้ำหนัก")||field.includes("จำนวน")||field.includes("เป้าหมาย")) return String((row+1)*120);
    if(field.includes("อุณหภูมิ")) return `${(3.8+row*0.3).toFixed(1)}`;
    if(field.includes("ผู้จำหน่าย")||field.includes("ผู้ออก")) return ["สวนจำเริญ ตราด","กลุ่มเกษตร เชียงใหม่","บริษัท ABC"][row%3];
    if(field.includes("ลูกค้า")) return ["Tops Market","BigC","7-Eleven DC"][row%3];
    if(field.includes("สินค้า")||field.includes("รายการ")) return ["ลำไยคว้านเมล็ด 100g","สับปะรดภูแลตัดแต่ง 100g","Fresh Cut Mix 250g"][row%3];
    if(field.includes("ผล QC")) return row%4===2?"ไม่ผ่าน":"ผ่าน";
    if(field.includes("สายผลิต")) return `Line ${["A","B","C"][row%3]}`;
    if(field.includes("ธนาคาร")) return ["กสิกรไทย","ไทยพาณิชย์","กรุงไทย"][row%3];
    if(field.includes("ผู้อนุมัติ")||field.includes("พนักงาน")) return ["สมชาย ใจดี","สมศรี รักงาน"][row%2];
    if(field.includes("ภาษี")) return String(Math.round((row+1)*875));
    if(field.includes("หมายเหตุ")||field.includes("เหตุผล")) return "-";
    return `ข้อมูล ${row+1}`;
  };

  const doImport = () => {
    const newEntry = {
      id:`IMP-${String(history.length+42).padStart(4,"0")}`,
      type:docType.label, file:files[0]?.name||"manual_input.csv",
      date:`17 พ.ค. ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2,"0")}`,
      user:"สมชาย", rows:previewData?.length||manualRows.length,
      status:"success", target:docType.target,
    };
    setHistory([newEntry,...history]);
    setImportDone(true);
    setFiles([]);
    setPreviewData(null);
  };

  const S = { // shorthand styles
    tab: (k) => ({padding:"8px 16px",fontSize:13,cursor:"pointer",
      color:tab===k?"#1a7a4a":"var(--color-text-secondary)",
      borderBottom:`2px solid ${tab===k?"#1a7a4a":"transparent"}`,fontWeight:tab===k?500:400}),
    typeCard: (k) => ({border:`0.5px solid ${selType===k?"#1a7a4a":"var(--color-border-tertiary)"}`,
      borderRadius:10,padding:"10px 12px",cursor:"pointer",transition:".15s",
      background:selType===k?"#e8f5ee":"var(--color-background-primary)",
      display:"flex",alignItems:"center",gap:10}),
  };

  return (
    <div>
      {/* Tab bar */}
      <div style={{display:"flex",gap:0,borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:16}}>
        {[["upload","อัพโหลดไฟล์"],["manual","กรอกด้วยตนเอง"],["history","ประวัตินำเข้า"],["mapping","Template & Mapping"]].map(([k,l])=>(
          <div key={k} onClick={()=>setTab(k)} style={S.tab(k)}>{l}</div>
        ))}
      </div>

      {/* ── UPLOAD TAB ── */}
      {tab==="upload" && (
        <div>
          <div style={{background:"#e6f0fb",border:"0.5px solid #b5d4f4",color:"#1a4e8a",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
            <i className="ti ti-info-circle" style={{fontSize:16,flexShrink:0,marginTop:1}}/>
            <div>รองรับไฟล์ <b>PDF, Excel (.xlsx/.xls), CSV</b> จากทุกระบบ — ระบบจะแยกแยะข้อมูลอัตโนมัติและแสดง Preview ก่อนนำเข้า</div>
          </div>

          {/* Step 1: เลือกประเภทเอกสาร */}
          <Card style={{marginBottom:16}}>
            <SectionTitle>ขั้นที่ 1 — เลือกประเภทเอกสาร</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {DOC_TYPES.map(d=>(
                <div key={d.key} onClick={()=>{setSelType(d.key);setPreviewData(null);setFiles([]);setImportDone(false);}} style={S.typeCard(d.key)}>
                  <div style={{width:34,height:34,borderRadius:8,background:selType===d.key?"#1a7a4a18":"var(--color-background-secondary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <i className={`ti ${d.icon}`} style={{fontSize:17,color:selType===d.key?"#1a7a4a":"var(--color-text-secondary)"}}/>
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:selType===d.key?500:400,color:selType===d.key?"#1a7a4a":"var(--color-text-primary)"}}>{d.label}</div>
                    <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>→ {d.target}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Step 2: อัพโหลดไฟล์ */}
          <Card style={{marginBottom:16}}>
            <SectionTitle>ขั้นที่ 2 — อัพโหลดไฟล์ {docType.label}</SectionTitle>
            {/* Dropzone */}
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
              onClick={()=>fileRef.current?.click()}
              style={{border:`2px dashed ${dragOver?"#1a7a4a":"var(--color-border-tertiary)"}`,borderRadius:10,padding:"32px 20px",textAlign:"center",cursor:"pointer",background:dragOver?"#e8f5ee":"var(--color-background-secondary)",transition:".15s",marginBottom:14}}>
              <i className="ti ti-cloud-upload" style={{fontSize:36,color:dragOver?"#1a7a4a":"var(--color-text-tertiary)",display:"block",marginBottom:10}}/>
              <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>รองรับ PDF, Excel (.xlsx, .xls), CSV · ขนาดไม่เกิน 20MB</div>
              <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            </div>

            {/* ไฟล์ที่เลือก */}
            {files.length>0 && (
              <div style={{marginBottom:14}}>
                {files.map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:6}}>
                    <i className={`ti ${f.name.endsWith(".pdf")?"ti-file-type-pdf":f.name.endsWith(".csv")?"ti-file-type-csv":"ti-file-spreadsheet"}`} style={{fontSize:20,color:f.name.endsWith(".pdf")?"#c0392b":f.name.endsWith(".csv")?"#1a7a4a":"#2471a3",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                      <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{(f.size/1024).toFixed(1)} KB · ตรวจพบ {f.rows} แถวข้อมูล</div>
                    </div>
                    <Badge color="green">พร้อมนำเข้า</Badge>
                    <button onClick={e=>{e.stopPropagation();setFiles(files.filter((_,j)=>j!==i));}} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--color-text-tertiary)",padding:2}}>
                      <i className="ti ti-x" style={{fontSize:14}}/>
                    </button>
                  </div>
                ))}
                <button onClick={simulateParse} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"#1a4e8a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
                  <i className="ti ti-scan" style={{fontSize:14}}/> วิเคราะห์และ Preview ข้อมูล
                </button>
              </div>
            )}

            {/* Preview ข้อมูล */}
            {previewData && (
              <div style={{marginTop:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <i className="ti ti-table" style={{fontSize:14,color:"#1a7a4a"}}/>
                  <span style={{fontSize:13,fontWeight:500}}>ตัวอย่างข้อมูลที่ตรวจพบ ({previewData.length} แถว)</span>
                </div>
                <div style={{overflowX:"auto",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:500}}>
                    <thead>
                      <tr style={{background:"var(--color-background-secondary)"}}>
                        <th style={{padding:"6px 10px",textAlign:"left",fontWeight:500,fontSize:11,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>#</th>
                        {docType.fields.map(f=>(
                          <th key={f} style={{padding:"6px 10px",textAlign:"left",fontWeight:500,fontSize:11,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{f}</th>
                        ))}
                        <th style={{padding:"6px 10px",textAlign:"left",fontWeight:500,fontSize:11,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>ตรวจสอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row,i)=>(
                        <tr key={i} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                          <td style={{padding:"6px 10px",color:"var(--color-text-tertiary)"}}>{i+1}</td>
                          {docType.fields.map(f=>(
                            <td key={f} style={{padding:"6px 10px",whiteSpace:"nowrap"}}>{row[f]}</td>
                          ))}
                          <td style={{padding:"6px 10px"}}>
                            <Badge color={i%5===2?"yellow":"green"}>{i%5===2?"ตรวจสอบ":"ผ่าน ✓"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
                  <div style={{flex:1,padding:"8px 12px",background:"#edf7f2",border:"0.5px solid #7ccca0",borderRadius:8,fontSize:12,color:"#1a5e3a"}}>
                    <i className="ti ti-check" style={{marginRight:6}}/> ตรวจสอบแล้ว {previewData.filter((_,i)=>i%5!==2).length}/{previewData.length} แถว · {previewData.filter((_,i)=>i%5===2).length} แถวต้องตรวจสอบเพิ่ม
                  </div>
                  <button onClick={doImport} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:500}}>
                    <i className="ti ti-database-import" style={{fontSize:15}}/> นำเข้าสู่ระบบ
                  </button>
                </div>
              </div>
            )}

            {importDone && (
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#edf7f2",border:"0.5px solid #7ccca0",borderRadius:8,marginTop:12,fontSize:13,color:"#1a5e3a"}}>
                <i className="ti ti-circle-check" style={{fontSize:20,flexShrink:0}}/>
                <div><b>นำเข้าสำเร็จ!</b> ข้อมูลถูกบันทึกลงโมดูล <b>{docType.target}</b> เรียบร้อยแล้ว</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MANUAL TAB ── */}
      {tab==="manual" && (
        <div>
          <Card style={{marginBottom:16}}>
            <SectionTitle>เลือกประเภทเอกสาร</SectionTitle>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {DOC_TYPES.map(d=>(
                <div key={d.key} onClick={()=>{setSelType(d.key);setManualRows([{}]);setImportDone(false);}}
                  style={{padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",border:`0.5px solid ${selType===d.key?"#1a7a4a":"var(--color-border-tertiary)"}`,background:selType===d.key?"#e8f5ee":"transparent",color:selType===d.key?"#1a7a4a":"var(--color-text-secondary)",fontWeight:selType===d.key?500:400}}>
                  {d.label}
                </div>
              ))}
            </div>
          </Card>
          <Card style={{marginBottom:16}}>
            <SectionTitle>{docType.label} — กรอกข้อมูล
              <button onClick={()=>setManualRows([...manualRows,{}])} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:11,cursor:"pointer"}}>
                <i className="ti ti-plus" style={{fontSize:12}}/> เพิ่มแถว
              </button>
            </SectionTitle>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}>
                <thead>
                  <tr style={{background:"var(--color-background-secondary)"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",fontWeight:500,fontSize:11,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>#</th>
                    {docType.fields.map(f=>(
                      <th key={f} style={{padding:"6px 8px",textAlign:"left",fontWeight:500,fontSize:11,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{f}</th>
                    ))}
                    <th style={{padding:"6px 8px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}></th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row,ri)=>(
                    <tr key={ri} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                      <td style={{padding:"5px 8px",color:"var(--color-text-tertiary)",fontSize:11}}>{ri+1}</td>
                      {docType.fields.map(f=>(
                        <td key={f} style={{padding:"4px 6px"}}>
                          <input
                            value={row[f]||""}
                            onChange={e=>setManualRows(manualRows.map((r,i)=>i===ri?{...r,[f]:e.target.value}:r))}
                            placeholder={f}
                            style={{width:"100%",padding:"5px 8px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,fontSize:11,background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box",minWidth:90}}
                          />
                        </td>
                      ))}
                      <td style={{padding:"4px 6px"}}>
                        <button onClick={()=>setManualRows(manualRows.filter((_,i)=>i!==ri))} style={{background:"transparent",border:"none",cursor:"pointer",color:"#c0392b",padding:3}}>
                          <i className="ti ti-trash" style={{fontSize:13}}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
              <button style={{padding:"7px 14px",background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>
                บันทึก Draft
              </button>
              <button onClick={()=>{setPreviewData(manualRows.map(r=>r));doImport();}} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer"}}>
                <i className="ti ti-database-import" style={{fontSize:14}}/> บันทึกเข้าระบบ
              </button>
            </div>
            {importDone && (
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#edf7f2",border:"0.5px solid #7ccca0",borderRadius:8,marginTop:12,fontSize:12,color:"#1a5e3a"}}>
                <i className="ti ti-circle-check" style={{fontSize:18}}/> บันทึกสำเร็จ! ข้อมูล {manualRows.length} แถวถูกนำเข้าโมดูล <b>{docType.target}</b> แล้ว
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab==="history" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {[["นำเข้าทั้งหมด",history.length,"รายการ"],["สำเร็จ",history.filter(h=>h.status==="success").length,""],["มีคำเตือน",history.filter(h=>h.status==="warning").length,""],["ล้มเหลว",history.filter(h=>h.status==="error").length,""]].map(([l,v,s])=>(
              <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"14px 16px"}}>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:5}}>{l}</div>
                <div style={{fontSize:20,fontWeight:500}}>{v}</div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{s}</div>
              </div>
            ))}
          </div>
          <Card>
            <SectionTitle>ประวัติการนำเข้า
              <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,fontSize:11,cursor:"pointer",color:"var(--color-text-secondary)"}}>
                <i className="ti ti-file-spreadsheet" style={{fontSize:13}}/> Export Log
              </button>
            </SectionTitle>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:640}}>
                <thead><tr>
                  {["ID","ประเภทเอกสาร","ชื่อไฟล์","วันที่","ผู้นำเข้า","แถว","โมดูลเป้าหมาย","สถานะ",""].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"var(--color-text-secondary)",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {history.map(h=>(
                    <tr key={h.id}>
                      <td style={{padding:"7px 8px",color:"var(--color-text-tertiary)",fontWeight:500}}>{h.id}</td>
                      <td style={{padding:"7px 8px",fontWeight:500}}>{h.type}</td>
                      <td style={{padding:"7px 8px",color:"var(--color-text-secondary)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.file}</td>
                      <td style={{padding:"7px 8px",color:"var(--color-text-tertiary)",whiteSpace:"nowrap"}}>{h.date}</td>
                      <td style={{padding:"7px 8px"}}>{h.user}</td>
                      <td style={{padding:"7px 8px"}}>{h.rows}</td>
                      <td style={{padding:"7px 8px"}}><Badge color="blue">{h.target}</Badge></td>
                      <td style={{padding:"7px 8px"}}>
                        <Badge color={h.status==="success"?"green":h.status==="warning"?"yellow":"red"}>
                          {h.status==="success"?"สำเร็จ":h.status==="warning"?"มีคำเตือน":"ล้มเหลว"}
                        </Badge>
                      </td>
                      <td style={{padding:"7px 8px"}}>
                        <button style={{padding:"3px 8px",background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,fontSize:11,cursor:"pointer",color:"var(--color-text-secondary)"}}>
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MAPPING / TEMPLATE TAB ── */}
      {tab==="mapping" && (
        <div>
          <div style={{background:"#e6f0fb",border:"0.5px solid #b5d4f4",color:"#1a4e8a",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <i className="ti ti-info-circle" style={{fontSize:16,flexShrink:0}}/>
            ดาวน์โหลด Template Excel/CSV สำหรับแต่ละประเภทเอกสาร เพื่อกรอกข้อมูลในระบบภายนอกแล้วนำเข้ากลับมา
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <Card>
              <SectionTitle>Template ดาวน์โหลด</SectionTitle>
              {DOC_TYPES.map(d=>(
                <div key={d.key} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                  <i className={`ti ${d.icon}`} style={{fontSize:15,color:"var(--color-text-tertiary)",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:500}}>{d.label}</div>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{d.fields.join(" · ")}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{padding:"4px 8px",background:"transparent",border:"0.5px solid #1a7a4a",borderRadius:6,fontSize:11,cursor:"pointer",color:"#1a7a4a",display:"flex",alignItems:"center",gap:4}}>
                      <i className="ti ti-file-spreadsheet" style={{fontSize:12}}/> .xlsx
                    </button>
                    <button style={{padding:"4px 8px",background:"transparent",border:"0.5px solid #2471a3",borderRadius:6,fontSize:11,cursor:"pointer",color:"#2471a3",display:"flex",alignItems:"center",gap:4}}>
                      <i className="ti ti-file-type-csv" style={{fontSize:12}}/> .csv
                    </button>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle>Field Mapping — กำหนดชื่อคอลัมน์</SectionTitle>
              <div style={{marginBottom:10}}>
                <label style={{display:"block",fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>ประเภทเอกสาร</label>
                <select value={selType} onChange={e=>setSelType(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:12}}>
                  {DOC_TYPES.map(d=><option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:10}}>กำหนดชื่อคอลัมน์ในไฟล์ภายนอกที่ตรงกับฟิลด์ระบบ</div>
              {docType.fields.map(f=>(
                <div key={f} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8,alignItems:"center"}}>
                  <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>{f}</div>
                  <input defaultValue={f} placeholder="ชื่อคอลัมน์ภายนอก" style={{padding:"6px 10px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:7,fontSize:11,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                </div>
              ))}
              <button style={{width:"100%",marginTop:8,padding:"8px 0",background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <i className="ti ti-device-floppy" style={{fontSize:14}}/> บันทึก Mapping
              </button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:"Dashboard ภาพรวมโรงงาน", inventory:"จัดการวัตถุดิบ & คลังสินค้า",
  receiving:"รับวัตถุดิบ", production:"แผนการผลิต", qc:"QC / ตรวจสอบคุณภาพ",
  loss:"ตรวจสอบการสูญเสีย", orders:"คำสั่งซื้อ / ขาย", delivery:"การจัดส่ง & การขาดส่ง",
  customers:"ลูกค้า", products:"รายการสินค้า", finance:"บัญชีและการเงิน",
  hr:"HR / พนักงาน", reports:"รายงานและวิเคราะห์", users:"จัดการผู้ใช้งาน",
  finance_acl:"สิทธิ์โมดูลการเงิน", docimport:"นำเข้าเอกสารจากภายนอก",
};

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const PAGE_MAP = {
    dashboard:<Dashboard/>, inventory:<Inventory/>, receiving:<Inventory/>,
    production:<Production/>, qc:<QC/>, loss:<LossPage/>,
    orders:<Orders/>, delivery:<Delivery/>, customers:<Customers/>,
    products:<ProductsPage/>, finance:<Finance/>, hr:<HR/>,
    reports:<Reports/>, users:<UsersPage/>, finance_acl:<FinanceACL/>,
    docimport:<DocImport/>,
  };

  return (
    <div style={{display:"flex",height:"100vh",minHeight:600,overflow:"hidden",borderRadius:12,border:"0.5px solid var(--color-border-tertiary)",fontFamily:"var(--font-sans,'Segoe UI',sans-serif)"}}>
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {/* Topbar */}
        <div style={{height:56,background:"var(--color-background-primary)",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",padding:"0 20px",gap:12,flexShrink:0}}>
          <div style={{flex:1,fontSize:15,fontWeight:500}}>{PAGE_TITLES[active]||active}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>
            <i className="ti ti-bell" style={{fontSize:14}}/>
            <span style={{background:"#e03030",color:"#fff",fontSize:10,padding:"0 4px",borderRadius:8}}>3</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>
            <i className="ti ti-settings" style={{fontSize:14}}/>
          </div>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#1a7a4a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500}}>SC</div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          {PAGE_MAP[active]||<Dashboard/>}
        </div>
      </div>
    </div>
  );
}

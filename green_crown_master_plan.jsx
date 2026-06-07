
import { useState } from "react";

const sections = [
  {
    id: "bugs",
    icon: "🔴",
    label: "URGENT BUGS",
    color: "#ef4444",
    bg: "#1a0000",
  },
  {
    id: "scalability",
    icon: "⚙️",
    label: "HFSQL & SCALABILITY",
    color: "#f59e0b",
    bg: "#1a1000",
  },
  {
    id: "tourism",
    icon: "✈️",
    label: "TOURISM AGENCY MODULE",
    color: "#06b6d4",
    bg: "#001a1a",
  },
  {
    id: "academy",
    icon: "🎓",
    label: "LANGUAGE ACADEMY MODULE",
    color: "#a78bfa",
    bg: "#0f001a",
  },
  {
    id: "ads",
    icon: "📢",
    label: "AD SCRIPTS",
    color: "#10b981",
    bg: "#001a0d",
  },
  {
    id: "demo",
    icon: "🎬",
    label: "DEMO RECORDINGS PLAN",
    color: "#f97316",
    bg: "#1a0800",
  },
];

const data = {
  bugs: {
    title: "🔴 URGENT BUGS — Fix First",
    subtitle: "These block users from even starting. Fix before anything else.",
    items: [
      {
        priority: "P0",
        title: "Can't Create New Account Properly",
        detail:
          "Check validation logic on the register endpoint. Likely: missing required fields not being caught, or a DB insert failing silently. Steps: 1) Test with minimal data, 2) Check server logs on submit, 3) Ensure HFSQL write is committed, 4) Return proper error messages to frontend.",
        fix: "Backend: validate all fields, catch HFSQL exceptions, return 400 with message. Frontend: show error toast.",
      },
      {
        priority: "P0",
        title: "Can't Access Admin Panel",
        detail:
          "Admin route guard is either: checking wrong role field, JWT not including role, or route not protected correctly. Steps: 1) Check JWT payload includes role='admin', 2) Check the middleware reading the role, 3) Check admin route is actually protected.",
        fix: "Ensure admin role is stored in HFSQL user table, included in JWT on login, and route guard reads it correctly.",
      },
      {
        priority: "P1",
        title: "Plan Selection Has Issues",
        detail:
          "Two duplicated register/plan pages exist. One is in the /auth flow (correct) and one is a leftover standalone page. The auth-flow version must be kept. The other must be deleted or redirected.",
        fix: "1) Identify which component/route is the duplicate. 2) Delete or redirect the duplicate to /auth/register. 3) Make sure plan selection saves correctly to the user's account in HFSQL before confirming registration.",
      },
    ],
  },
  scalability: {
    title: "⚙️ HFSQL Support & Scalability",
    subtitle: "Make the app solid, fast, and ready for many stores.",
    items: [
      {
        priority: "ARCH",
        title: "HFSQL Local vs Online Server",
        detail:
          "Support both modes: LOCAL (HFSQL file on same machine, ideal for small shops with no internet) and SERVER (HFSQL Client/Server for multi-user, multi-branch, online). The app must detect which mode it's connected to and behave accordingly.",
        fix: "Config file per installation: MODE=local|server, HOST, PORT, DB_NAME, LOGIN, PASSWORD. App reads config on startup.",
      },
      {
        priority: "ARCH",
        title: "Multi-Store / Multi-Branch Architecture",
        detail:
          "Each business (حانوت, وكالة, أكاديمية...) is a TENANT. Each tenant can have multiple branches (فروع). Data is isolated per tenant. Users belong to a tenant and have roles: Owner, Manager, Cashier, Viewer.",
        fix: "Add tenant_id and branch_id columns to all major tables. All queries must filter by tenant_id. Admin super-user can see all tenants.",
      },
      {
        priority: "PERF",
        title: "HFSQL Indexing & Performance",
        detail:
          "Add indexes on: tenant_id, branch_id, created_at, product_code, client_id, invoice_number. Use HFSQL's native query optimization. For large stock tables (10k+ products), paginate all lists.",
        fix: "Review all .wdd files and add indexes. Use WLanguage HReadFirst/HReadNext with filters instead of reading all records.",
      },
      {
        priority: "PERF",
        title: "Offline-First Support",
        detail:
          "Small shops often lose internet. App must work fully offline with local HFSQL, then sync when online (for server mode).",
        fix: "Implement a sync queue. When offline: write to local HFSQL with sync_status='pending'. When back online: push pending records to server.",
      },
      {
        priority: "SCALE",
        title: "Subscription Plan Enforcement",
        detail:
          "Each plan (basic, pro, enterprise) unlocks different modules and limits (e.g., max products, max users, max branches). This must be enforced server-side, not just UI.",
        fix: "plan_limits table: plan_id, max_products, max_users, max_branches, modules_json. Check limits before every create operation.",
      },
    ],
  },
  tourism: {
    title: "✈️ وكالة سياحية جزائرية — Full Module",
    subtitle:
      "Deep research: Algerian agencies do Hajj/Omra, visa facilitation, domestic trips, international packages, group & individual travel.",
    sections: [
      {
        name: "📋 Client & Dossier Management",
        items: [
          "Client profile: CIN/passport number, expiry date, photo, address, phone",
          "Dossier per trip: client list, trip type, status (pending/confirmed/traveled/returned)",
          "Document checklist per client: passport ✓, photo ✓, medical cert ✓, insurance ✓",
          "Auto-alert when passport expiry < 6 months before travel date",
          "Group dossier: attach multiple clients to one trip (e.g., Omra group of 40)",
        ],
      },
      {
        name: "🕌 Hajj & Omra Management",
        items: [
          "Omra packages: price tiers (economy/comfort/VIP), hotel name in Makkah & Madinah, star rating",
          "Nusuk platform integration notes: agency connects to Nusuk, generate visa request per client",
          "Quota management: agency has X Omra slots per season — track used vs remaining",
          "Flight booking: airline, departure city (Algiers/Oran/Constantine/...), date, seat class",
          "Hotel booking: makkah hotel + madinah hotel, check-in/out dates, room type, number of beds",
          "Group leader (مرافق) assignment per group",
          "Payment plan: deposit + remaining balance with due dates",
          "Print: individual client voucher, group manifest list",
        ],
      },
      {
        name: "✈️ International Packages",
        items: [
          "Destination catalog: country, city, package name, duration (days/nights)",
          "Package builder: flights + hotel + transport + activities + guide",
          "Pricing: per-person price, group discount, child price, infant price",
          "Seasonal pricing: same package different price in peak/off-peak",
          "Visa assistance tracker: applied/approved/rejected/collected",
          "Travel insurance: provider, policy number, coverage amount",
          "Itinerary day-by-day: day 1 arrive, day 2 excursion...",
          "Print: travel program booklet per client/group",
        ],
      },
      {
        name: "🇩🇿 Domestic Trips (رحلات داخلية)",
        items: [
          "Destination: Tamanrasset, Ghardaia, Tlemcen, Tipaza, Annaba...",
          "Bus/transport booking: vehicle type, driver, departure point & time",
          "Hotel or camp accommodation",
          "Group size management, min/max participants",
          "Per-person profit margin calculation",
        ],
      },
      {
        name: "💰 Financial Management",
        items: [
          "Invoice generation per client (فاتورة)",
          "Payment tracking: cash / CCP / bank transfer / Baridi Mob",
          "Installment plans (تقسيط): first payment, second payment, final payment with dates",
          "Agency commission calculation (for airline tickets, hotel bookings)",
          "Supplier payments: airlines, hotels, bus companies",
          "Profit & loss per trip/package",
          "Tax stamp support (طابع مالي) on invoices",
          "Currency handling: DZD, EUR, SAR, USD for international trips",
        ],
      },
      {
        name: "📊 Reports & Stats",
        items: [
          "Monthly revenue by trip type",
          "Most popular destinations",
          "Client retention (repeat customers)",
          "Upcoming trips calendar",
          "Pending payments alert list",
          "Seat availability dashboard per trip",
        ],
      },
    ],
  },
  academy: {
    title: "🎓 أكاديمية اللغات / دروس خصوصية — Full Module",
    subtitle:
      "For language schools (French/English/Arabic/Spanish) and private tutoring centers.",
    sections: [
      {
        name: "👨‍🎓 Student Management",
        items: [
          "Student profile: name, age, parent contact, level (A1→C2 or school grade)",
          "Enrollment date, current course(s), assigned teacher",
          "Attendance history per student per session",
          "Progress notes per session (teacher fills in)",
          "Student portal or parent notification via SMS/WhatsApp",
          "Photo + ID document for official centers",
        ],
      },
      {
        name: "📅 Scheduling & Classes",
        items: [
          "Class types: individual (1-on-1), group (2-15 students), online, in-person",
          "Weekly timetable builder: assign teacher + room + students + time slot",
          "Conflict detection: teacher double-booking, room double-booking",
          "Recurring sessions: every Monday+Wednesday 17h-18h30",
          "Substitute teacher assignment when regular teacher absent",
          "Makeup session scheduling for missed classes",
          "Holiday/break calendar: mark no-school days",
          "Multi-branch: same school in different locations",
        ],
      },
      {
        name: "👩‍🏫 Teacher Management",
        items: [
          "Teacher profile: speciality (French/English/Math), availability hours",
          "Salary calculation: per hour OR per session OR monthly fixed",
          "Teaching log: automatically generates from attended sessions",
          "Payroll report: hours taught × rate = salary due",
          "Commission for referrals",
        ],
      },
      {
        name: "💰 Billing & Payments",
        items: [
          "Enrollment fee (رسوم التسجيل)",
          "Monthly tuition OR per-session billing OR package of N sessions",
          "Invoice auto-generation at start of month or on enrollment",
          "Payment recording: cash, bank, mobile payment",
          "Remaining balance alert",
          "Installment support: pay in 2 or 3 tranches",
          "Invoice with official stamp (طابع مالي)",
          "Receipt printing",
          "Late payment reminder",
        ],
      },
      {
        name: "📚 Courses & Levels",
        items: [
          "Course catalog: French A1, English B2, Math 3ème, etc.",
          "CEFR level tracking for language students",
          "Level assessment test result recording",
          "Certificate of completion generation",
          "Exam scheduling and results entry",
        ],
      },
      {
        name: "📊 Reports",
        items: [
          "Daily attendance sheet per class",
          "Monthly revenue by course/teacher",
          "Student progress report (send to parents)",
          "Teacher payroll summary",
          "Enrollment trends: new students this month vs last month",
          "Room utilization rate",
        ],
      },
    ],
  },
  ads: {
    title: "📢 Ad Scripts — تاج الأخضر",
    subtitle: "3 scripts ready to record. Spelling kept exactly as written.",
    scripts: [
      {
        num: "01",
        theme: "Stock & POS — كرهت من لا فوييت",
        hook: "كرهت من لا فوييت",
        text: `كرهت من لا فوييت لي عييت تلقاها فحانوتك سا سوا سلعة مسروقة ولا مخرجتش من ستوك تاعك
حانوتك بالكاميرات مبصح متقدرش تشوفهم ونتا برا الحانوت
نقدمولك لوجيسيال دجيستويون دستوك بوان دفونط
وين تقدر تتبع شحال روسيت فلاكاس هامش الربح فاكتيراسيون بدعم جميع انواع الطوابع
ومهما كانت طبيعة العمل تاعك نقدمو دي لوجيسال يساعدوك تتحكم في محلك ولا الشركة تاعك
معليك غير ترسلنا رسالة في الواتساب ولا تخلي كومونتار وخلي فريق التاج الاخضر يتكفل بالباقي .....`,
        cta: "واتساب / كومونتار",
        notes: "Tone: frustrated then relieved. Show stock movement screens while speaking.",
      },
      {
        num: "02",
        theme: "All Store Types — عندك سوبيرات",
        hook: "عندك سوبيرات؟",
        text: `عندك سوبيرات كيوسك بياس ديتاشي مطعم وكالة سياحة ولا تبيع بالجملة لاصحاب المحلات
مام سي عند روحك ومزالك بالورقة والستيلو ارمي عليك الشكيل
تيليشارجي التاج الاخضر سيليكسوني طبيعة العمل تاعك وابدا تخدم
عصح بسكو امني كي نقولك قبل تاج الاخضر راك كنت غير تشكل`,
        cta: "تيليشارجي التاج الاخضر",
        notes: "Tone: direct, punchy. Show the store type selector UI screen. End with laugh/smile.",
      },
      {
        num: "03",
        theme: "No Internet / No Support — عييت من ليلوحيسال",
        hook: "عييت من ليلوحيسال",
        text: `عييت من ليلوحيسال تاع تروح لانتارنات ييحبس لوجيسيال ومكنش دعم فني
خلي عليك جرين كراون جات تحلك مشاكلك
لوجيسيال يخدم بتخزين hfsql لوكال ولا اونلين سرفر
وين يكون عندك تسيير كامل للمحلات شركات كبيرة او صغيرة حتى شركات التقسيط
عندنا لوجيسيال خاص بيهم
جرين كراون كل عملك في مكان واحد`,
        cta: "جرين كراون",
        notes: "Tone: empathetic then confident. Show offline badge → sync icon → dashboard.",
      },
    ],
  },
  demo: {
    title: "🎬 Demo Recording Plan",
    subtitle: "2 videos needed. Here's the exact script and screen flow for each.",
    videos: [
      {
        num: "1",
        title: "شرح كامل — Desktop Full Walkthrough",
        duration: "8-12 min",
        tool: "OBS Studio (free) or Camtasia",
        scenes: [
          {
            scene: "Intro (30s)",
            action: "Screen: landing page / login. Narrate: 'نعرفوكم على تاج الاخضر...'",
          },
          {
            scene: "Account Creation (1min)",
            action:
              "Show register → select plan → confirm. Narrate each step. This also tests the bug fix.",
          },
          {
            scene: "Dashboard Overview (1min)",
            action: "Show main dashboard, all modules visible, explain each icon/section.",
          },
          {
            scene: "Add Products to Stock (2min)",
            action:
              "New product → category → price → barcode. Then show stock list. Narrate in Darija.",
          },
          {
            scene: "Perform a Sale at POS (2min)",
            action:
              "Open caisse → scan/search product → add qty → apply discount → print ticket → show stock decreased.",
          },
          {
            scene: "Inventaire (1min)",
            action:
              "Inventory module → count stock → show difference between system and physical.",
          },
          {
            scene: "Reports & Bilan (1min)",
            action: "Daily sales report → margin → best sellers → export PDF.",
          },
          {
            scene: "Admin Panel (1min)",
            action: "Login as admin → show all stores/tenants → manage users → show logs.",
          },
          {
            scene: "Outro (30s)",
            action: "Contact info, WhatsApp number, website URL.",
          },
        ],
        setup: [
          "Use 1920x1080 resolution",
          "Hide personal info / test data only",
          "Clean desktop background (Green Crown branded)",
          "Record microphone + screen together",
          "Edit out loading times",
          "Add subtitles in Darija",
        ],
      },
      {
        num: "2",
        title: "مسلم ستور — Live Sell + Inventaire",
        duration: "3-5 min",
        tool: "Phone camera (landscape) + screen recording if on tablet/PC",
        scenes: [
          {
            scene: "Context Shot (15s)",
            action: "Camera shows the actual store shelves/counter. Quick pan.",
          },
          {
            scene: "Open App on Device (15s)",
            action: "Show the Green Crown app opening, logged in as Muslim Store cashier.",
          },
          {
            scene: "Perform a Real Sale (2min)",
            action:
              "Real customer or demo: scan barcode → item appears → add another item → apply promo → total → payment (cash) → print receipt → show receipt.",
          },
          {
            scene: "Check Stock Movement (1min)",
            action:
              "Go to stock → search sold product → show quantity went down → show mouvement history.",
          },
          {
            scene: "Quick Inventaire Count (1min)",
            action:
              "Inventory module → select category → scan/count items → confirm → show écart if any.",
          },
          {
            scene: "Close with CTA (15s)",
            action: "Point to camera: 'هكذا يخدم التاج الاخضر — تيليشارجي دروك'",
          },
        ],
        setup: [
          "Film in actual Muslim Store (real environment = more trust)",
          "Good lighting on screen + products",
          "Fast movements = shows speed of the software",
          "No mistakes — practice flow once before recording",
          "Add Green Crown logo watermark in corner",
          "Background music: subtle, professional",
        ],
      },
    ],
  },
};

function PriorityBadge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "1px",
        border: `1px solid ${color}`,
        color: color,
        marginRight: "8px",
        fontFamily: "monospace",
      }}
    >
      {label}
    </span>
  );
}

function BugSection() {
  const d = data.bugs;
  return (
    <div>
      {d.items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderLeft: "4px solid #ef4444",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div style={{ marginBottom: "6px" }}>
            <PriorityBadge label={item.priority} color="#ef4444" />
            <span style={{ fontWeight: "700", fontSize: "15px", color: "#fca5a5" }}>
              {item.title}
            </span>
          </div>
          <p style={{ color: "#fecaca", fontSize: "13px", margin: "0 0 8px 0", lineHeight: 1.6 }}>
            {item.detail}
          </p>
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              color: "#86efac",
              fontFamily: "monospace",
            }}
          >
            ✅ FIX: {item.fix}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScalabilitySection() {
  const d = data.scalability;
  const colors = { ARCH: "#f59e0b", PERF: "#06b6d4", SCALE: "#a78bfa" };
  return (
    <div>
      {d.items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderLeft: `4px solid ${colors[item.priority] || "#f59e0b"}`,
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div style={{ marginBottom: "6px" }}>
            <PriorityBadge label={item.priority} color={colors[item.priority] || "#f59e0b"} />
            <span style={{ fontWeight: "700", fontSize: "15px", color: "#fde68a" }}>
              {item.title}
            </span>
          </div>
          <p style={{ color: "#fef3c7", fontSize: "13px", margin: "0 0 8px 0", lineHeight: 1.6 }}>
            {item.detail}
          </p>
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              color: "#86efac",
              fontFamily: "monospace",
            }}
          >
            ✅ FIX: {item.fix}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModuleSection({ sectionData, color }) {
  return (
    <div>
      {sectionData.sections.map((sec, i) => (
        <div
          key={i}
          style={{
            marginBottom: "16px",
            background: `rgba(255,255,255,0.03)`,
            border: `1px solid ${color}22`,
            borderRadius: "8px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontWeight: "700",
              fontSize: "14px",
              color: color,
              marginBottom: "10px",
              borderBottom: `1px solid ${color}33`,
              paddingBottom: "6px",
            }}
          >
            {sec.name}
          </div>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            {sec.items.map((item, j) => (
              <li
                key={j}
                style={{
                  fontSize: "13px",
                  color: "#e2e8f0",
                  marginBottom: "5px",
                  lineHeight: 1.5,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AdsSection() {
  const d = data.ads;
  const colors = ["#10b981", "#06b6d4", "#a78bfa"];
  return (
    <div>
      {d.scripts.map((s, i) => (
        <div
          key={i}
          style={{
            background: `rgba(16,185,129,0.06)`,
            border: `1px solid ${colors[i]}44`,
            borderLeft: `4px solid ${colors[i]}`,
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: "900",
                fontSize: "24px",
                color: colors[i],
                opacity: 0.5,
              }}
            >
              {s.num}
            </span>
            <div>
              <div style={{ fontWeight: "700", color: colors[i], fontSize: "14px" }}>
                {s.theme}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Hook: {s.hook}</div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.4)",
              borderRadius: "6px",
              padding: "12px",
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#e2e8f0",
              lineHeight: 1.8,
              marginBottom: "10px",
              direction: "rtl",
              textAlign: "right",
              whiteSpace: "pre-line",
            }}
          >
            {s.text}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                background: `${colors[i]}22`,
                border: `1px solid ${colors[i]}`,
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "11px",
                color: colors[i],
              }}
            >
              CTA: {s.cta}
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "11px",
                color: "#94a3b8",
              }}
            >
              📝 {s.notes}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoSection() {
  const d = data.demo;
  return (
    <div>
      {d.videos.map((v, i) => (
        <div
          key={i}
          style={{
            background: "rgba(249,115,22,0.06)",
            border: "1px solid rgba(249,115,22,0.25)",
            borderRadius: "10px",
            padding: "18px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
            <span
              style={{
                background: "#f97316",
                color: "#000",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              {v.num}
            </span>
            <div>
              <div style={{ fontWeight: "700", fontSize: "16px", color: "#fed7aa" }}>
                {v.title}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Duration: {v.duration} • Tool: {v.tool}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div
              style={{ fontSize: "11px", color: "#f97316", fontWeight: "700", marginBottom: "8px", letterSpacing: "1px" }}
            >
              SCENE BY SCENE
            </div>
            {v.scenes.map((sc, j) => (
              <div
                key={j}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: "8px",
                  padding: "6px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: "#f97316", fontWeight: "600" }}>{sc.scene}</span>
                <span style={{ color: "#cbd5e1" }}>{sc.action}</span>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: "6px", letterSpacing: "1px" }}
            >
              SETUP CHECKLIST
            </div>
            {v.setup.map((s, j) => (
              <div key={j} style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "3px" }}>
                ☐ {s}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("bugs");

  const renderContent = () => {
    const sec = sections.find((s) => s.id === active);
    const d = data[active];

    return (
      <div>
        <div style={{ marginBottom: "20px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: sec.color,
              margin: "0 0 4px 0",
            }}
          >
            {d.title}
          </h2>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>{d.subtitle}</p>
        </div>

        {active === "bugs" && <BugSection />}
        {active === "scalability" && <ScalabilitySection />}
        {active === "tourism" && <ModuleSection sectionData={d} color="#06b6d4" />}
        {active === "academy" && <ModuleSection sectionData={d} color="#a78bfa" />}
        {active === "ads" && <AdsSection />}
        {active === "demo" && <DemoSection />}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0d2818 0%, #0a1628 100%)",
          borderBottom: "1px solid #1e3a2f",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(135deg, #16a34a, #0d9488)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
        >
          👑
        </div>
        <div>
          <div style={{ fontWeight: "800", fontSize: "16px", color: "#4ade80" }}>
            GREEN CROWN — MASTER PLAN
                    </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            Full roadmap: bugs → HFSQL → tourism → academy → ads → demo
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 69px)" }}>
        {/* Sidebar */}
        <div
          style={{
            width: "200px",
            flexShrink: 0,
            background: "#0d1117",
            borderRight: "1px solid #1e293b",
            padding: "12px 8px",
            overflowY: "auto",
          }}
        >
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActive(sec.id)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "none",
                background: active === sec.id ? `${sec.color}18` : "transparent",
                borderLeft: active === sec.id ? `3px solid ${sec.color}` : "3px solid transparent",
                color: active === sec.id ? sec.color : "#64748b",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: active === sec.id ? "700" : "500",
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s",
              }}
            >
              <span>{sec.icon}</span>
              <span style={{ lineHeight: 1.3 }}>{sec.label}</span>
            </button>
          ))}

          <div
            style={{
              marginTop: "24px",
              padding: "12px",
              background: "rgba(74,222,128,0.06)",
              borderRadius: "8px",
              border: "1px solid rgba(74,222,128,0.15)",
            }}
          >
            <div style={{ fontSize: "10px", color: "#4ade80", fontWeight: "700", marginBottom: "6px" }}>
              PRIORITY ORDER
            </div>
            {["1. Fix Bugs", "2. HFSQL Arch", "3. Tourism Module", "4. Academy Module", "5. Record Ads", "6. Record Demos"].map((item, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#475569", marginBottom: "3px" }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

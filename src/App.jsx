import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Wallet, Receipt, Users, Activity, UserCog, Settings as SettingsIcon,
  LogOut, Eye, EyeOff, Plus, Trash2, Download, Upload, Save, ShieldAlert, TrendingUp,
  ShoppingCart, BarChart2, AlertTriangle, Grid3x3, Calendar, Target, Award, FileText,
  Folder, Menu, X, ChevronRight, CheckCircle2, Search
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

/* ---------- brand ---------- */
const RED = "#D90429";
const RED_DARK = "#A80320";
const DARKGRAY = "#1f2937";
const LIGHTGRAY = "#f3f4f6";

const DEPARTMENTS = [
  "Marketing", "Graphic Design", "Engineering", "Manufacturing",
  "Portfolio Printing", "Pit Display", "Social Project", "Resource Acquisition"
];

const SCENARIOS = ["Optimistic", "Realistic", "Pessimistic"];

const ROLES = [
  "Administrator", "Finance Manager", "Project Manager",
  "Engineering Manager", "Marketing Manager", "Read Only"
];

const DEFAULT_ADMIN = {
  id: "admin-seed",
  name: "Administrator",
  email: "stella.03aportnoi@gmail.com",
  password: btoa("1234567"),
  role: "Administrator",
  enabled: true,
  createdAt: new Date().toISOString(),
  lastLogin: null
};

const CHART_COLORS = [RED, "#111827", "#6b7280", "#9ca3af", "#D90429aa", "#374151", "#d1d5db"];

/* ---------- storage helpers ---------- */
async function loadJSON(key, fallback) {
  try {
    const res = await fetch(`/api/db?key=${key}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    return data.value ? data.value : fallback;
  } catch (e) {
    console.error("Falha ao carregar da nuvem", e);
    return fallback;
  }
}

async function saveJSON(key, value) {
  try {
    await fetch(`/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    return true;
  } catch (e) {
    console.error("Falha ao salvar na nuvem", e);
    return false;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function emptyWorkspace() {
  const budget = {};
  SCENARIOS.forEach(s => { budget[s] = {}; DEPARTMENTS.forEach(d => { budget[s][d] = []; }); });
  return {
    budget,
    transactions: [],
    sponsors: [],
    reserve: { total: 5000, used: 0, log: [] },
    evmHistory: [],
    pertHistory: [],
    riskRegister: [],
    raci: [],
    kpis: [],
    scorecard: [],
    procurement: [],
    schedule: [],
    documents: [],
    cashflowForecast: [],
    settings: { currency: "USD", theme: "light" }
  };
}
function normalizeWorkspace(ws) {
  if (!ws) return emptyWorkspace();
  const base = emptyWorkspace();
  const merged = { ...base, ...ws };
  // migrate old flat budget shape { dept: [items] } into { scenario: { dept: [items] } }
  const looksFlat = ws.budget && DEPARTMENTS.some(d => Array.isArray(ws.budget[d]));
  if (looksFlat) {
    const nb = { Optimistic: {}, Realistic: {}, Pessimistic: {} };
    DEPARTMENTS.forEach(d => {
      nb.Realistic[d] = ws.budget[d] || [];
      nb.Optimistic[d] = [];
      nb.Pessimistic[d] = [];
    });
    merged.budget = nb;
  } else {
    const nb = { ...base.budget, ...ws.budget };
    SCENARIOS.forEach(s => { nb[s] = { ...base.budget[s], ...(ws.budget && ws.budget[s] ? ws.budget[s] : {}) }; });
    merged.budget = nb;
  }
  return merged;
}

/* ---------- generic UI atoms ---------- */
function Card({ children, className = "", style = {} }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`} style={style}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <Card className="p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold" style={{ color: accent || DARKGRAY }}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </Card>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 w-full";

function Btn({ children, onClick, variant = "primary", type = "button", className = "" }) {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition active:scale-95";
  const styles = {
    primary: { backgroundColor: RED, color: "white" },
    dark: { backgroundColor: DARKGRAY, color: "white" },
    ghost: { backgroundColor: "transparent", color: DARKGRAY, border: "1px solid #e5e7eb" }
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${className}`} style={styles[variant]}>
      {children}
    </button>
  );
}

function Placeholder({ title, icon: Icon, desc }) {
  return (
    <Card className="p-10 flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: LIGHTGRAY }}>
        <Icon size={26} color={RED} />
      </div>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{desc}</p>
      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: LIGHTGRAY, color: DARKGRAY }}>
        Module scaffolded — extend anytime
      </span>
    </Card>
  );
}

/* ---------- menu config ---------- */
const MENU = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "budget", label: "Budget", icon: Wallet },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "cashflow", label: "Cash Flow Projection", icon: TrendingUp },
  { key: "sponsors", label: "Sponsors", icon: Users },
  { key: "procurement", label: "Procurement", icon: ShoppingCart },
  { key: "reserve", label: "Contingency Reserve", icon: ShieldAlert },
  { key: "variance", label: "Variance Analysis", icon: BarChart2 },
  { key: "evm", label: "BAC vs EAC", icon: Activity },
  { key: "risk", label: "Risk Register", icon: AlertTriangle },
  { key: "raci", label: "RACI Matrix", icon: Grid3x3 },
  { key: "schedule", label: "Project Schedule", icon: Calendar },
  { key: "kpi", label: "KPI Dashboard", icon: Target },
  { key: "scorecard", label: "Balanced Scorecard", icon: Award },
  { key: "pert", label: "PERT Calculator", icon: Activity },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "documents", label: "Documents", icon: Folder },
  { key: "settings", label: "Settings", icon: SettingsIcon }
];

/* ================= AUTH SCREENS ================= */
function LoginScreen({ users, onLogin, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) { setError("Enter your email and password."); return; }
    const u = users.find(u => u.email.trim().toLowerCase() === cleanEmail.toLowerCase());
    if (!u) { setError("No account found with that email."); return; }
    if (!u.enabled) { setError("This account has been disabled."); return; }
    if (u.password !== btoa(password)) { setError("Incorrect password."); return; }
    onLogin(u, remember);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: `radial-gradient(circle at 20% 20%, ${RED}22, transparent 40%), radial-gradient(circle at 80% 80%, #00000022, transparent 40%), linear-gradient(135deg, #0b0b0d, #1f2937)`
    }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-3 shadow-lg" style={{ backgroundColor: RED }}>7S</div>
          <h1 className="text-white text-xl font-bold text-center">Welcome to Seven Speed Financial Management Platform</h1>
        </div>
        <Card className="p-6 backdrop-blur bg-white/95">
          <div className="flex flex-col gap-4">
            <Field label="Email">
              <input className={inputCls} type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@sevenspeed.com" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input className={inputCls + " pr-10"} type={showPw ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submit(e); }} />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Remember me
              </label>
              <span className="cursor-pointer hover:underline">Forgot Password?</span>
            </div>
            {error && <p className="text-xs font-medium" style={{ color: RED }}>{error}</p>}
            <Btn type="button" onClick={submit} className="w-full justify-center">Sign In</Btn>
            <Btn type="button" variant="ghost" className="w-full justify-center" onClick={onGoRegister}>Create Visitor Account</Btn>
          </div>
        </Card>
        <p className="text-center text-gray-400 text-xs mt-4">Default admin: stella.03aportnoi@gmail.com</p>
      </div>
    </div>
  );
}

function RegisterScreen({ onRegister, onBack, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localErr, setLocalErr] = useState("");

  function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !email.trim()) { setLocalErr("Fill in your name and email."); return; }
    if (password !== confirm) { setLocalErr("Passwords do not match."); return; }
    if (password.length < 6) { setLocalErr("Password must be at least 6 characters."); return; }
    setLocalErr("");
    onRegister({ name: name.trim(), email: email.trim(), password });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: `radial-gradient(circle at 20% 20%, ${RED}22, transparent 40%), linear-gradient(135deg, #0b0b0d, #1f2937)`
    }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-3 shadow-lg" style={{ backgroundColor: RED }}>7S</div>
          <h1 className="text-white text-xl font-bold text-center">Create Visitor Account</h1>
        </div>
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Full Name"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Email Address"><input className={inputCls} type="text" value={email} onChange={e => setEmail(e.target.value)} /></Field>
            <Field label="Password"><input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
            <Field label="Confirm Password">
              <input className={inputCls} type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(e); }} />
            </Field>
            {(localErr || error) && <p className="text-xs font-medium" style={{ color: RED }}>{localErr || error}</p>}
            <Btn type="button" onClick={submit} className="w-full justify-center">Register &amp; Sign In</Btn>
            <Btn type="button" variant="ghost" className="w-full justify-center" onClick={onBack}>Back to Sign In</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= LAYOUT ================= */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  useEffect(() => {
    function onResize() { setIsDesktop(window.innerWidth >= 768); }
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isDesktop;
}

function Sidebar({ page, setPage, role, mobileOpen, setMobileOpen, isDesktop, onBack }) {
  const items = MENU.filter(m => !(role === "Read Only" && ["settings"].includes(m.key)));
  const visible = isDesktop || mobileOpen;
  return (
    <>
      {mobileOpen && !isDesktop && <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setMobileOpen(false)} />}
      <aside
        className="h-full w-64 flex flex-col transition-transform duration-300 flex-shrink-0"
        style={{
          backgroundColor: "#0b0b0d",
          position: isDesktop ? "static" : "fixed",
          top: 0, left: 0, zIndex: 40,
          transform: visible ? "translateX(0)" : "translateX(-100%)"
        }}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-white" style={{ backgroundColor: RED }}>7S</div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Seven Speed</p>
            <p className="text-gray-400 text-[10px] leading-tight">Financial Platform</p>
          </div>
          {!isDesktop && <button className="ml-auto text-white" onClick={() => setMobileOpen(false)}><X size={18} /></button>}
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {items.map(m => {
            const Icon = m.icon;
            const active = page === m.key;
            return (
              <button key={m.key} onClick={() => { setPage(m.key); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition"
                style={{ backgroundColor: active ? RED : "transparent", color: active ? "white" : "#9ca3af" }}>
                <Icon size={16} />
                <span className="truncate">{m.label}</span>
                {active && <ChevronRight size={14} className="ml-auto" />}
              </button>
            );
          })}
          <div className="mt-2">
            {role === "Administrator" && (
              <button onClick={() => { setPage("users"); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5"
                style={{ backgroundColor: page === "users" ? RED : "transparent", color: page === "users" ? "white" : "#9ca3af" }}>
                <UserCog size={16} /> User Management
              </button>
            )}
          </div>
          
          {/* NOVO BOTÃO ADICIONADO AQUI */}
          <div className="mt-8 border-t border-white/10 pt-4">
            <button 
              onClick={onBack} 
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-bold text-white transition hover:brightness-110 active:scale-95" 
              style={{ backgroundColor: RED }}
            >
              ← Voltar ao Menu
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}

function Topbar({ user, onLogout, setMobileOpen, pageLabel, isDesktop }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
      {!isDesktop && <button className="text-gray-600" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>}
      <div>
        <h2 className="text-lg font-bold text-gray-900">{pageLabel}</h2>
        <p className="text-xs text-gray-400">Seven Speed STEM Racing — Financial Management</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
          <p className="text-[11px] text-gray-400 leading-tight">{user.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: RED }}>
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-gray-700" title="Log out"><LogOut size={18} /></button>
      </div>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function DashboardPage({ ws }) {
  const budgetR = ws.budget.Realistic || {};
  const allItems = useMemo(() => Object.values(budgetR).flat(), [budgetR]);
  const totalBudget = allItems.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);
  const actualCost = allItems.reduce((s, i) => s + (Number(i.actualCost) || 0), 0);
  const forecastCost = allItems.reduce((s, i) => s + (Number(i.forecastCost) || (Number(i.actualCost) || Number(i.estimatedCost) || 0)), 0);
  const remaining = totalBudget - actualCost;
  const utilization = totalBudget > 0 ? Math.min(999, (actualCost / totalBudget) * 100) : 0;
  const sponsorContribution = ws.sponsors.reduce((s, sp) => s + (Number(sp.investment) || 0), 0);
  const sevenSpeedContribution = allItems.filter(i => i.paidBy !== "Sponsor").reduce((s, i) => s + (Number(i.actualCost) || 0), 0);
  const reserveAvailable = (ws.reserve.total || 0) - (ws.reserve.used || 0);
  const ev = actualCost; // simplified proxy when no separate EV entered

  const byDept = DEPARTMENTS.map(d => ({
    name: d,
    Budget: (budgetR[d] || []).reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0),
    Actual: (budgetR[d] || []).reduce((s, i) => s + (Number(i.actualCost) || 0), 0)
  })).filter(d => d.Budget > 0 || d.Actual > 0);

  const pieData = byDept.map(d => ({ name: d.name, value: d.Actual }));

  const monthly = {};
  ws.transactions.forEach(t => {
    const m = (t.date || "").slice(0, 7) || "n/a";
    monthly[m] = monthly[m] || { month: m, Income: 0, Expense: 0 };
    if (t.type === "Income") monthly[m].Income += Number(t.amount) || 0;
    else if (t.type === "Expense") monthly[m].Expense += Number(t.amount) || 0;
  });
  const trend = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));

  const cards = [
    { label: "Total Budget", value: fmtMoney(totalBudget) },
    { label: "Actual Cost", value: fmtMoney(actualCost) },
    { label: "Remaining Budget", value: fmtMoney(remaining), accent: remaining < 0 ? RED : DARKGRAY },
    { label: "Budget Utilization", value: `${utilization.toFixed(1)}%`, accent: utilization > 100 ? RED : DARKGRAY },
    { label: "Sponsor Contribution", value: fmtMoney(sponsorContribution) },
    { label: "Seven Speed Contribution", value: fmtMoney(sevenSpeedContribution) },
    { label: "Forecast Cost", value: fmtMoney(forecastCost) },
    { label: "Earned Value (proxy)", value: fmtMoney(ev) },
    { label: "Reserve Available", value: fmtMoney(reserveAvailable) }
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Budget vs Actual by Department</h3>
          {byDept.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="Budget" fill={DARKGRAY} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Actual" fill={RED} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Expenses by Department</h3>
          {pieData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmtMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Monthly Cash Flow Trend</h3>
        {trend.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => fmtMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="Income" stroke={DARKGRAY} strokeWidth={2} />
              <Line type="monotone" dataKey="Expense" stroke={RED} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function EmptyChart() {
  return <div className="h-52 flex items-center justify-center text-xs text-gray-400">No data yet — add budget items or transactions to see this chart.</div>;
}

/* ================= BUDGET ================= */
function BudgetPage({ ws, updateWs, canEdit }) {
  const [scenario, setScenario] = useState("Realistic");
  const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [form, setForm] = useState(blankItem());
  function blankItem() {
    return { description: "", estimatedCost: "", actualCost: "", forecastCost: "", quantity: 1, unitCost: "", supplier: "", sponsor: "", paidBy: "Seven Speed", notes: "" };
  }
  const items = (ws.budget[scenario] && ws.budget[scenario][dept]) || [];
  const total = items.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);
  const used = items.reduce((s, i) => s + (Number(i.actualCost) || 0), 0);

  function addItem() {
    if (!form.description) return;
    const next = { ...ws, budget: { ...ws.budget, [scenario]: { ...ws.budget[scenario], [dept]: [...items, { id: uid(), ...form }] } } };
    updateWs(next);
    setForm(blankItem());
  }
  function removeItem(id) {
    const next = { ...ws, budget: { ...ws.budget, [scenario]: { ...ws.budget[scenario], [dept]: items.filter(i => i.id !== id) } } };
    updateWs(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(s => (
          <button key={s} onClick={() => setScenario(s)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border"
            style={scenario === s ? { backgroundColor: DARKGRAY, color: "white", borderColor: DARKGRAY } : { color: DARKGRAY, borderColor: "#e5e7eb" }}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {DEPARTMENTS.map(d => (
          <button key={d} onClick={() => setDept(d)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={dept === d ? { backgroundColor: RED, color: "white", borderColor: RED } : { color: DARKGRAY, borderColor: "#e5e7eb" }}>
            {d}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Department Total" value={fmtMoney(total)} />
        <StatCard label="Actual Used" value={fmtMoney(used)} />
        <StatCard label="Remaining" value={fmtMoney(total - used)} accent={total - used < 0 ? RED : DARKGRAY} />
      </div>

      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Item — {scenario} / {dept}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Estimated Cost"><input className={inputCls} type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} /></Field>
            <Field label="Actual Cost"><input className={inputCls} type="number" value={form.actualCost} onChange={e => setForm({ ...form, actualCost: e.target.value })} /></Field>
            <Field label="Forecast Cost"><input className={inputCls} type="number" value={form.forecastCost} onChange={e => setForm({ ...form, forecastCost: e.target.value })} /></Field>
            <Field label="Supplier"><input className={inputCls} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
            <Field label="Sponsor"><input className={inputCls} value={form.sponsor} onChange={e => setForm({ ...form, sponsor: e.target.value })} /></Field>
            <Field label="Paid By">
              <select className={inputCls} value={form.paidBy} onChange={e => setForm({ ...form, paidBy: e.target.value })}>
                <option>Seven Speed</option><option>Sponsor</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addItem}><Plus size={15} /> Add Item</Btn>
        </Card>
      )}

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="p-3">Description</th><th className="p-3">Est.</th><th className="p-3">Actual</th>
              <th className="p-3">Forecast</th><th className="p-3">Supplier</th><th className="p-3">Paid By</th>
              {canEdit && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-xs">No items in this department yet.</td></tr>}
            {items.map(i => (
              <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{i.description}</td>
                <td className="p-3">{fmtMoney(i.estimatedCost)}</td>
                <td className="p-3">{fmtMoney(i.actualCost)}</td>
                <td className="p-3">{fmtMoney(i.forecastCost)}</td>
                <td className="p-3">{i.supplier}</td>
                <td className="p-3">{i.paidBy}</td>
                {canEdit && <td className="p-3"><button onClick={() => removeItem(i.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= TRANSACTIONS ================= */
function TransactionsPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ date: "", description: "", category: "", department: DEPARTMENTS[0], amount: "", method: "Card", type: "Expense", status: "Completed", notes: "" });
  const [search, setSearch] = useState("");

  function addTx() {
    if (!form.description || !form.amount) return;
    updateWs({ ...ws, transactions: [{ id: uid(), ...form }, ...ws.transactions] });
    setForm({ ...form, description: "", amount: "", notes: "" });
  }
  function removeTx(id) {
    updateWs({ ...ws, transactions: ws.transactions.filter(t => t.id !== id) });
  }
  const filtered = ws.transactions.filter(t => (t.description + t.category + t.department).toLowerCase().includes(search.toLowerCase()));

  function exportCSV() {
    const header = "Date,Description,Category,Department,Amount,Method,Type,Status\n";
    const rows = ws.transactions.map(t => [t.date, t.description, t.category, t.department, t.amount, t.method, t.type, t.status].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
  }

  return (
    <div className="flex flex-col gap-5">
      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">New Transaction</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Date"><input className={inputCls} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Category"><input className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Department">
              <select className={inputCls} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Amount"><input className={inputCls} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Payment Method">
              <select className={inputCls} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option>Card</option><option>Cash</option><option>Bank Transfer</option><option>Check</option>
              </select>
            </Field>
            <Field label="Type">
              <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Income</option><option>Expense</option><option>Transfer</option><option>Refund</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Completed</option><option>Pending</option><option>Overdue</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addTx}><Plus size={15} /> Add Transaction</Btn>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input className={inputCls + " pl-8"} placeholder="Search transactions" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Btn variant="ghost" onClick={exportCSV}><Download size={14} /> Export CSV</Btn>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Dept.</th>
              <th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Status</th>{canEdit && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-xs">No transactions found.</td></tr>}
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{t.date}</td>
                <td className="p-3">{t.description}</td>
                <td className="p-3">{t.department}</td>
                <td className="p-3">{t.type}</td>
                <td className="p-3" style={{ color: t.type === "Income" ? "#16a34a" : RED }}>{fmtMoney(t.amount)}</td>
                <td className="p-3">{t.status}</td>
                {canEdit && <td className="p-3"><button onClick={() => removeTx(t.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= SPONSORS ================= */
function SponsorsPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ name: "", company: "", contact: "", email: "", investment: "", contributionType: "Cash", status: "Prospect", notes: "" });
  function addSponsor() {
    if (!form.name) return;
    updateWs({ ...ws, sponsors: [{ id: uid(), ...form }, ...ws.sponsors] });
    setForm({ ...form, name: "", company: "", investment: "", notes: "" });
  }
  function removeSponsor(id) { updateWs({ ...ws, sponsors: ws.sponsors.filter(s => s.id !== id) }); }
  const total = ws.sponsors.reduce((s, sp) => s + (Number(sp.investment) || 0), 0);
  const pieData = ws.sponsors.map(s => ({ name: s.name, value: Number(s.investment) || 0 }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Raised" value={fmtMoney(total)} />
        <StatCard label="Sponsors" value={ws.sponsors.length} />
        <StatCard label="Confirmed" value={ws.sponsors.filter(s => s.status === "Confirmed").length} />
        <StatCard label="In Negotiation" value={ws.sponsors.filter(s => s.status === "Negotiation").length} />
      </div>

      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Sponsor</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Sponsor Name"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Company"><input className={inputCls} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Contact"><input className={inputCls} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Investment"><input className={inputCls} type="number" value={form.investment} onChange={e => setForm({ ...form, investment: e.target.value })} /></Field>
            <Field label="Contribution Type">
              <select className={inputCls} value={form.contributionType} onChange={e => setForm({ ...form, contributionType: e.target.value })}>
                <option>Cash</option><option>Materials</option><option>Services</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Prospect</option><option>Negotiation</option><option>Confirmed</option><option>Completed</option><option>Rejected</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addSponsor}><Plus size={15} /> Add Sponsor</Btn>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="p-3">Name</th><th className="p-3">Company</th><th className="p-3">Investment</th><th className="p-3">Status</th>{canEdit && <th className="p-3"></th>}
            </tr></thead>
            <tbody>
              {ws.sponsors.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400 text-xs">No sponsors yet.</td></tr>}
              {ws.sponsors.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3">{s.name}</td><td className="p-3">{s.company}</td>
                  <td className="p-3">{fmtMoney(s.investment)}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: LIGHTGRAY }}>{s.status}</span></td>
                  {canEdit && <td className="p-3"><button onClick={() => removeSponsor(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Sponsor Distribution</h3>
          {pieData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {pieData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmtMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================= PERT CALCULATOR ================= */
function PertPage({ ws, updateWs, canEdit }) {
  const [o, setO] = useState(""); const [m, setM] = useState(""); const [p, setP] = useState(""); const [label, setLabel] = useState("");
  const O = Number(o), M = Number(m), P = Number(p);
  const valid = o !== "" && m !== "" && p !== "";
  const te = valid ? (O + 4 * M + P) / 6 : null;
  const sd = valid ? (P - O) / 6 : null;
  const variance = valid ? sd * sd : null;

  function save() {
    if (!valid) return;
    updateWs({ ...ws, pertHistory: [{ id: uid(), label: label || "Estimate", o: O, m: M, p: P, te, sd, variance, date: new Date().toISOString().slice(0, 10) }, ...ws.pertHistory] });
    setLabel("");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">PERT Estimate</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Activity / Task"><input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} /></Field>
          <Field label="Optimistic (O)"><input className={inputCls} type="number" value={o} onChange={e => setO(e.target.value)} /></Field>
          <Field label="Most Likely (M)"><input className={inputCls} type="number" value={m} onChange={e => setM(e.target.value)} /></Field>
          <Field label="Pessimistic (P)"><input className={inputCls} type="number" value={p} onChange={e => setP(e.target.value)} /></Field>
        </div>
        {canEdit && <Btn className="mt-3" onClick={save}><Save size={15} /> Save Estimate</Btn>}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Expected Duration (TE)" value={te !== null ? te.toFixed(2) : "—"} sub="(O + 4M + P) / 6" />
        <StatCard label="Standard Deviation" value={sd !== null ? sd.toFixed(2) : "—"} sub="(P − O) / 6" />
        <StatCard label="Variance" value={variance !== null ? variance.toFixed(2) : "—"} sub="SD²" />
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Task</th><th className="p-3">O</th><th className="p-3">M</th><th className="p-3">P</th><th className="p-3">TE</th><th className="p-3">SD</th><th className="p-3">Variance</th>
          </tr></thead>
          <tbody>
            {ws.pertHistory.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-xs">No estimates saved yet.</td></tr>}
            {ws.pertHistory.map(h => (
              <tr key={h.id} className="border-b border-gray-50">
                <td className="p-3">{h.label}</td><td className="p-3">{h.o}</td><td className="p-3">{h.m}</td><td className="p-3">{h.p}</td>
                <td className="p-3 font-semibold">{h.te.toFixed(2)}</td><td className="p-3">{h.sd.toFixed(2)}</td><td className="p-3">{h.variance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= BAC vs EAC (EVM) ================= */
function EvmPage({ ws, updateWs, canEdit }) {
  const [pv, setPv] = useState(""); const [ev, setEv] = useState(""); const [ac, setAc] = useState(""); const [bac, setBac] = useState(""); const [label, setLabel] = useState("");
  const PV = Number(pv), EV = Number(ev), AC = Number(ac), BAC = Number(bac);
  const valid = [pv, ev, ac, bac].every(v => v !== "");
  const cv = valid ? EV - AC : null;
  const sv = valid ? EV - PV : null;
  const cpi = valid && AC !== 0 ? EV / AC : null;
  const spi = valid && PV !== 0 ? EV / PV : null;
  const eac = valid && cpi ? BAC / cpi : null;
  const etc = valid && eac !== null ? eac - AC : null;
  const vac = valid && eac !== null ? BAC - eac : null;
  const tcpi = valid && (BAC - AC) !== 0 ? (BAC - EV) / (BAC - AC) : null;

  function save() {
    if (!valid) return;
    updateWs({ ...ws, evmHistory: [{ id: uid(), label: label || "Snapshot", pv: PV, ev: EV, ac: AC, bac: BAC, cv, sv, cpi, spi, eac, etc, vac, tcpi, date: new Date().toISOString().slice(0, 10) }, ...ws.evmHistory] });
    setLabel("");
  }

  const metrics = [
    { label: "CV (Cost Variance)", value: cv, good: cv >= 0 },
    { label: "SV (Schedule Variance)", value: sv, good: sv >= 0 },
    { label: "CPI", value: cpi, isRatio: true, good: cpi >= 1 },
    { label: "SPI", value: spi, isRatio: true, good: spi >= 1 },
    { label: "EAC", value: eac },
    { label: "ETC", value: etc },
    { label: "VAC", value: vac, good: vac >= 0 },
    { label: "TCPI", value: tcpi, isRatio: true }
  ];

  const trend = ws.evmHistory.slice().reverse().map(h => ({ date: h.date, CPI: Number(h.cpi?.toFixed(2)), SPI: Number(h.spi?.toFixed(2)) }));

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Earned Value Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Field label="Snapshot Label"><input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} /></Field>
          <Field label="PV (Planned Value)"><input className={inputCls} type="number" value={pv} onChange={e => setPv(e.target.value)} /></Field>
          <Field label="EV (Earned Value)"><input className={inputCls} type="number" value={ev} onChange={e => setEv(e.target.value)} /></Field>
          <Field label="AC (Actual Cost)"><input className={inputCls} type="number" value={ac} onChange={e => setAc(e.target.value)} /></Field>
          <Field label="BAC (Budget at Completion)"><input className={inputCls} type="number" value={bac} onChange={e => setBac(e.target.value)} /></Field>
        </div>
        {canEdit && <Btn className="mt-3" onClick={save}><Save size={15} /> Save Snapshot</Btn>}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <StatCard key={m.label} label={m.label}
            value={m.value === null || Number.isNaN(m.value) ? "—" : (m.isRatio ? m.value.toFixed(2) : fmtMoney(m.value))}
            accent={m.good === undefined ? undefined : (m.good ? "#16a34a" : RED)} />
        ))}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">CPI / SPI Trend</h3>
        {trend.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="CPI" stroke={RED} strokeWidth={2} />
              <Line type="monotone" dataKey="SPI" stroke={DARKGRAY} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

/* ================= RESERVE ================= */
function ReservePage({ ws, updateWs, canEdit }) {
  const [amount, setAmount] = useState(""); const [reason, setReason] = useState(""); const [responsible, setResponsible] = useState("");
  const remaining = (ws.reserve.total || 0) - (ws.reserve.used || 0);
  function useReserve() {
    if (!amount) return;
    const entry = { id: uid(), amount: Number(amount), reason, responsible, date: new Date().toISOString().slice(0, 10) };
    updateWs({ ...ws, reserve: { ...ws.reserve, used: (ws.reserve.used || 0) + Number(amount), log: [entry, ...ws.reserve.log] } });
    setAmount(""); setReason(""); setResponsible("");
  }
  const pieData = [{ name: "Used", value: ws.reserve.used || 0 }, { name: "Remaining", value: Math.max(0, remaining) }];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Reserve" value={fmtMoney(ws.reserve.total)} />
        <StatCard label="Used" value={fmtMoney(ws.reserve.used)} accent={RED} />
        <StatCard label="Remaining" value={fmtMoney(remaining)} accent={remaining < 0 ? RED : "#16a34a"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {canEdit && (
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Record Reserve Usage</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount"><input className={inputCls} type="number" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
              <Field label="Responsible"><input className={inputCls} value={responsible} onChange={e => setResponsible(e.target.value)} /></Field>
              <Field label="Reason"><input className={inputCls + " col-span-2"} value={reason} onChange={e => setReason(e.target.value)} /></Field>
            </div>
            <Btn className="mt-3" onClick={useReserve}><Plus size={15} /> Log Usage</Btn>
            <div className="mt-4 max-h-52 overflow-y-auto">
              {ws.reserve.log.map(l => (
                <div key={l.id} className="flex justify-between text-xs py-2 border-b border-gray-50">
                  <span>{l.date} — {l.reason} ({l.responsible})</span>
                  <span className="font-semibold" style={{ color: RED }}>{fmtMoney(l.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Reserve Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                <Cell fill={RED} /><Cell fill={DARKGRAY} />
              </Pie>
              <Tooltip formatter={v => fmtMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ================= CASH FLOW PROJECTION ================= */
function CashflowPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ month: "", forecastIncome: "", forecastExpense: "" });

  const actualByMonth = {};
  ws.transactions.forEach(t => {
    const m = (t.date || "").slice(0, 7);
    if (!m) return;
    actualByMonth[m] = actualByMonth[m] || { income: 0, expense: 0 };
    if (t.type === "Income") actualByMonth[m].income += Number(t.amount) || 0;
    else if (t.type === "Expense") actualByMonth[m].expense += Number(t.amount) || 0;
  });
  const currentBalance = Object.values(actualByMonth).reduce((s, m) => s + m.income - m.expense, 0);
  const months = Object.keys(actualByMonth).sort();
  const avgBurn = months.length ? Object.values(actualByMonth).reduce((s, m) => s + (m.expense - m.income), 0) / months.length : 0;
  const runway = avgBurn > 0 ? (currentBalance / avgBurn).toFixed(1) : "∞";

  function addForecast() {
    if (!form.month) return;
    updateWs({ ...ws, cashflowForecast: [...ws.cashflowForecast, { id: uid(), ...form }] });
    setForm({ month: "", forecastIncome: "", forecastExpense: "" });
  }
  function removeForecast(id) { updateWs({ ...ws, cashflowForecast: ws.cashflowForecast.filter(f => f.id !== id) }); }

  const allMonths = Array.from(new Set([...months, ...ws.cashflowForecast.map(f => f.month)])).sort();
  let running = 0;
  const projection = allMonths.map(m => {
    const actual = actualByMonth[m];
    const forecast = ws.cashflowForecast.find(f => f.month === m);
    const income = actual ? actual.income : Number(forecast?.forecastIncome) || 0;
    const expense = actual ? actual.expense : Number(forecast?.forecastExpense) || 0;
    running += income - expense;
    return { month: m, Balance: Number(running.toFixed(2)), Income: income, Expense: expense, type: actual ? "Actual" : "Forecast" };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Current Balance" value={fmtMoney(currentBalance)} accent={currentBalance < 0 ? RED : DARKGRAY} />
        <StatCard label="Avg Monthly Burn" value={fmtMoney(avgBurn)} />
        <StatCard label="Cash Runway" value={typeof runway === "string" ? runway : `${runway} mo`} />
      </div>

      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Monthly Forecast</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Month"><input className={inputCls} type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} /></Field>
            <Field label="Forecast Income"><input className={inputCls} type="number" value={form.forecastIncome} onChange={e => setForm({ ...form, forecastIncome: e.target.value })} /></Field>
            <Field label="Forecast Expense"><input className={inputCls} type="number" value={form.forecastExpense} onChange={e => setForm({ ...form, forecastExpense: e.target.value })} /></Field>
          </div>
          <Btn className="mt-3" onClick={addForecast}><Plus size={15} /> Add Forecast</Btn>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Projected Balance</h3>
        {projection.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => fmtMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="Balance" stroke={RED} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Month</th><th className="p-3">Income</th><th className="p-3">Expense</th><th className="p-3">Projected Balance</th><th className="p-3">Source</th>{canEdit && <th className="p-3"></th>}
          </tr></thead>
          <tbody>
            {projection.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400 text-xs">No data yet.</td></tr>}
            {projection.map(p => {
              const fc = ws.cashflowForecast.find(f => f.month === p.month);
              return (
                <tr key={p.month} className="border-b border-gray-50">
                  <td className="p-3">{p.month}</td><td className="p-3">{fmtMoney(p.Income)}</td><td className="p-3">{fmtMoney(p.Expense)}</td>
                  <td className="p-3 font-semibold" style={{ color: p.Balance < 0 ? RED : DARKGRAY }}>{fmtMoney(p.Balance)}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: LIGHTGRAY }}>{p.type}</span></td>
                  {canEdit && <td className="p-3">{fc && <button onClick={() => removeForecast(fc.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= PROCUREMENT ================= */
function ProcurementPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ poNumber: "", supplier: "", item: "", quantity: 1, unitPrice: "", status: "Requested", orderDate: "", expectedDelivery: "" });
  const items = ws.procurement;
  const totalSpend = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const openPOs = items.filter(i => !["Delivered", "Cancelled"].includes(i.status)).length;
  const pendingDelivery = items.filter(i => i.status === "Ordered").length;

  function addPO() {
    if (!form.item) return;
    updateWs({ ...ws, procurement: [{ id: uid(), poNumber: form.poNumber || `PO-${items.length + 1001}`, ...form }, ...items] });
    setForm({ poNumber: "", supplier: "", item: "", quantity: 1, unitPrice: "", status: "Requested", orderDate: "", expectedDelivery: "" });
  }
  function removePO(id) { updateWs({ ...ws, procurement: items.filter(i => i.id !== id) }); }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Spend" value={fmtMoney(totalSpend)} />
        <StatCard label="Open POs" value={openPOs} />
        <StatCard label="Pending Delivery" value={pendingDelivery} />
      </div>

      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">New Purchase Order</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="PO Number"><input className={inputCls} placeholder="auto" value={form.poNumber} onChange={e => setForm({ ...form, poNumber: e.target.value })} /></Field>
            <Field label="Supplier"><input className={inputCls} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
            <Field label="Item"><input className={inputCls} value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></Field>
            <Field label="Quantity"><input className={inputCls} type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Unit Price"><input className={inputCls} type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} /></Field>
            <Field label="Order Date"><input className={inputCls} type="date" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} /></Field>
            <Field label="Expected Delivery"><input className={inputCls} type="date" value={form.expectedDelivery} onChange={e => setForm({ ...form, expectedDelivery: e.target.value })} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Requested</option><option>Quoted</option><option>Ordered</option><option>Delivered</option><option>Cancelled</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addPO}><Plus size={15} /> Add Purchase Order</Btn>
        </Card>
      )}

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">PO #</th><th className="p-3">Supplier</th><th className="p-3">Item</th><th className="p-3">Qty</th>
            <th className="p-3">Unit Price</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Expected</th>{canEdit && <th className="p-3"></th>}
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-gray-400 text-xs">No purchase orders yet.</td></tr>}
            {items.map(i => (
              <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{i.poNumber}</td><td className="p-3">{i.supplier}</td><td className="p-3">{i.item}</td>
                <td className="p-3">{i.quantity}</td><td className="p-3">{fmtMoney(i.unitPrice)}</td>
                <td className="p-3 font-semibold">{fmtMoney((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0))}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: LIGHTGRAY }}>{i.status}</span></td>
                <td className="p-3 text-xs">{i.expectedDelivery}</td>
                {canEdit && <td className="p-3"><button onClick={() => removePO(i.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= VARIANCE ANALYSIS ================= */
function VariancePage({ ws }) {
  const budgetR = ws.budget.Realistic || {};
  const rows = DEPARTMENTS.map(d => {
    const items = budgetR[d] || [];
    const budget = items.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);
    const forecast = items.reduce((s, i) => s + (Number(i.forecastCost) || Number(i.estimatedCost) || 0), 0);
    const actual = items.reduce((s, i) => s + (Number(i.actualCost) || 0), 0);
    const variance = actual - budget;
    const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
    let status = "Green";
    if (Math.abs(variancePct) > 15) status = "Red";
    else if (Math.abs(variancePct) > 5) status = "Yellow";
    return { name: d, budget, forecast, actual, variance, variancePct, status };
  }).filter(r => r.budget > 0 || r.actual > 0);

  const statusColor = { Green: "#16a34a", Yellow: "#d97706", Red: RED };

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Budget vs Forecast vs Actual (Realistic Scenario)</h3>
        {rows.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => fmtMoney(v)} />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill={DARKGRAY} radius={[6, 6, 0, 0]} />
              <Bar dataKey="forecast" name="Forecast" fill="#9ca3af" radius={[6, 6, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill={RED} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Department</th><th className="p-3">Budget</th><th className="p-3">Forecast</th><th className="p-3">Actual</th><th className="p-3">Variance</th><th className="p-3">Variance %</th><th className="p-3">Status</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-400 text-xs">No budget data yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.name} className="border-b border-gray-50">
                <td className="p-3">{r.name}</td><td className="p-3">{fmtMoney(r.budget)}</td><td className="p-3">{fmtMoney(r.forecast)}</td>
                <td className="p-3">{fmtMoney(r.actual)}</td>
                <td className="p-3" style={{ color: r.variance > 0 ? RED : "#16a34a" }}>{fmtMoney(r.variance)}</td>
                <td className="p-3">{r.variancePct.toFixed(1)}%</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: statusColor[r.status] }}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= RISK REGISTER ================= */
function RiskPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ description: "", category: "Financial", probability: 3, impact: 3, owner: "", mitigation: "", contingency: "", status: "Open" });
  const risks = ws.riskRegister;

  function addRisk() {
    if (!form.description) return;
    updateWs({ ...ws, riskRegister: [{ id: uid(), ...form }, ...risks] });
    setForm({ description: "", category: "Financial", probability: 3, impact: 3, owner: "", mitigation: "", contingency: "", status: "Open" });
  }
  function removeRisk(id) { updateWs({ ...ws, riskRegister: risks.filter(r => r.id !== id) }); }

  function severityColor(sev) { return sev >= 15 ? RED : sev >= 8 ? "#d97706" : "#16a34a"; }

  const heat = {};
  risks.forEach(r => {
    const key = `${r.probability}-${r.impact}`;
    heat[key] = (heat[key] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-5">
      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Risk</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Financial</option><option>Schedule</option><option>Technical</option><option>Sponsor</option><option>Operational</option>
              </select>
            </Field>
            <Field label="Probability (1-5)"><input className={inputCls} type="number" min="1" max="5" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} /></Field>
            <Field label="Impact (1-5)"><input className={inputCls} type="number" min="1" max="5" value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} /></Field>
            <Field label="Owner"><input className={inputCls} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></Field>
            <Field label="Mitigation Plan"><input className={inputCls} value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} /></Field>
            <Field label="Contingency Plan"><input className={inputCls} value={form.contingency} onChange={e => setForm({ ...form, contingency: e.target.value })} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Open</option><option>Mitigated</option><option>Closed</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addRisk}><Plus size={15} /> Add Risk</Btn>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">5×5 Risk Heatmap (Impact →, Probability ↑)</h3>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(5, 1fr)", maxWidth: 340 }}>
          {[5, 4, 3, 2, 1].map(p => [1, 2, 3, 4, 5].map(i => {
            const sev = p * i;
            const count = heat[`${p}-${i}`] || 0;
            return (
              <div key={`${p}-${i}`} className="aspect-square rounded-md flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: severityColor(sev), opacity: count > 0 ? 1 : 0.25 }}>
                {count > 0 ? count : ""}
              </div>
            );
          }))}
        </div>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Description</th><th className="p-3">Category</th><th className="p-3">Severity</th><th className="p-3">Owner</th><th className="p-3">Status</th>{canEdit && <th className="p-3"></th>}
          </tr></thead>
          <tbody>
            {risks.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400 text-xs">No risks logged yet.</td></tr>}
            {risks.slice().sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)).map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{r.description}</td><td className="p-3">{r.category}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: severityColor(r.probability * r.impact) }}>{r.probability * r.impact}</span></td>
                <td className="p-3">{r.owner}</td>
                <td className="p-3">{r.status}</td>
                {canEdit && <td className="p-3"><button onClick={() => removeRisk(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= RACI MATRIX ================= */
function RaciPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ activity: "", responsible: "", accountable: "", consulted: "", informed: "" });
  const rows = ws.raci;

  function addRow() {
    if (!form.activity) return;
    updateWs({ ...ws, raci: [...rows, { id: uid(), ...form }] });
    setForm({ activity: "", responsible: "", accountable: "", consulted: "", informed: "" });
  }
  function removeRow(id) { updateWs({ ...ws, raci: rows.filter(r => r.id !== id) }); }

  function exportCSV() {
    const header = "Activity,Responsible,Accountable,Consulted,Informed\n";
    const body = rows.map(r => [r.activity, r.responsible, r.accountable, r.consulted, r.informed].join(",")).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "raci-matrix.csv"; a.click();
  }

  return (
    <div className="flex flex-col gap-5">
      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="Activity"><input className={inputCls} value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} /></Field>
            <Field label="Responsible"><input className={inputCls} value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></Field>
            <Field label="Accountable"><input className={inputCls} value={form.accountable} onChange={e => setForm({ ...form, accountable: e.target.value })} /></Field>
            <Field label="Consulted"><input className={inputCls} value={form.consulted} onChange={e => setForm({ ...form, consulted: e.target.value })} /></Field>
            <Field label="Informed"><input className={inputCls} value={form.informed} onChange={e => setForm({ ...form, informed: e.target.value })} /></Field>
          </div>
          <Btn className="mt-3" onClick={addRow}><Plus size={15} /> Add Row</Btn>
        </Card>
      )}
      <div><Btn variant="ghost" onClick={exportCSV}><Download size={14} /> Export Matrix (CSV)</Btn></div>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Activity</th><th className="p-3">R</th><th className="p-3">A</th><th className="p-3">C</th><th className="p-3">I</th>{canEdit && <th className="p-3"></th>}
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400 text-xs">No activities added yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3 font-medium">{r.activity}</td><td className="p-3">{r.responsible}</td><td className="p-3">{r.accountable}</td>
                <td className="p-3">{r.consulted}</td><td className="p-3">{r.informed}</td>
                {canEdit && <td className="p-3"><button onClick={() => removeRow(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= PROJECT SCHEDULE ================= */
function SchedulePage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ name: "", department: DEPARTMENTS[0], plannedDate: "", actualDate: "", status: "Not Started", progress: 0 });
  const milestones = ws.schedule;
  const statusColor = { "Not Started": "#9ca3af", "In Progress": "#d97706", "Done": "#16a34a", "Delayed": RED };

  function addMilestone() {
    if (!form.name) return;
    updateWs({ ...ws, schedule: [...milestones, { id: uid(), ...form }].sort((a, b) => (a.plannedDate || "").localeCompare(b.plannedDate || "")) });
    setForm({ name: "", department: DEPARTMENTS[0], plannedDate: "", actualDate: "", status: "Not Started", progress: 0 });
  }
  function removeMilestone(id) { updateWs({ ...ws, schedule: milestones.filter(m => m.id !== id) }); }

  const completed = milestones.filter(m => m.status === "Done").length;
  const delayed = milestones.filter(m => m.status === "Delayed").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Milestones" value={milestones.length} />
        <StatCard label="Completed" value={completed} accent="#16a34a" />
        <StatCard label="Delayed" value={delayed} accent={delayed > 0 ? RED : DARKGRAY} />
      </div>

      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Milestone</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Department">
              <select className={inputCls} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Planned Date"><input className={inputCls} type="date" value={form.plannedDate} onChange={e => setForm({ ...form, plannedDate: e.target.value })} /></Field>
            <Field label="Actual Date"><input className={inputCls} type="date" value={form.actualDate} onChange={e => setForm({ ...form, actualDate: e.target.value })} /></Field>
            <Field label="Progress %"><input className={inputCls} type="number" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Not Started</option><option>In Progress</option><option>Done</option><option>Delayed</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addMilestone}><Plus size={15} /> Add Milestone</Btn>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Timeline</h3>
        <div className="flex flex-col gap-3">
          {milestones.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No milestones yet.</p>}
          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-500 truncate">{m.plannedDate || "—"}</div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{m.name} <span className="text-gray-400">· {m.department}</span></span>
                  <span style={{ color: statusColor[m.status] }}>{m.status}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.progress || 0}%`, backgroundColor: statusColor[m.status] }} />
                </div>
              </div>
              {canEdit && <button onClick={() => removeMilestone(m.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= KPI DASHBOARD ================= */
function KpiPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ name: "", category: "Financial", target: "", current: "", unit: "%", owner: "" });
  const kpis = ws.kpis;

  function addKpi() {
    if (!form.name) return;
    updateWs({ ...ws, kpis: [{ id: uid(), ...form }, ...kpis] });
    setForm({ name: "", category: "Financial", target: "", current: "", unit: "%", owner: "" });
  }
  function removeKpi(id) { updateWs({ ...ws, kpis: kpis.filter(k => k.id !== id) }); }

  function achievement(k) {
    const t = Number(k.target), c = Number(k.current);
    if (!t) return null;
    return (c / t) * 100;
  }
  function light(pct) { if (pct === null) return "#9ca3af"; return pct >= 90 ? "#16a34a" : pct >= 70 ? "#d97706" : RED; }

  return (
    <div className="flex flex-col gap-5">
      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add KPI</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="KPI Name"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Financial</option><option>Fundraising</option><option>Cost Efficiency</option><option>Schedule</option><option>Sponsor</option>
              </select>
            </Field>
            <Field label="Target"><input className={inputCls} type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} /></Field>
            <Field label="Current"><input className={inputCls} type="number" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} /></Field>
            <Field label="Owner"><input className={inputCls} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></Field>
          </div>
          <Btn className="mt-3" onClick={addKpi}><Plus size={15} /> Add KPI</Btn>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => {
          const pct = achievement(k);
          return (
            <Card key={k.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-500">{k.name}</span>
                <span className="w-2.5 h-2.5 rounded-full mt-1" style={{ backgroundColor: light(pct) }} />
              </div>
              <span className="text-xl font-bold" style={{ color: DARKGRAY }}>{k.current}{k.unit === "%" ? "%" : ""} <span className="text-xs text-gray-400 font-normal">/ {k.target}{k.unit === "%" ? "%" : ""}</span></span>
              <span className="text-xs text-gray-400">{k.category} · {k.owner}</span>
              {canEdit && <button onClick={() => removeKpi(k.id)} className="text-xs text-gray-400 hover:text-red-600 self-start mt-1">Remove</button>}
            </Card>
          );
        })}
        {kpis.length === 0 && <p className="text-xs text-gray-400 col-span-full text-center py-6">No KPIs tracked yet.</p>}
      </div>
    </div>
  );
}

/* ================= BALANCED SCORECARD ================= */
function ScorecardPage({ ws, updateWs, canEdit }) {
  const PERSPECTIVES = ["Financial", "Sponsors", "Internal Processes", "Learning & Growth"];
  const [form, setForm] = useState({ perspective: "Financial", kpi: "", target: "", current: "", trend: "Flat", owner: "", status: "On Track" });
  const rows = ws.scorecard;

  function addRow() {
    if (!form.kpi) return;
    updateWs({ ...ws, scorecard: [...rows, { id: uid(), ...form }] });
    setForm({ perspective: "Financial", kpi: "", target: "", current: "", trend: "Flat", owner: "", status: "On Track" });
  }
  function removeRow(id) { updateWs({ ...ws, scorecard: rows.filter(r => r.id !== id) }); }

  const statusColor = { "On Track": "#16a34a", "At Risk": "#d97706", "Off Track": RED };

  return (
    <div className="flex flex-col gap-5">
      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Scorecard KPI</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Perspective">
              <select className={inputCls} value={form.perspective} onChange={e => setForm({ ...form, perspective: e.target.value })}>
                {PERSPECTIVES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="KPI"><input className={inputCls} value={form.kpi} onChange={e => setForm({ ...form, kpi: e.target.value })} /></Field>
            <Field label="Target"><input className={inputCls} value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} /></Field>
            <Field label="Current"><input className={inputCls} value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} /></Field>
            <Field label="Owner"><input className={inputCls} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} /></Field>
            <Field label="Trend">
              <select className={inputCls} value={form.trend} onChange={e => setForm({ ...form, trend: e.target.value })}>
                <option>Up</option><option>Flat</option><option>Down</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>On Track</option><option>At Risk</option><option>Off Track</option>
              </select>
            </Field>
          </div>
          <Btn className="mt-3" onClick={addRow}><Plus size={15} /> Add</Btn>
        </Card>
      )}

      {PERSPECTIVES.map(p => {
        const items = rows.filter(r => r.perspective === p);
        return (
          <Card key={p} className="p-0 overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-700 p-4 pb-0">{p}</h3>
            <table className="w-full text-sm mt-2">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">KPI</th><th className="p-3">Target</th><th className="p-3">Current</th><th className="p-3">Trend</th><th className="p-3">Owner</th><th className="p-3">Status</th>{canEdit && <th className="p-3"></th>}
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400 text-xs">No KPIs in this perspective.</td></tr>}
                {items.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="p-3">{r.kpi}</td><td className="p-3">{r.target}</td><td className="p-3">{r.current}</td><td className="p-3">{r.trend}</td><td className="p-3">{r.owner}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: statusColor[r.status] }}>{r.status}</span></td>
                    {canEdit && <td className="p-3"><button onClick={() => removeRow(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}

/* ================= REPORTS ================= */
function ReportsPage({ ws }) {
  function downloadCSV(filename, header, rows) {
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  }
  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  }

  const budgetR = ws.budget.Realistic || {};
  const allItems = Object.entries(budgetR).flatMap(([dept, items]) => items.map(i => ({ ...i, department: dept })));

  const reports = [
    {
      title: "Budget Report", desc: "All budget items across departments (Realistic scenario).",
      action: () => downloadCSV("budget-report.csv", "Department,Description,Estimated,Actual,Forecast,Supplier,PaidBy",
        allItems.map(i => [i.department, i.description, i.estimatedCost, i.actualCost, i.forecastCost, i.supplier, i.paidBy].join(",")))
    },
    {
      title: "Sponsor Report", desc: "Full sponsor list with investment and pipeline status.",
      action: () => downloadCSV("sponsor-report.csv", "Name,Company,Investment,Type,Status",
        ws.sponsors.map(s => [s.name, s.company, s.investment, s.contributionType, s.status].join(",")))
    },
    {
      title: "Transactions Report", desc: "Complete financial ledger export.",
      action: () => downloadCSV("transactions-report.csv", "Date,Description,Category,Department,Amount,Type,Status",
        ws.transactions.map(t => [t.date, t.description, t.category, t.department, t.amount, t.type, t.status].join(",")))
    },
    {
      title: "Risk Report", desc: "Risk register with severity scoring.",
      action: () => downloadCSV("risk-report.csv", "Description,Category,Probability,Impact,Severity,Owner,Status",
        ws.riskRegister.map(r => [r.description, r.category, r.probability, r.impact, r.probability * r.impact, r.owner, r.status].join(",")))
    },
    {
      title: "KPI Report", desc: "All tracked KPIs with target vs current.",
      action: () => downloadCSV("kpi-report.csv", "Name,Category,Target,Current,Owner",
        ws.kpis.map(k => [k.name, k.category, k.target, k.current, k.owner].join(",")))
    },
    {
      title: "Executive Summary", desc: "Full workspace snapshot as JSON — budget, sponsors, EVM, reserve.",
      action: () => downloadJSON("executive-summary.json", {
        generatedAt: new Date().toISOString(),
        sponsors: ws.sponsors, reserve: ws.reserve, evmHistory: ws.evmHistory.slice(0, 5), riskRegister: ws.riskRegister
      })
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map(r => (
        <Card key={r.title} className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileText size={16} color={RED} />
            <h3 className="text-sm font-bold text-gray-800">{r.title}</h3>
          </div>
          <p className="text-xs text-gray-500 flex-1">{r.desc}</p>
          <Btn variant="ghost" onClick={r.action}><Download size={14} /> Export</Btn>
        </Card>
      ))}
    </div>
  );
}

/* ================= DOCUMENTS ================= */
function DocumentsPage({ ws, updateWs, canEdit }) {
  const [form, setForm] = useState({ name: "", category: "Invoice", tags: "", notes: "" });
  const [search, setSearch] = useState("");
  const docs = ws.documents;

  function addDoc() {
    if (!form.name) return;
    updateWs({ ...ws, documents: [{ id: uid(), ...form, date: new Date().toISOString().slice(0, 10) }, ...docs] });
    setForm({ name: "", category: "Invoice", tags: "", notes: "" });
  }
  function removeDoc(id) { updateWs({ ...ws, documents: docs.filter(d => d.id !== id) }); }
  const filtered = docs.filter(d => (d.name + d.tags + d.category).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-gray-400">This tracks document records (name, category, tags, notes). File attachments should be linked via Invoice/Receipt Upload fields in Budget items for now.</p>
      {canEdit && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Add Document Record</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Invoice</option><option>Receipt</option><option>Contract</option><option>Sponsor Agreement</option><option>Purchase Order</option><option>Portfolio</option><option>Other</option>
              </select>
            </Field>
            <Field label="Tags"><input className={inputCls} placeholder="comma, separated" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <Btn className="mt-3" onClick={addDoc}><Plus size={15} /> Add Record</Btn>
        </Card>
      )}

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <input className={inputCls + " pl-8"} placeholder="Search documents" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {filtered.map(d => (
          <Card key={d.id} className="p-4 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: LIGHTGRAY }}><Folder size={18} color={RED} /></div>
            <span className="text-sm font-semibold text-gray-800 truncate">{d.name}</span>
            <span className="text-xs text-gray-400">{d.category} · {d.date}</span>
            {d.tags && <span className="text-xs text-gray-400">🏷 {d.tags}</span>}
            {canEdit && <button onClick={() => removeDoc(d.id)} className="text-xs text-gray-400 hover:text-red-600 self-start">Remove</button>}
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-xs text-gray-400 col-span-full text-center py-6">No documents recorded yet.</p>}
      </div>
    </div>
  );
}

/* ================= USER MANAGEMENT ================= */
function UsersPage({ users, setUsers }) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(u => (u.name + u.email).toLowerCase().includes(search.toLowerCase()));
  function toggleEnabled(id) { setUsers(users.map(u => u.id === id ? { ...u, enabled: !u.enabled } : u)); }
  function removeUser(id) { setUsers(users.filter(u => u.id !== id)); }
  function resetPassword(id) {
    const newPw = Math.random().toString(36).slice(2, 8);
    setUsers(users.map(u => u.id === id ? { ...u, password: btoa(newPw) } : u));
    alert(`New temporary password: ${newPw}`);
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
        <input className={inputCls + " pl-8"} placeholder="Search users" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th>
            <th className="p-3">Created</th><th className="p-3">Last Login</th><th className="p-3">Status</th><th className="p-3">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.role}</td>
                <td className="p-3 text-xs">{(u.createdAt || "").slice(0, 10)}</td>
                <td className="p-3 text-xs">{u.lastLogin ? u.lastLogin.slice(0, 10) : "Never"}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: u.enabled ? "#dcfce7" : "#fee2e2", color: u.enabled ? "#16a34a" : RED }}>
                    {u.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  {u.role !== "Administrator" && (
                    <>
                      <button onClick={() => toggleEnabled(u.id)} className="text-xs px-2 py-1 rounded-lg border border-gray-200">{u.enabled ? "Disable" : "Enable"}</button>
                      <button onClick={() => resetPassword(u.id)} className="text-xs px-2 py-1 rounded-lg border border-gray-200">Reset PW</button>
                      <button onClick={() => removeUser(u.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ================= SETTINGS ================= */
function SettingsPage({ ws, updateWs }) {
  function exportData() {
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "seven-speed-backup.json"; a.click();
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        updateWs(normalizeWorkspace(parsed));
        alert("Backup restored successfully.");
      } catch (err) { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
  }
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Data & Backup</h3>
        <div className="flex flex-wrap gap-3">
          <Btn onClick={exportData}><Download size={15} /> Export Database</Btn>
          <label>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 cursor-pointer">
              <Upload size={15} /> Import / Restore Backup
            </span>
            <input type="file" accept="application/json" className="hidden" onChange={importData} />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-3">All data auto-saves to your workspace as you work — no manual save required.</p>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Preferences</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <select className={inputCls} value={ws.settings.currency} onChange={e => updateWs({ ...ws, settings: { ...ws.settings, currency: e.target.value } })}>
              <option>USD</option><option>EUR</option><option>BRL</option><option>GBP</option>
            </select>
          </Field>
          <Field label="Language"><input className={inputCls} value="English" disabled /></Field>
        </div>
      </Card>
    </div>
  );
}

/* ================= ERROR BOUNDARY ================= */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-md text-center">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">{String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}</p>
            <Btn onClick={() => this.setState({ error: null })}>Try Again</Btn>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ================= HUB SCREEN ================= */
function HubScreen({ user, onSelect, onLogout }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: `linear-gradient(135deg, #0b0b0d, #1f2937)` }}>
      <div className="absolute top-6 right-6">
        <button onClick={onLogout} className="text-gray-400 hover:text-white text-sm font-semibold flex items-center gap-2">
          <LogOut size={16} /> Sair
        </button>
      </div>
      
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-6 shadow-lg" style={{ backgroundColor: RED }}>7S</div>
      <h1 className="text-white text-3xl font-bold mb-2">Portal Seven Speed</h1>
      <p className="text-gray-400 text-sm mb-10">Olá, {user.name}. O que deseja aceder?</p>
      
      <div className="flex gap-6 flex-wrap justify-center">
        {/* Quadrado 1: Financeiro */}
        <div 
          className="p-8 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition w-64 h-64 bg-white rounded-2xl shadow-sm border border-gray-100" 
          onClick={() => onSelect('financial')}
        >
          <Wallet size={56} color="#D90429" className="mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Financeiro</h2>
          <p className="text-xs text-gray-500 text-center mt-2">ERP, Orçamentos, Cash Flow e Transações</p>
        </div>
        
        {/* Quadrado 2: Captação */}
        <div 
          className="p-8 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition w-64 h-64 bg-white rounded-2xl shadow-sm border border-gray-100" 
          onClick={() => onSelect('captacao')}
        >
          <Target size={56} color="#D90429" className="mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Captação</h2>
          <p className="text-xs text-gray-500 text-center mt-2">Patrocinadores, Hierarquia, CRM e AIDA</p>
        </div>
      </div>
    </div>
  );
}

/* ================= APP ================= */
function AppInner() {
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([DEFAULT_ADMIN]);
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [regError, setRegError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState({});
  const [activeModule, setActiveModule] = useState(null);

  useEffect(() => {
    (async () => {
      const storedUsers = await loadJSON("ss_users", null);
      const finalUsers = storedUsers && storedUsers.length ? storedUsers : [DEFAULT_ADMIN];
      setUsers(finalUsers);
      const sess = await loadJSON("ss_session", null);
      if (sess) {
        const u = finalUsers.find(u => u.id === sess.id && u.enabled);
        if (u) setSession(u);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (!loading) saveJSON("ss_users", users); }, [users, loading]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const ws = await loadJSON(`ss_workspace_${session.id}`, null);
      setWorkspaces(w => ({ ...w, [session.id]: normalizeWorkspace(ws) }));
    })();
  }, [session]);

  function updateWorkspace(next) {
    setWorkspaces(w => {
      const merged = { ...w, [session.id]: next };
      saveJSON(`ss_workspace_${session.id}`, next);
      return merged;
    });
  }

  function handleLogin(u, remember) {
    const updated = users.map(x => x.id === u.id ? { ...x, lastLogin: new Date().toISOString() } : x);
    setUsers(updated);
    setSession({ ...u, lastLogin: new Date().toISOString() });
    if (remember) saveJSON("ss_session", { id: u.id });
    setPage("dashboard");
  }

  function handleRegister({ name, email, password }) {
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setRegError("An account with this email already exists.");
      return;
    }
    const newUser = { id: uid(), name, email, password: btoa(password), role: "Read Only", enabled: true, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() };
    const updated = [...users, newUser];
    setUsers(updated);
    setSession(newUser);
    saveJSON("ss_session", { id: newUser.id });
    setRegError("");
    setPage("dashboard");
  }

  function handleLogout() {
    setSession(null);
    saveJSON("ss_session", null);
    setAuthView("login");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 text-sm">Loading Seven Speed Platform…</div>;
  }

  if (!session) {
    return authView === "login"
      ? <LoginScreen users={users} onLogin={handleLogin} onGoRegister={() => setAuthView("register")} />
      : <RegisterScreen onRegister={handleRegister} onBack={() => { setAuthView("login"); setRegError(""); }} error={regError} />;
  }

  const ws = workspaces[session.id] || emptyWorkspace();
  const canEdit = session.role !== "Read Only";
  const pageLabel = (MENU.find(m => m.key === page)?.label) || (page === "users" ? "User Management" : "Dashboard");

  // Se o utilizador não escolheu nenhum módulo, mostra os 2 quadrados
  if (!activeModule) {
    return <HubScreen user={session} onSelect={setActiveModule} onLogout={handleLogout} />;
  }

  // Se o utilizador escolheu a Captação, mostramos o ficheiro HTML dentro de um iframe
  if (activeModule === 'captacao') {
    return (
      <div className="w-full h-screen flex flex-col">
        {/* Barra superior preta para conseguir voltar ao menu */}
        <div className="bg-[#0b0b0d] text-white px-5 py-3 flex justify-between items-center shadow-md z-10">
          <span className="font-bold text-sm flex items-center gap-3">
            <div className="w-7 h-7 rounded flex items-center justify-center font-black text-xs" style={{ backgroundColor: RED }}>7S</div>
            Sistema de Captação e CRM
          </span>
          <button onClick={() => setActiveModule(null)} className="text-xs font-semibold px-4 py-2 rounded transition" style={{ backgroundColor: RED }}>
            Voltar ao Menu
          </button>
        </div>
        {/* Carrega o HTML da captação em ecrã inteiro */}
        <iframe src="/captacao.html" className="w-full flex-1 border-0" title="Captação Seven Speed"></iframe>
      </div>
    );
  }

  let content;
  if (page === "dashboard") content = <DashboardPage ws={ws} />;
  else if (page === "budget") content = <BudgetPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "transactions") content = <TransactionsPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "sponsors") content = <SponsorsPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "pert") content = <PertPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "evm") content = <EvmPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "reserve") content = <ReservePage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "cashflow") content = <CashflowPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "procurement") content = <ProcurementPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "variance") content = <VariancePage ws={ws} />;
  else if (page === "risk") content = <RiskPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "raci") content = <RaciPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "schedule") content = <SchedulePage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "kpi") content = <KpiPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "scorecard") content = <ScorecardPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "reports") content = <ReportsPage ws={ws} />;
  else if (page === "documents") content = <DocumentsPage ws={ws} updateWs={updateWorkspace} canEdit={canEdit} />;
  else if (page === "settings") content = <SettingsPage ws={ws} updateWs={updateWorkspace} />;
  else if (page === "users" && session.role === "Administrator") content = <UsersPage users={users} setUsers={setUsers} />;
  else content = <DashboardPage ws={ws} />;

  return (
    <div className="min-h-screen flex bg-gray-50" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');`}</style>
      <Sidebar page={page} setPage={setPage} role={session.role} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isDesktop={isDesktop} onBack={() => setActiveModule(null)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={session} onLogout={handleLogout} setMobileOpen={setMobileOpen} pageLabel={pageLabel} isDesktop={isDesktop} />
        <main className="p-5 flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
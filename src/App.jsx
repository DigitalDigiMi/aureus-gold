import { useState, useEffect, useRef } from "react";

const GOLD = "#D4A84B";
const GOLD_LIGHT = "#F5D78E";
const GOLD_DARK = "#8B6914";
const BG0 = "#0A0B0E";
const BG1 = "#12141A";
const BG2 = "#181B23";
const BG3 = "#1E2130";
const GREEN = "#22C55E";
const RED = "#EF4444";
const T1 = "#E8E6E1";
const T2 = "#8A8D98";
const T3 = "#555866";

/* helpers */
function rnd(a, b) { return Math.random() * (b - a) + a; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function ft(ts) { return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }
function fp(p) { return p.toFixed(2); }

/* candle generation */
function makeCandles(n, base) {
  const out = [];
  let p = base;
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const o = p;
    const mv = (Math.random() - 0.48) * p * 0.003;
    const c = o + mv;
    const h = Math.max(o, c) + Math.random() * p * 0.0015;
    const l = Math.min(o, c) - Math.random() * p * 0.0015;
    const v = Math.floor(rnd(800, 5000));
    out.push({ t: now - i * 5 * 60000, o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2), v });
    p = c;
  }
  return out;
}

/* patterns */
const PATS = [
  { name: "Bullish Engulfing", dir: "BUY", wr: 68, ico: "▲" },
  { name: "Hammer", dir: "BUY", wr: 65, ico: "🔨" },
  { name: "Three White Soldiers", dir: "BUY", wr: 72, ico: "⬆" },
  { name: "Bearish Engulfing", dir: "SELL", wr: 66, ico: "▼" },
  { name: "Double Top", dir: "SELL", wr: 70, ico: "⏫" },
  { name: "Morning Star", dir: "BUY", wr: 71, ico: "☀" },
  { name: "Evening Star", dir: "SELL", wr: 69, ico: "🌙" },
  { name: "Doji Star", dir: "BUY", wr: 62, ico: "✦" },
];

function mkSig(entry, cTime, isLive) {
  const p = PATS[Math.floor(Math.random() * PATS.length)];
  const wr = clamp(p.wr + Math.floor(rnd(-5, 8)), 55, 85);
  const sl = +rnd(4, 10).toFixed(1);
  const tp = +(sl * 3).toFixed(1);
  const buy = p.dir === "BUY";
  const tpP = buy ? entry + tp : entry - tp;
  const slP = buy ? entry - sl : entry + sl;
  const won = Math.random() * 100 < wr;
  const exit = isLive ? null : (won ? tpP : slP);
  const pips = exit ? (buy ? exit - entry : entry - exit) : null;
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: cTime, pattern: p.name, dir: p.dir, ico: p.ico,
    entry: +entry.toFixed(2), tp: +tpP.toFixed(2), sl: +slP.toFixed(2), wr,
    live: isLive, status: isLive ? null : (won ? "WIN" : "LOSS"),
    exit: exit ? +exit.toFixed(2) : null,
    pnl: pips !== null ? +(pips * 100).toFixed(2) : null,
  };
}

/* create historical signals pinned to actual candle timestamps */
function mkHist(candles) {
  const pool = candles.slice(4, -2);
  const ct = Math.min(12, Math.floor(pool.length * 0.3));
  const step = Math.floor(pool.length / ct);
  const out = [];
  for (let i = 0; i < ct; i++) {
    const c = pool[i * step];
    if (c) out.push(mkSig(c.c, c.t, false));
  }
  return out.sort((a, b) => b.time - a.time);
}

/* ─── Google icon ─── */
function GIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

/* ─── Sparkline ─── */
function Spark({ data, w = 120, h = 32, color = GOLD }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * h}`).join(" ");
  return <svg width={w} height={h} style={{ display: "block" }}><polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} /></svg>;
}

/* ─── Probability Bar ─── */
function PB({ pct, sm }) {
  const col = pct >= 70 ? GREEN : pct >= 60 ? GOLD : RED;
  const hh = sm ? 5 : 8, ww = sm ? 80 : 120;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: ww, height: hh, background: "#1a1d28", borderRadius: hh / 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: hh / 2, background: `linear-gradient(90deg, ${col}88, ${col})`, transition: "width 0.5s" }} />
      </div>
      <span style={{ color: col, fontSize: sm ? 11 : 13, fontWeight: 700, fontFamily: "monospace", minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

/* ═══════════════ CANDLESTICK CHART ═══════════════ */
function Chart({ candles, signals, width, height = 370 }) {
  if (!candles.length || width < 100) return null;
  const pad = { t: 18, r: 62, b: 32, l: 8 };
  const cw = width - pad.l - pad.r;
  const ch = height - pad.t - pad.b;
  const highs = candles.map(c => c.h), lows = candles.map(c => c.l);
  const minP = Math.min(...lows) - 3, maxP = Math.max(...highs) + 3;
  const pR = maxP - minP || 1;
  const gap = cw / candles.length;
  const bw = Math.max(2, gap * 0.55);
  const y = (p) => pad.t + ch - ((p - minP) / pR) * ch;
  const x = (i) => pad.l + i * gap + gap / 2;

  // build signal → nearest candle index lookup
  const sigMap = new Map();
  signals.forEach(sig => {
    let best = -1, bd = Infinity;
    candles.forEach((c, i) => { const d = Math.abs(c.t - sig.time); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 10 * 60000) {
      // only keep one signal per candle (latest)
      if (!sigMap.has(best) || sig.time > sigMap.get(best).time) sigMap.set(best, sig);
    }
  });

  // grid
  const gridEls = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const p = minP + (pR / steps) * i;
    const yy = y(p);
    gridEls.push(
      <g key={`g${i}`}>
        <line x1={pad.l} y1={yy} x2={width - pad.r} y2={yy} stroke="#1a1d28" strokeWidth="1" />
        <text x={width - pad.r + 5} y={yy + 3.5} fill={T3} fontSize="9" fontFamily="'JetBrains Mono',monospace">{p.toFixed(0)}</text>
      </g>
    );
  }

  // time axis
  const timeEls = [];
  const tStep = Math.max(1, Math.floor(candles.length / 8));
  for (let i = 0; i < candles.length; i += tStep) {
    timeEls.push(
      <text key={`t${i}`} x={x(i)} y={height - 6} textAnchor="middle" fill={T3} fontSize="8" fontFamily="'JetBrains Mono',monospace">{ft(candles[i].t)}</text>
    );
  }

  const maxVol = Math.max(...candles.map(c => c.v));
  const lastC = candles[candles.length - 1];
  const priceY = y(lastC.c);

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.25" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {gridEls}
      {timeEls}
      {/* volume */}
      {candles.map((c, i) => {
        const vh = (c.v / maxVol) * 28;
        return <rect key={`v${i}`} x={x(i) - bw / 2} y={height - pad.b - vh} width={bw} height={vh} fill="url(#vg)" rx="1" />;
      })}
      {/* candles */}
      {candles.map((c, i) => {
        const xx = x(i);
        const bull = c.c >= c.o;
        const col = bull ? GREEN : RED;
        const top = y(Math.max(c.o, c.c));
        const bot = y(Math.min(c.o, c.c));
        const bh = Math.max(1, bot - top);
        return (
          <g key={`c${i}`}>
            <line x1={xx} y1={y(c.h)} x2={xx} y2={y(c.l)} stroke={col} strokeWidth="1" opacity="0.6" />
            <rect x={xx - bw / 2} y={top} width={bw} height={bh} fill={col} rx="0.5" opacity="0.9" />
          </g>
        );
      })}
      {/* signal markers with TP/SL zones */}
      {[...sigMap.entries()].map(([ci, sig]) => {
        const xx = x(ci);
        const candle = candles[ci];
        const isBuy = sig.dir === "BUY";
        const cy2 = isBuy ? y(candle.l) + 14 : y(candle.h) - 14;
        const col = isBuy ? GREEN : RED;
        const tpY = y(sig.tp), slY = y(sig.sl);
        const zL = Math.max(pad.l, xx - 25);
        const zR = Math.min(width - pad.r, xx + 25);
        return (
          <g key={`sig${ci}`}>
            <rect x={zL} y={Math.min(tpY, slY)} width={zR - zL} height={Math.abs(tpY - slY)} fill={isBuy ? GREEN : RED} opacity="0.04" rx="2" />
            <line x1={zL} y1={tpY} x2={zR} y2={tpY} stroke={GREEN} strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
            <line x1={zL} y1={slY} x2={zR} y2={slY} stroke={RED} strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
            <circle cx={xx} cy={cy2} r={7} fill={col} opacity="0.9" />
            <text x={xx} y={cy2 + 3.5} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">{isBuy ? "B" : "S"}</text>
            <text x={xx} y={isBuy ? cy2 + 20 : cy2 - 14} textAnchor="middle" fill={col} fontSize="7" opacity="0.7">{sig.pattern.split(" ")[0]}</text>
          </g>
        );
      })}
      {/* current price */}
      <line x1={pad.l} y1={priceY} x2={width - pad.r} y2={priceY} stroke={GOLD} strokeWidth="1" strokeDasharray="4,3" opacity="0.45" />
      <rect x={width - pad.r - 2} y={priceY - 10} width={60} height={20} fill={GOLD} rx="4" />
      <text x={width - pad.r + 28} y={priceY + 3.5} textAnchor="middle" fill={BG0} fontSize="10" fontWeight="bold" fontFamily="'JetBrains Mono',monospace">{fp(lastC.c)}</text>
    </svg>
  );
}

/* ─── Signal Card ─── */
function SC({ sig, onTrade }) {
  const buy = sig.dir === "BUY";
  const ac = buy ? GREEN : RED;
  const w = sig.status === "WIN";
  return (
    <div style={{ background: BG2, borderRadius: 12, padding: "12px 14px", border: `1px solid ${sig.live ? GOLD + "50" : "#222538"}`, position: "relative", overflow: "hidden" }}>
      {sig.live && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, animation: "shimmer 2s infinite" }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: `${ac}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, border: `1px solid ${ac}25` }}>{sig.ico}</div>
          <div>
            <div style={{ color: T1, fontSize: 12, fontWeight: 600 }}>{sig.pattern}</div>
            <div style={{ color: T3, fontSize: 9, marginTop: 1 }}>{ft(sig.time)}</div>
          </div>
        </div>
        <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${ac}15`, color: ac, border: `1px solid ${ac}25`, letterSpacing: 0.5 }}>{sig.dir}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        {[["Entry", sig.entry, T1], ["TP (1:3)", sig.tp, GREEN], ["SL", sig.sl, RED]].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ color: T3, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>{l}</div>
            <div style={{ color: c, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{fp(v)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: T3, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 }}>Win Prob.</div>
          <PB pct={sig.wr} sm />
        </div>
        {sig.status ? (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: w ? GREEN : RED, padding: "1px 6px", borderRadius: 4, background: (w ? GREEN : RED) + "12" }}>{w ? "✓ WIN" : "✗ LOSS"}</div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginTop: 2, color: sig.pnl >= 0 ? GREEN : RED }}>{sig.pnl >= 0 ? "+" : ""}{sig.pnl.toFixed(2)} USD</div>
          </div>
        ) : sig.live ? (
          <button onClick={() => onTrade?.(sig)} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: BG0, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, boxShadow: `0 2px 10px ${GOLD}35` }}>PLACE TRADE</button>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════ LOGIN ═══════════════ */
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState(null);
  const [err, setErr] = useState("");

  const go = (type, user) => { setErr(""); setBusy(true); setVia(type); setTimeout(() => onLogin(user), type === "google" ? 1600 : type === "test" ? 800 : 1200); };
  const doEmail = () => { if (!email || !pass) return setErr("Enter email and password"); if (!email.includes("@")) return setErr("Invalid email"); go("email", { name: email.split("@")[0], email, plan: "Pro" }); };

  return (
    <div style={{ minHeight: "100vh", background: BG0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono','SF Mono',monospace", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: `linear-gradient(${GOLD} 1px, transparent 1px), linear-gradient(90deg, ${GOLD} 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)` }} />

      <div style={{ position: "relative", zIndex: 1, width: 400, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 14px", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: `0 6px 28px ${GOLD}30`, animation: "pulse 3s ease infinite" }}>⚡</div>
          <h1 style={{ color: GOLD, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: 3 }}>AUREUS</h1>
          <p style={{ color: T3, fontSize: 10, marginTop: 6, letterSpacing: 1.5 }}>XAUUSD SIGNAL INTELLIGENCE</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, padding: "8px 0", borderTop: `1px solid ${GOLD}10`, borderBottom: `1px solid ${GOLD}10` }}>
          {[["Signals Today", "47"], ["Win Rate", "68.4%"], ["Traders", "2,841"]].map(([l, v], i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>{v}</div>
              <div style={{ color: T3, fontSize: 7, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px 24px 20px", background: BG2, borderRadius: 18, border: `1px solid ${GOLD}12`, boxShadow: `0 20px 50px rgba(0,0,0,0.5)` }}>
          <button onClick={() => go("google", { name: "Trader", email: "trader@gmail.com", plan: "Pro", av: "G" })} disabled={busy} style={{ width: "100%", padding: "12px", border: `1px solid #2a2d3a`, borderRadius: 10, background: BG3, color: T1, fontSize: 13, fontWeight: 600, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {busy && via === "google" ? "CONNECTING..." : <><GIco /><span>Continue with Google</span></>}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
            <span style={{ color: T3, fontSize: 8, letterSpacing: 1 }}>OR SIGN IN WITH EMAIL</span>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
          </div>

          {err && <div style={{ padding: "7px 10px", borderRadius: 7, marginBottom: 12, background: RED + "10", border: `1px solid ${RED}20`, color: RED, fontSize: 11 }}>⚠ {err}</div>}

          <div style={{ marginBottom: 10 }}>
            <label style={{ color: T3, fontSize: 8, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doEmail()} placeholder="trader@aureus.io" style={{ width: "100%", padding: "10px 12px", background: BG3, border: `1px solid #2a2d3a`, borderRadius: 9, color: T1, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: T3, fontSize: 8, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Password</label>
            <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doEmail()} placeholder="••••••••" style={{ width: "100%", padding: "10px 12px", background: BG3, border: `1px solid #2a2d3a`, borderRadius: 9, color: T1, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>

          <button onClick={doEmail} disabled={busy} style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: busy && via === "email" ? T3 : `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: BG0, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", letterSpacing: 1.5, fontFamily: "inherit", boxShadow: busy ? "none" : `0 4px 16px ${GOLD}28` }}>
            {busy && via === "email" ? "AUTHENTICATING..." : "SIGN IN"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
            <span style={{ color: T3, fontSize: 8, letterSpacing: 1 }}>QUICK ACCESS</span>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
          </div>

          <button onClick={() => go("test", { name: "Demo Trader", email: "demo@aureus.io", plan: "Trial", av: "D" })} disabled={busy} style={{ width: "100%", padding: "11px", border: `1px dashed ${GOLD}30`, borderRadius: 10, background: `${GOLD}06`, color: GOLD, fontSize: 12, fontWeight: 600, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {busy && via === "test" ? "LOADING DEMO..." : <><span>🧪</span><span>Try with Test Account</span></>}
          </button>

          <div style={{ textAlign: "center", marginTop: 10, padding: 6, background: `${BG3}80`, borderRadius: 6 }}>
            <span style={{ color: T3, fontSize: 9 }}>Test: <span style={{ color: T2 }}>demo@aureus.io / demo1234</span></span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 16 }}>
          {[{ n: "Starter", p: "$99/mo", f: "10 sig/day" }, { n: "Pro", p: "$299/mo", f: "Unlimited", a: true }, { n: "Elite", p: "$799/mo", f: "API + Priority" }].map((x, i) => (
            <div key={i} style={{ padding: "6px 12px", borderRadius: 7, textAlign: "center", background: x.a ? `${GOLD}10` : "transparent", border: `1px solid ${x.a ? GOLD + "25" : "#1a1d28"}` }}>
              <div style={{ color: x.a ? GOLD : T3, fontSize: 9, fontWeight: 700 }}>{x.n}</div>
              <div style={{ color: x.a ? GOLD_LIGHT : T3, fontSize: 11, fontWeight: 800, margin: "1px 0" }}>{x.p}</div>
              <div style={{ color: T3, fontSize: 7 }}>{x.f}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: T3, fontSize: 8, marginTop: 8 }}>7-day free trial · No credit card</p>
      </div>
    </div>
  );
}

/* ═══════════════ DASHBOARD ═══════════════ */
function Dashboard({ user, onLogout }) {
  const BASE = 5153.12;
  const [candles, setCandles] = useState(() => makeCandles(60, BASE));
  const [signals, setSignals] = useState([]);
  const [modal, setModal] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [notes, setNotes] = useState([]);
  const boxRef = useRef(null);
  const [cw, setCw] = useState(700);

  // keep refs for interval callbacks (avoid stale closures)
  const candlesRef = useRef(candles);
  useEffect(() => { candlesRef.current = candles; }, [candles]);

  // init history signals from candle data (once)
  useEffect(() => { setSignals(mkHist(candles)); }, []); // eslint-disable-line

  // responsive chart width via ResizeObserver
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setCw(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // live tick — mutate last candle's close every 1.5s
  useEffect(() => {
    const id = setInterval(() => {
      setCandles(prev => {
        const next = [...prev];
        const last = { ...next[next.length - 1] };
        const mv = (Math.random() - 0.48) * last.c * 0.0008;
        last.c = +(last.c + mv).toFixed(2);
        last.h = Math.max(last.h, last.c);
        last.l = Math.min(last.l, last.c);
        last.v += Math.floor(Math.random() * 40);
        next[next.length - 1] = last;
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // push new candle every 25s
  useEffect(() => {
    const id = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(1), { t: Date.now(), o: last.c, h: last.c, l: last.c, c: last.c, v: Math.floor(rnd(600, 3000)) }];
      });
    }, 25000);
    return () => clearInterval(id);
  }, []);

  // generate live signal every ~18s (pinned to latest candle time)
  useEffect(() => {
    const id = setInterval(() => {
      const cs = candlesRef.current;
      const last = cs[cs.length - 1];
      const sig = mkSig(last.c, last.t, true);
      setSignals(prev => [sig, ...prev.slice(0, 35)]);
      setNotes(prev => [{ id: Date.now(), text: `${sig.dir} signal: ${sig.pattern} @ ${fp(sig.entry)}`, dir: sig.dir }, ...prev.slice(0, 2)]);
    }, 18000);
    return () => clearInterval(id);
  }, []);

  // dismiss toasts
  useEffect(() => {
    if (!notes.length) return;
    const id = setTimeout(() => setNotes(p => p.slice(0, -1)), 4000);
    return () => clearTimeout(id);
  }, [notes]);

  // resolve live signals after 40s
  useEffect(() => {
    const id = setInterval(() => {
      setSignals(prev => prev.map(s => {
        if (!s.live || Date.now() - s.time < 40000) return s;
        const won = Math.random() * 100 < s.wr;
        const exit = won ? s.tp : s.sl;
        const pips = s.dir === "BUY" ? exit - s.entry : s.entry - exit;
        return { ...s, live: false, status: won ? "WIN" : "LOSS", exit, pnl: +(pips * 100).toFixed(2) };
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // derived state
  const price = candles[candles.length - 1]?.c || BASE;
  const chg = price - BASE;
  const chgPct = ((chg / BASE) * 100).toFixed(2);
  const dayH = Math.max(...candles.map(c => c.h));
  const dayL = Math.min(...candles.map(c => c.l));
  const resolved = signals.filter(s => s.status);
  const wins = resolved.filter(s => s.status === "WIN").length;
  const losses = resolved.length - wins;
  const totalPnl = resolved.reduce((s, x) => s + (x.pnl || 0), 0);
  const wr = resolved.length ? ((wins / resolved.length) * 100).toFixed(1) : "—";
  const sparkD = candles.slice(-20).map(c => c.c);
  const liveSigs = signals.filter(s => s.live);
  const histSigs = signals.filter(s => !s.live);

  return (
    <div style={{ minHeight: "100vh", background: BG0, color: T1, fontFamily: "'JetBrains Mono','SF Mono',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&display=swap');
        @keyframes shimmer{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${BG0}}::-webkit-scrollbar-thumb{background:#2a2d3a;border-radius:3px}
      `}</style>

      {/* toasts */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", gap: 6 }}>
        {notes.map(n => (
          <div key={n.id} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 11, background: BG3, border: `1px solid ${n.dir === "BUY" ? GREEN : RED}35`, color: T1, animation: "slideIn 0.3s ease", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
            <span style={{ color: n.dir === "BUY" ? GREEN : RED, fontWeight: 700 }}>● </span>{n.text}
          </div>
        ))}
      </div>

      {/* trade modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: BG2, borderRadius: 16, padding: 24, width: 340, border: `1px solid ${GOLD}25`, boxShadow: `0 16px 48px rgba(0,0,0,0.5)` }}>
            <h3 style={{ color: GOLD, margin: "0 0 14px", fontSize: 15, letterSpacing: 1 }}>CONFIRM TRADE</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              {[["Direction", modal.dir, modal.dir === "BUY" ? GREEN : RED], ["Pattern", modal.pattern, T1], ["Entry", fp(modal.entry), T1], ["Lot Size", "1.00", T1], ["Take Profit", fp(modal.tp), GREEN], ["Stop Loss", fp(modal.sl), RED]].map(([l, v, c]) => (
                <div key={l}><div style={{ color: T3, fontSize: 9, textTransform: "uppercase" }}>{l}</div><div style={{ color: c, fontSize: 13, fontWeight: 700 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 9, border: `1px solid #2a2d3a`, background: "transparent", color: T2, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>CANCEL</button>
              <button onClick={() => { setPlaced(p => [...p, { ...modal, at: Date.now() }]); setModal(null); }} style={{ flex: 1, padding: 11, borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, color: BG0, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 3px 14px ${GOLD}28` }}>EXECUTE</button>
            </div>
          </div>
        </div>
      )}

      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid #1a1d28`, background: `${BG1}cc`, backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
          <span style={{ color: GOLD, fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>AUREUS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, animation: "blink 1.5s infinite" }} />
            <span style={{ color: T3, fontSize: 9 }}>LIVE</span>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 5, background: `${GOLD}12`, border: `1px solid ${GOLD}25`, color: GOLD, fontSize: 10, fontWeight: 600 }}>{user?.plan === "Trial" ? "TRIAL" : "PRO"}</span>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${GOLD}35, ${GOLD_DARK}35)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: GOLD, border: `1px solid ${GOLD}25` }}>{user.av || user.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ color: T1, fontSize: 10, fontWeight: 600, lineHeight: 1.1 }}>{user.name}</div>
                <div style={{ color: T3, fontSize: 8 }}>{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={onLogout} style={{ background: "transparent", border: `1px solid #2a2d3a`, borderRadius: 5, color: T3, fontSize: 9, padding: "4px 9px", cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: "14px 20px", maxWidth: 1400, margin: "0 auto" }}>
        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: BG2, borderRadius: 11, padding: "12px 14px", border: `1px solid ${GOLD}18` }}>
            <div style={{ color: T3, fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>XAUUSD — GOLD SPOT</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: GOLD, letterSpacing: -1 }}>{fp(price)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: chg >= 0 ? GREEN : RED }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)} ({chgPct}%)</span>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
              <span style={{ color: T3, fontSize: 8 }}>HIGH <span style={{ color: GREEN, fontWeight: 600, fontSize: 11 }}>{fp(dayH)}</span></span>
              <span style={{ color: T3, fontSize: 8 }}>LOW <span style={{ color: RED, fontWeight: 600, fontSize: 11 }}>{fp(dayL)}</span></span>
              <span style={{ color: T3, fontSize: 8 }}>SPREAD <span style={{ color: T2, fontWeight: 600, fontSize: 11 }}>1.26</span></span>
            </div>
            <div style={{ marginTop: 6 }}><Spark data={sparkD} color={chg >= 0 ? GREEN : RED} /></div>
          </div>
          {[[`${wr}%`, "AVG WIN RATE", GOLD], [`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(0)}`, "TOTAL P/L", totalPnl >= 0 ? GREEN : RED], [placed.length.toString(), "ACTIVE TRADES", T1]].map(([v, l, c], i) => (
            <div key={i} style={{ background: BG2, borderRadius: 11, padding: "12px 14px", border: `1px solid #222538` }}>
              <div style={{ color: T3, fontSize: 8, letterSpacing: 1, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ color: T3, fontSize: 9, marginTop: 2 }}>{i === 0 ? <PB pct={parseFloat(wr) || 0} sm /> : i === 1 ? `${wins}W / ${losses}L` : `${liveSigs.length} pending`}</div>
            </div>
          ))}
        </div>

        {/* chart + signals */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
          <div style={{ background: BG2, borderRadius: 11, padding: 14, border: `1px solid #222538`, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: T1, fontSize: 12, fontWeight: 600 }}>XAUUSD</span>
                <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}20` }}>5M</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {[[GREEN, "BUY"], [RED, "SELL"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} /><span style={{ color: T3, fontSize: 8 }}>{l}</span>
                  </div>
                ))}
                {[[GREEN, "TP"], [RED, "SL"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 12, height: 0, borderTop: `2px dashed ${c}`, opacity: 0.6 }} /><span style={{ color: T3, fontSize: 8 }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div ref={boxRef} style={{ width: "100%" }}>
              <Chart candles={candles} signals={signals} width={cw - 28} />
            </div>
          </div>

          {/* right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: BG2, borderRadius: 11, padding: 12, border: `1px solid ${GOLD}18` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, animation: "blink 1s infinite" }} />
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>LIVE SIGNALS</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: T3, padding: "1px 5px", background: BG3, borderRadius: 3 }}>{liveSigs.length}</span>
              </div>
              {liveSigs.length === 0 ? (
                <div style={{ color: T3, fontSize: 10, textAlign: "center", padding: "14px 0" }}>Scanning for patterns...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{liveSigs.slice(0, 3).map(s => <SC key={s.id} sig={s} onTrade={setModal} />)}</div>
              )}
            </div>
            <div style={{ background: BG2, borderRadius: 11, padding: 12, border: `1px solid #222538`, flex: 1, maxHeight: 380, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ color: T2, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>HISTORY</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: T3, padding: "1px 5px", background: BG3, borderRadius: 3 }}>{histSigs.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{histSigs.slice(0, 12).map(s => <SC key={s.id} sig={s} />)}</div>
            </div>
          </div>
        </div>

        {/* pattern table */}
        <div style={{ background: BG2, borderRadius: 11, padding: 14, border: `1px solid #222538`, marginTop: 14 }}>
          <div style={{ color: T2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>PATTERN PERFORMANCE</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                {["Pattern", "Type", "Signals", "Wins", "Losses", "Win Rate", "Avg P/L", "Confidence"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid #1a1d28` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {PATS.map(p => {
                  const ps = resolved.filter(s => s.pattern === p.name);
                  const pw = ps.filter(s => s.status === "WIN").length;
                  const pl = ps.length - pw;
                  const pwr = ps.length ? ((pw / ps.length) * 100).toFixed(0) : p.wr;
                  const avg = ps.length ? (ps.reduce((s, x) => s + (x.pnl || 0), 0) / ps.length).toFixed(0) : "—";
                  return (
                    <tr key={p.name} style={{ borderBottom: `1px solid #14161d` }}>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: T1, fontWeight: 600 }}>{p.ico} {p.name}</td>
                      <td style={{ padding: "8px 10px" }}><span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, color: p.dir === "BUY" ? GREEN : RED, background: (p.dir === "BUY" ? GREEN : RED) + "12" }}>{p.dir}</span></td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: T2 }}>{ps.length || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: GREEN, fontWeight: 600 }}>{pw || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: RED, fontWeight: 600 }}>{pl || "—"}</td>
                      <td style={{ padding: "8px 10px" }}><PB pct={+pwr} sm /></td>
                      <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: avg !== "—" && +avg >= 0 ? GREEN : avg !== "—" ? RED : T3 }}>{avg !== "—" ? `$${avg}` : "—"}</td>
                      <td style={{ padding: "8px 10px" }}><span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 600, color: p.wr >= 70 ? GREEN : GOLD, background: (p.wr >= 70 ? GREEN : GOLD) + "12" }}>{p.wr >= 70 ? "HIGH" : p.wr >= 65 ? "MEDIUM" : "MODERATE"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: "center", padding: "16px 0 8px", color: T3, fontSize: 8, letterSpacing: 0.4, lineHeight: 1.5 }}>
          AUREUS PRO — Algorithmic candlestick pattern analysis. Past performance ≠ future results. Win probabilities from 10,000+ historical formations. Simulated environment for demonstration.
        </p>
      </div>
    </div>
  );
}

/* ─── APP ─── */
export default function App() {
  const [user, setUser] = useState(null);
  if (!user) return <Login onLogin={setUser} />;
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

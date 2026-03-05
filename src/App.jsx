import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const GOLD_ACCENT = "#D4A84B";
const GOLD_LIGHT = "#F5D78E";
const GOLD_DARK = "#8B6914";
const BG_PRIMARY = "#0A0B0E";
const BG_SECONDARY = "#12141A";
const BG_CARD = "#181B23";
const BG_ELEVATED = "#1E2130";
const GREEN = "#22C55E";
const RED = "#EF4444";
const TEXT_PRIMARY = "#E8E6E1";
const TEXT_SECONDARY = "#8A8D98";
const TEXT_MUTED = "#555866";

// Simulated realistic XAUUSD data generator
function generateRealisticPrice(basePrice, volatility = 0.002) {
  const change = (Math.random() - 0.48) * basePrice * volatility;
  return basePrice + change;
}

function generateCandlestickData(count, basePrice) {
  const data = [];
  let currentPrice = basePrice;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const open = currentPrice;
    const closeChange = (Math.random() - 0.48) * currentPrice * 0.003;
    const close = open + closeChange;
    const high = Math.max(open, close) + Math.random() * currentPrice * 0.002;
    const low = Math.min(open, close) - Math.random() * currentPrice * 0.002;
    const volume = Math.floor(Math.random() * 5000 + 1000);
    data.push({
      time: now - i * 5 * 60 * 1000,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    currentPrice = close;
  }
  return data;
}

const PATTERNS = [
  { name: "Bullish Engulfing", type: "BUY", baseWinRate: 68, icon: "▲" },
  { name: "Hammer", type: "BUY", baseWinRate: 65, icon: "🔨" },
  { name: "Three White Soldiers", type: "BUY", baseWinRate: 72, icon: "⬆" },
  { name: "Bearish Engulfing", type: "SELL", baseWinRate: 66, icon: "▼" },
  { name: "Double Top", type: "SELL", baseWinRate: 70, icon: "⏫" },
  { name: "Morning Star", type: "BUY", baseWinRate: 71, icon: "☀" },
  { name: "Evening Star", type: "SELL", baseWinRate: 69, icon: "🌙" },
  { name: "Doji Star", type: "BUY", baseWinRate: 62, icon: "✦" },
];

function detectPattern(candles) {
  if (candles.length < 3) return null;
  const [c3, c2, c1] = candles.slice(-3);
  if (c1.close > c1.open && c2.close < c2.open && c1.close > c2.open && c1.open < c2.close) {
    return PATTERNS[0]; // Bullish Engulfing
  }
  if (c1.close > c1.open && (c1.low < c1.open - (c1.close - c1.open) * 2) && (c1.high - c1.close < (c1.close - c1.open) * 0.3)) {
    return PATTERNS[1]; // Hammer
  }
  if (c3.close > c3.open && c2.close > c2.open && c1.close > c1.open && c1.close > c2.close && c2.close > c3.close) {
    return PATTERNS[2]; // Three White Soldiers
  }
  if (c1.close < c1.open && c2.close > c2.open && c1.open > c2.close && c1.close < c2.open) {
    return PATTERNS[3]; // Bearish Engulfing
  }
  if (Math.abs(c2.high - c3.high) < c2.high * 0.001 && c1.close < c2.close) {
    return PATTERNS[4]; // Double Top
  }
  return null;
}

function generateHistoricalSignals(basePrice) {
  const signals = [];
  const now = Date.now();
  for (let i = 24; i >= 1; i--) {
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    const winRate = pattern.baseWinRate + Math.floor(Math.random() * 10 - 5);
    const entry = +(basePrice + (Math.random() - 0.5) * 200).toFixed(2);
    const slPips = +(Math.random() * 8 + 4).toFixed(1);
    const tpPips = +(slPips * 3).toFixed(1);
    const isWin = Math.random() * 100 < winRate;
    const tp = pattern.type === "BUY" ? entry + tpPips : entry - tpPips;
    const sl = pattern.type === "BUY" ? entry - slPips : entry + slPips;
    const exitPrice = isWin ? tp : sl;
    const profitPips = pattern.type === "BUY" ? exitPrice - entry : entry - exitPrice;
    const profitUSD = +(profitPips * 100).toFixed(2); // 1 lot = 100 oz

    signals.push({
      id: `sig-${i}`,
      time: now - i * 60 * 60 * 1000 * (Math.random() * 2 + 0.5),
      pattern: pattern.name,
      type: pattern.type,
      icon: pattern.icon,
      entry,
      tp: +tp.toFixed(2),
      sl: +sl.toFixed(2),
      winRate,
      status: isWin ? "WIN" : "LOSS",
      exitPrice: +exitPrice.toFixed(2),
      profitUSD,
      isLive: false,
    });
  }
  return signals.sort((a, b) => b.time - a.time);
}

// Mini sparkline
function Sparkline({ data, width = 120, height = 32, color = GOLD_ACCENT }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// Candlestick Chart Component
function CandlestickChart({ candles, signals, width = 800, height = 340 }) {
  if (!candles || candles.length === 0) return null;
  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const allHighs = candles.map(c => c.high);
  const allLows = candles.map(c => c.low);
  const minPrice = Math.min(...allLows) - 5;
  const maxPrice = Math.max(...allHighs) + 5;
  const priceRange = maxPrice - minPrice || 1;
  const candleWidth = Math.max(2, (chartW / candles.length) * 0.6);
  const gap = chartW / candles.length;

  const yScale = (price) => padding.top + chartH - ((price - minPrice) / priceRange) * chartH;
  const xScale = (i) => padding.left + i * gap + gap / 2;

  // Grid lines
  const gridLines = [];
  const priceStep = priceRange / 5;
  for (let i = 0; i <= 5; i++) {
    const price = minPrice + priceStep * i;
    const y = yScale(price);
    gridLines.push(
      <g key={`grid-${i}`}>
        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1E2130" strokeWidth="1" />
        <text x={width - padding.right + 5} y={y + 4} fill={TEXT_MUTED} fontSize="10" fontFamily="monospace">
          {price.toFixed(0)}
        </text>
      </g>
    );
  }

  // Signal markers on chart
  const signalMarkers = signals
    .filter(s => s.isLive || (Date.now() - s.time < candles.length * 5 * 60 * 1000))
    .map((sig, idx) => {
      const timeIdx = candles.findIndex(c => Math.abs(c.time - sig.time) < 5 * 60 * 1000);
      if (timeIdx < 0) return null;
      const x = xScale(timeIdx);
      const candle = candles[timeIdx];
      const y = sig.type === "BUY" ? yScale(candle.low) + 15 : yScale(candle.high) - 15;
      const color = sig.type === "BUY" ? GREEN : RED;
      return (
        <g key={`signal-${idx}`}>
          <circle cx={x} cy={y} r={6} fill={color} opacity={0.9} />
          <text x={x} y={y + 3.5} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
            {sig.type === "BUY" ? "B" : "S"}
          </text>
          {/* TP line */}
          <line x1={x - 20} y1={yScale(sig.tp)} x2={x + 20} y2={yScale(sig.tp)} stroke={GREEN} strokeWidth="1" strokeDasharray="3,2" opacity={0.6} />
          {/* SL line */}
          <line x1={x - 20} y1={yScale(sig.sl)} x2={x + 20} y2={yScale(sig.sl)} stroke={RED} strokeWidth="1" strokeDasharray="3,2" opacity={0.6} />
        </g>
      );
    });

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD_ACCENT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={GOLD_ACCENT} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {gridLines}
      {/* Volume bars */}
      {candles.map((c, i) => {
        const maxVol = Math.max(...candles.map(cc => cc.volume));
        const volH = (c.volume / maxVol) * 30;
        return (
          <rect key={`vol-${i}`} x={xScale(i) - candleWidth / 2} y={height - padding.bottom - volH}
            width={candleWidth} height={volH} fill="url(#volGrad)" rx="1" />
        );
      })}
      {/* Candles */}
      {candles.map((c, i) => {
        const x = xScale(i);
        const isBull = c.close >= c.open;
        const bodyTop = yScale(Math.max(c.open, c.close));
        const bodyBot = yScale(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        const color = isBull ? GREEN : RED;
        return (
          <g key={`candle-${i}`}>
            <line x1={x} y1={yScale(c.high)} x2={x} y2={yScale(c.low)} stroke={color} strokeWidth="1" opacity={0.7} />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyH}
              fill={isBull ? color : color} rx="0.5" opacity={0.9} />
          </g>
        );
      })}
      {signalMarkers}
      {/* Current price line */}
      {candles.length > 0 && (
        <g>
          <line x1={padding.left} y1={yScale(candles[candles.length - 1].close)}
            x2={width - padding.right} y2={yScale(candles[candles.length - 1].close)}
            stroke={GOLD_ACCENT} strokeWidth="1" strokeDasharray="4,3" opacity={0.5} />
          <rect x={width - padding.right - 2} y={yScale(candles[candles.length - 1].close) - 9}
            width={58} height={18} fill={GOLD_ACCENT} rx="3" />
          <text x={width - padding.right + 27} y={yScale(candles[candles.length - 1].close) + 3.5}
            textAnchor="middle" fill={BG_PRIMARY} fontSize="10" fontWeight="bold" fontFamily="monospace">
            {candles[candles.length - 1].close.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}

// Win Probability Bar
function WinProbBar({ percent, size = "normal" }) {
  const h = size === "small" ? 6 : 8;
  const w = size === "small" ? 80 : 120;
  const color = percent >= 70 ? GREEN : percent >= 60 ? GOLD_ACCENT : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: w, height: h, background: "#1a1d28", borderRadius: h / 2, overflow: "hidden" }}>
        <div style={{
          width: `${percent}%`, height: "100%", borderRadius: h / 2,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{ color, fontSize: size === "small" ? 11 : 13, fontWeight: 700, fontFamily: "monospace", minWidth: 36 }}>
        {percent}%
      </span>
    </div>
  );
}

// Signal Card
function SignalCard({ signal, onPlaceTrade }) {
  const isBuy = signal.type === "BUY";
  const accentColor = isBuy ? GREEN : RED;
  const isLive = signal.isLive;
  const isWin = signal.status === "WIN";

  return (
    <div style={{
      background: BG_CARD,
      borderRadius: 12,
      padding: "14px 16px",
      border: `1px solid ${isLive ? GOLD_ACCENT + "60" : "#222538"}`,
      position: "relative",
      overflow: "hidden",
      transition: "all 0.3s",
    }}>
      {isLive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD_ACCENT}, transparent)`,
          animation: "shimmer 2s infinite",
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, border: `1px solid ${accentColor}30`,
          }}>
            {signal.icon}
          </div>
          <div>
            <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600 }}>{signal.pattern}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 1 }}>
              {new Date(signal.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div style={{
          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30`,
        }}>
          {signal.type}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ color: TEXT_MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 }}>Entry</div>
          <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{signal.entry.toFixed(2)}</div>
        </div>
        <div>
          <div style={{ color: TEXT_MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 }}>TP (1:3)</div>
          <div style={{ color: GREEN, fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{signal.tp.toFixed(2)}</div>
        </div>
        <div>
          <div style={{ color: TEXT_MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 }}>SL</div>
          <div style={{ color: RED, fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{signal.sl.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: TEXT_MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>Win Probability</div>
          <WinProbBar percent={signal.winRate} size="small" />
        </div>
        {signal.status && !isLive ? (
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: isWin ? GREEN : RED,
              padding: "2px 8px", borderRadius: 4,
              background: isWin ? GREEN + "15" : RED + "15",
            }}>
              {isWin ? "✓ WIN" : "✗ LOSS"}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, fontFamily: "monospace", marginTop: 3,
              color: signal.profitUSD >= 0 ? GREEN : RED,
            }}>
              {signal.profitUSD >= 0 ? "+" : ""}{signal.profitUSD.toFixed(2)} USD
            </div>
          </div>
        ) : isLive ? (
          <button onClick={() => onPlaceTrade?.(signal)} style={{
            background: `linear-gradient(135deg, ${GOLD_ACCENT}, ${GOLD_DARK})`,
            color: BG_PRIMARY, border: "none", borderRadius: 8, padding: "8px 16px",
            fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
            boxShadow: `0 2px 12px ${GOLD_ACCENT}40`,
          }}>
            PLACE TRADE
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// Login Screen
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null); // 'email' | 'google' | 'test'
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = () => {
    setError("");
    if (!email || !pass) {
      setError("Please enter your email and password");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setLoadingType("email");
    setTimeout(() => onLogin({ name: email.split("@")[0], email, plan: "Pro" }), 1400);
  };

  const handleGoogleLogin = () => {
    setError("");
    setLoading(true);
    setLoadingType("google");
    setTimeout(() => onLogin({ name: "Trader", email: "trader@gmail.com", plan: "Pro", avatar: "G" }), 1800);
  };

  const handleTestAccount = () => {
    setError("");
    setLoading(true);
    setLoadingType("test");
    setTimeout(() => onLogin({ name: "Demo Trader", email: "demo@aureus.io", plan: "Trial", avatar: "D" }), 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const stats = [
    { label: "Signals Today", value: "47" },
    { label: "Win Rate", value: "68.4%" },
    { label: "Active Traders", value: "2,841" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: BG_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace", position: "relative", overflow: "hidden",
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: `linear-gradient(${GOLD_ACCENT} 1px, transparent 1px), linear-gradient(90deg, ${GOLD_ACCENT} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${GOLD_ACCENT}08 0%, transparent 70%)`,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: 420, padding: "0 20px" }}>
        {/* Logo & branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 18px",
            background: `linear-gradient(135deg, ${GOLD_ACCENT}, ${GOLD_DARK})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: `0 8px 32px ${GOLD_ACCENT}35`,
            animation: "pulse 3s ease infinite",
          }}>⚡</div>
          <h1 style={{ color: GOLD_ACCENT, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: 3 }}>AUREUS</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 8, letterSpacing: 1.5 }}>XAUUSD SIGNAL INTELLIGENCE</p>
        </div>

        {/* Live stats ticker */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 20, marginBottom: 24, padding: "10px 0",
          borderTop: `1px solid ${GOLD_ACCENT}10`, borderBottom: `1px solid ${GOLD_ACCENT}10`,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: GOLD_ACCENT, fontSize: 15, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 8, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div style={{
          padding: "28px 28px 24px", background: BG_CARD, borderRadius: 20,
          border: `1px solid ${GOLD_ACCENT}15`, boxShadow: `0 24px 64px rgba(0,0,0,0.5)`,
        }}>

          {/* Google Login */}
          <button onClick={handleGoogleLogin} disabled={loading}
            style={{
              width: "100%", padding: "13px", border: `1px solid #2a2d3a`, borderRadius: 10,
              background: loading && loadingType === "google" ? BG_ELEVATED : "#1E2130",
              color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (!loading) { e.target.style.background = "#252838"; e.target.style.borderColor = "#3a3d4a"; }}}
            onMouseLeave={e => { if (!loading) { e.target.style.background = "#1E2130"; e.target.style.borderColor = "#2a2d3a"; }}}
          >
            {loading && loadingType === "google" ? (
              <span style={{ letterSpacing: 1 }}>CONNECTING...</span>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
            <span style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 14,
              background: RED + "12", border: `1px solid ${RED}25`,
              color: RED, fontSize: 11, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>⚠</span> {error}
            </div>
          )}

          {/* Email field */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: TEXT_MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="trader@aureus.io"
              style={{
                width: "100%", padding: "11px 14px", background: BG_ELEVATED, border: `1px solid #2a2d3a`,
                borderRadius: 10, color: TEXT_PRIMARY, fontSize: 13, outline: "none", boxSizing: "border-box",
                fontFamily: "inherit", transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = GOLD_ACCENT + "60"}
              onBlur={e => e.target.style.borderColor = "#2a2d3a"}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: TEXT_MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Password</label>
            <input type="password" value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={{
                width: "100%", padding: "11px 14px", background: BG_ELEVATED, border: `1px solid #2a2d3a`,
                borderRadius: 10, color: TEXT_PRIMARY, fontSize: 13, outline: "none", boxSizing: "border-box",
                fontFamily: "inherit", transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = GOLD_ACCENT + "60"}
              onBlur={e => e.target.style.borderColor = "#2a2d3a"}
            />
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: "right", marginBottom: 18 }}>
            <span onClick={() => setShowForgot(!showForgot)} style={{
              color: GOLD_ACCENT, fontSize: 10, cursor: "pointer", opacity: 0.7,
              letterSpacing: 0.5,
            }}>
              Forgot password?
            </span>
            {showForgot && (
              <div style={{
                marginTop: 8, padding: "8px 12px", borderRadius: 8,
                background: `${GOLD_ACCENT}08`, border: `1px solid ${GOLD_ACCENT}15`,
                color: TEXT_SECONDARY, fontSize: 10, textAlign: "left",
              }}>
                Check your email for a reset link, or use the test account below to explore the platform.
              </div>
            )}
          </div>

          {/* Sign in button */}
          <button onClick={handleLogin} disabled={loading}
            style={{
              width: "100%", padding: "13px", border: "none", borderRadius: 10,
              background: loading && loadingType === "email" ? TEXT_MUTED : `linear-gradient(135deg, ${GOLD_ACCENT}, ${GOLD_DARK})`,
              color: BG_PRIMARY, fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer",
              letterSpacing: 1.5, fontFamily: "inherit",
              boxShadow: loading ? "none" : `0 4px 20px ${GOLD_ACCENT}30`,
              transition: "all 0.2s",
            }}>
            {loading && loadingType === "email" ? "AUTHENTICATING..." : "SIGN IN"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
            <span style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 1 }}>QUICK ACCESS</span>
            <div style={{ flex: 1, height: 1, background: "#222538" }} />
          </div>

          {/* Test Account Button */}
          <button onClick={handleTestAccount} disabled={loading}
            style={{
              width: "100%", padding: "12px", border: `1px dashed ${GOLD_ACCENT}35`,
              borderRadius: 10, background: `${GOLD_ACCENT}06`,
              color: GOLD_ACCENT, fontSize: 12, fontWeight: 600, cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s", letterSpacing: 0.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={e => { if (!loading) { e.target.style.background = `${GOLD_ACCENT}12`; e.target.style.borderColor = `${GOLD_ACCENT}50`; }}}
            onMouseLeave={e => { if (!loading) { e.target.style.background = `${GOLD_ACCENT}06`; e.target.style.borderColor = `${GOLD_ACCENT}35`; }}}
          >
            {loading && loadingType === "test" ? (
              <span>LOADING DEMO...</span>
            ) : (
              <>
                <span style={{ fontSize: 15 }}>🧪</span>
                <span>Try with Test Account</span>
              </>
            )}
          </button>

          <div style={{
            textAlign: "center", marginTop: 12, padding: "8px",
            background: `${BG_ELEVATED}80`, borderRadius: 8,
          }}>
            <div style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 0.5 }}>
              <span style={{ color: TEXT_SECONDARY }}>Test credentials: </span>
              demo@aureus.io / demo1234
            </div>
          </div>
        </div>

        {/* Plan info below card */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 10 }}>
            {[
              { plan: "Starter", price: "$99/mo", features: "10 signals/day" },
              { plan: "Pro", price: "$299/mo", features: "Unlimited + Live", active: true },
              { plan: "Elite", price: "$799/mo", features: "API + Priority" },
            ].map((p, i) => (
              <div key={i} style={{
                padding: "8px 14px", borderRadius: 8, textAlign: "center",
                background: p.active ? `${GOLD_ACCENT}12` : "transparent",
                border: `1px solid ${p.active ? GOLD_ACCENT + "30" : "#1a1d28"}`,
              }}>
                <div style={{ color: p.active ? GOLD_ACCENT : TEXT_MUTED, fontSize: 10, fontWeight: 700 }}>{p.plan}</div>
                <div style={{ color: p.active ? GOLD_LIGHT : TEXT_MUTED, fontSize: 12, fontWeight: 800, margin: "2px 0" }}>{p.price}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 8 }}>{p.features}</div>
              </div>
            ))}
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 0.5 }}>
            7-day free trial on all plans — No credit card required
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard
function Dashboard({ user, onLogout }) {
  const BASE_PRICE = 5153.12;
  const [candles, setCandles] = useState(() => generateCandlestickData(60, BASE_PRICE));
  const [signals, setSignals] = useState(() => generateHistoricalSignals(BASE_PRICE));
  const [currentPrice, setCurrentPrice] = useState(BASE_PRICE);
  const [prevPrice, setPrevPrice] = useState(BASE_PRICE);
  const [tick, setTick] = useState(0);
  const [showTradeModal, setShowTradeModal] = useState(null);
  const [placedTrades, setPlacedTrades] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(800);

  // Track chart container width
  useEffect(() => {
    const updateWidth = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const newCandles = [...prev];
        const last = { ...newCandles[newCandles.length - 1] };
        const newPrice = generateRealisticPrice(last.close, 0.0008);
        last.close = +newPrice.toFixed(2);
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.volume += Math.floor(Math.random() * 50);
        newCandles[newCandles.length - 1] = last;
        setPrevPrice(currentPrice);
        setCurrentPrice(last.close);
        return newCandles;
      });
      setTick(t => t + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [currentPrice]);

  // New candle every 30 seconds (simulated 5min)
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const newCandle = {
          time: Date.now(),
          open: last.close,
          high: last.close,
          low: last.close,
          close: last.close,
          volume: Math.floor(Math.random() * 1000 + 500),
        };
        return [...prev.slice(1), newCandle];
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Generate new live signal periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
      const winRate = pattern.baseWinRate + Math.floor(Math.random() * 10 - 3);
      const entry = currentPrice;
      const slPips = +(Math.random() * 8 + 4).toFixed(1);
      const tpPips = +(slPips * 3).toFixed(1);
      const newSignal = {
        id: `live-${Date.now()}`,
        time: Date.now(),
        pattern: pattern.name,
        type: pattern.type,
        icon: pattern.icon,
        entry: +entry.toFixed(2),
        tp: +(pattern.type === "BUY" ? entry + tpPips : entry - tpPips).toFixed(2),
        sl: +(pattern.type === "BUY" ? entry - slPips : entry + slPips).toFixed(2),
        winRate,
        status: null,
        exitPrice: null,
        profitUSD: null,
        isLive: true,
      };
      setSignals(prev => [newSignal, ...prev.slice(0, 29)]);
      setNotifications(prev => [
        { id: Date.now(), text: `New ${pattern.type} signal: ${pattern.name} @ ${entry.toFixed(2)}`, type: pattern.type },
        ...prev.slice(0, 2),
      ]);
      // Auto-dismiss notification
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newSignal.id));
      }, 5000);
    }, 20000);
    return () => clearInterval(interval);
  }, [currentPrice]);

  // Resolve live signals after some time
  useEffect(() => {
    const interval = setInterval(() => {
      setSignals(prev => prev.map(sig => {
        if (sig.isLive && Date.now() - sig.time > 45000) {
          const isWin = Math.random() * 100 < sig.winRate;
          const exitPrice = isWin ? sig.tp : sig.sl;
          const profitPips = sig.type === "BUY" ? exitPrice - sig.entry : sig.entry - exitPrice;
          return {
            ...sig,
            isLive: false,
            status: isWin ? "WIN" : "LOSS",
            exitPrice,
            profitUSD: +(profitPips * 100).toFixed(2),
          };
        }
        return sig;
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceTrade = (signal) => {
    setShowTradeModal(signal);
  };

  const confirmTrade = () => {
    if (showTradeModal) {
      setPlacedTrades(prev => [...prev, { ...showTradeModal, placedAt: Date.now() }]);
      setShowTradeModal(null);
    }
  };

  // Stats calculations
  const resolvedSignals = signals.filter(s => s.status);
  const wins = resolvedSignals.filter(s => s.status === "WIN").length;
  const losses = resolvedSignals.filter(s => s.status === "LOSS").length;
  const totalProfit = resolvedSignals.reduce((sum, s) => sum + (s.profitUSD || 0), 0);
  const winRate = resolvedSignals.length > 0 ? ((wins / resolvedSignals.length) * 100).toFixed(1) : 0;
  const priceChange = currentPrice - BASE_PRICE;
  const priceChangePct = ((priceChange / BASE_PRICE) * 100).toFixed(2);
  const dayHigh = Math.max(...candles.map(c => c.high));
  const dayLow = Math.min(...candles.map(c => c.low));
  const priceDirection = currentPrice >= prevPrice ? "up" : "down";

  const sparkData = candles.slice(-20).map(c => c.close);

  const liveSignals = signals.filter(s => s.isLive);
  const historySignals = signals.filter(s => !s.isLive);

  return (
    <div style={{
      minHeight: "100vh", background: BG_PRIMARY, color: TEXT_PRIMARY,
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${BG_PRIMARY}; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 3px; }
      `}</style>

      {/* Notifications */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            padding: "10px 16px", borderRadius: 10, fontSize: 12,
            background: BG_ELEVATED, border: `1px solid ${n.type === "BUY" ? GREEN : RED}40`,
            color: TEXT_PRIMARY, animation: "slideIn 0.3s ease",
            boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
          }}>
            <span style={{ color: n.type === "BUY" ? GREEN : RED, fontWeight: 700 }}>● </span>{n.text}
          </div>
        ))}
      </div>

      {/* Trade Confirmation Modal */}
      {showTradeModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowTradeModal(null)}>
          <div style={{
            background: BG_CARD, borderRadius: 16, padding: 28, width: 360,
            border: `1px solid ${GOLD_ACCENT}30`, boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: GOLD_ACCENT, margin: "0 0 16px", fontSize: 16, letterSpacing: 1 }}>CONFIRM TRADE</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase" }}>Direction</div>
                <div style={{ color: showTradeModal.type === "BUY" ? GREEN : RED, fontSize: 16, fontWeight: 700 }}>{showTradeModal.type}</div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase" }}>Pattern</div>
                <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600 }}>{showTradeModal.pattern}</div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase" }}>Entry</div>
                <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 700 }}>{showTradeModal.entry.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase" }}>Lot Size</div>
                <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 700 }}>1.00</div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase" }}>Take Profit</div>
                <div style={{ color: GREEN, fontSize: 14, fontWeight: 700 }}>{showTradeModal.tp.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase" }}>Stop Loss</div>
                <div style={{ color: RED, fontSize: 14, fontWeight: 700 }}>{showTradeModal.sl.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowTradeModal(null)} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: `1px solid #2a2d3a`,
                background: "transparent", color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>CANCEL</button>
              <button onClick={confirmTrade} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${GOLD_ACCENT}, ${GOLD_DARK})`,
                color: BG_PRIMARY, fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", boxShadow: `0 4px 16px ${GOLD_ACCENT}30`,
              }}>EXECUTE</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid #1a1d28`,
        background: `${BG_SECONDARY}cc`, backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${GOLD_ACCENT}, ${GOLD_DARK})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>⚡</div>
          <span style={{ color: GOLD_ACCENT, fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>AUREUS</span>
          <span style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: 1, marginLeft: 4 }}>PRO</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, animation: "blink 1.5s infinite" }} />
            <span style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: 0.5 }}>LIVE</span>
          </div>
          <div style={{
            padding: "4px 12px", borderRadius: 6, background: `${GOLD_ACCENT}15`,
            border: `1px solid ${GOLD_ACCENT}30`, color: GOLD_ACCENT, fontSize: 11, fontWeight: 600,
          }}>
            {user?.plan === "Trial" ? "TRIAL" : "PRO PLAN"}
          </div>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${GOLD_ACCENT}40, ${GOLD_DARK}40)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: GOLD_ACCENT,
                border: `1px solid ${GOLD_ACCENT}30`,
              }}>
                {user.avatar || user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ color: TEXT_PRIMARY, fontSize: 11, fontWeight: 600 }}>{user.name}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 9 }}>{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={onLogout} style={{
            background: "transparent", border: `1px solid #2a2d3a`, borderRadius: 6,
            color: TEXT_MUTED, fontSize: 10, padding: "5px 10px", cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.borderColor = RED + "50"; e.target.style.color = RED; }}
            onMouseLeave={e => { e.target.style.borderColor = "#2a2d3a"; e.target.style.color = TEXT_MUTED; }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "16px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Top Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Price Card */}
          <div style={{
            background: BG_CARD, borderRadius: 12, padding: "14px 16px",
            border: `1px solid ${GOLD_ACCENT}20`, gridColumn: "span 2",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>XAUUSD — Gold Spot</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{
                    fontSize: 32, fontWeight: 800, color: GOLD_ACCENT, letterSpacing: -1,
                    transition: "color 0.2s",
                  }}>
                    {currentPrice.toFixed(2)}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: priceChange >= 0 ? GREEN : RED,
                  }}>
                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePct}%)
                  </span>
                </div>
              </div>
              <Sparkline data={sparkData} color={priceChange >= 0 ? GREEN : RED} />
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
              <div>
                <span style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 0.5 }}>24H HIGH </span>
                <span style={{ color: GREEN, fontSize: 12, fontWeight: 600 }}>{dayHigh.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 0.5 }}>24H LOW </span>
                <span style={{ color: RED, fontSize: 12, fontWeight: 600 }}>{dayLow.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 0.5 }}>SPREAD </span>
                <span style={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600 }}>1.26</span>
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div style={{ background: BG_CARD, borderRadius: 12, padding: "14px 16px", border: `1px solid #222538` }}>
            <div style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Avg Win Rate</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: GOLD_ACCENT }}>{winRate}%</div>
            <WinProbBar percent={+winRate} size="small" />
          </div>

          {/* Total P/L */}
          <div style={{ background: BG_CARD, borderRadius: 12, padding: "14px 16px", border: `1px solid #222538` }}>
            <div style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Total P/L</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: totalProfit >= 0 ? GREEN : RED }}>
              {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(0)}
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>
              {wins}W / {losses}L — {resolvedSignals.length} signals
            </div>
          </div>

          {/* Active Trades */}
          <div style={{ background: BG_CARD, borderRadius: 12, padding: "14px 16px", border: `1px solid #222538` }}>
            <div style={{ color: TEXT_MUTED, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Active Trades</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: TEXT_PRIMARY }}>{placedTrades.length}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>
              {liveSignals.length} pending signals
            </div>
          </div>
        </div>

        {/* Chart + Signals Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

          {/* Chart */}
          <div style={{
            background: BG_CARD, borderRadius: 12, padding: "16px",
            border: `1px solid #222538`, overflow: "hidden",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600 }}>XAUUSD</span>
                <span style={{
                  padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: `${GOLD_ACCENT}15`, color: GOLD_ACCENT, border: `1px solid ${GOLD_ACCENT}25`,
                }}>5M</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
                  <span style={{ color: TEXT_MUTED, fontSize: 9 }}>BUY</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED }} />
                  <span style={{ color: TEXT_MUTED, fontSize: 9 }}>SELL</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 14, height: 1, borderTop: `2px dashed ${GREEN}`, opacity: 0.6 }} />
                  <span style={{ color: TEXT_MUTED, fontSize: 9 }}>TP</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 14, height: 1, borderTop: `2px dashed ${RED}`, opacity: 0.6 }} />
                  <span style={{ color: TEXT_MUTED, fontSize: 9 }}>SL</span>
                </div>
              </div>
            </div>
            <div ref={chartRef} style={{ width: "100%" }}>
              <CandlestickChart candles={candles} signals={signals} width={chartWidth - 32} height={360} />
            </div>
          </div>

          {/* Right Panel — Live & History Signals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Live Signals */}
            <div style={{
              background: BG_CARD, borderRadius: 12, padding: "14px",
              border: `1px solid ${GOLD_ACCENT}20`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: GOLD_ACCENT,
                  animation: "blink 1s infinite",
                }} />
                <span style={{ color: GOLD_ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>LIVE SIGNALS</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, color: TEXT_MUTED,
                  padding: "2px 6px", background: BG_ELEVATED, borderRadius: 4,
                }}>{liveSignals.length}</span>
              </div>
              {liveSignals.length === 0 ? (
                <div style={{ color: TEXT_MUTED, fontSize: 11, textAlign: "center", padding: "16px 0" }}>
                  Scanning for patterns...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {liveSignals.slice(0, 3).map(sig => (
                    <SignalCard key={sig.id} signal={sig} onPlaceTrade={handlePlaceTrade} />
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div style={{
              background: BG_CARD, borderRadius: 12, padding: "14px",
              border: `1px solid #222538`, flex: 1, maxHeight: 400, overflowY: "auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>SIGNAL HISTORY</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, color: TEXT_MUTED,
                  padding: "2px 6px", background: BG_ELEVATED, borderRadius: 4,
                }}>{historySignals.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {historySignals.slice(0, 10).map(sig => (
                  <SignalCard key={sig.id} signal={sig} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pattern Performance Table */}
        <div style={{
          background: BG_CARD, borderRadius: 12, padding: "16px",
          border: `1px solid #222538`, marginTop: 16,
        }}>
          <div style={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>
            PATTERN PERFORMANCE — HISTORICAL ANALYSIS
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Pattern", "Type", "Signals", "Wins", "Losses", "Win Rate", "Avg Profit", "Confidence"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "8px 12px", fontSize: 9,
                      color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.8,
                      borderBottom: `1px solid #1a1d28`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PATTERNS.map(p => {
                  const patternSignals = resolvedSignals.filter(s => s.pattern === p.name);
                  const pWins = patternSignals.filter(s => s.status === "WIN").length;
                  const pLosses = patternSignals.filter(s => s.status === "LOSS").length;
                  const pWinRate = patternSignals.length > 0 ? ((pWins / patternSignals.length) * 100).toFixed(0) : p.baseWinRate;
                  const avgProfit = patternSignals.length > 0
                    ? (patternSignals.reduce((s, sig) => s + (sig.profitUSD || 0), 0) / patternSignals.length).toFixed(0)
                    : "—";
                  return (
                    <tr key={p.name} style={{ borderBottom: `1px solid #14161d` }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: TEXT_PRIMARY, fontWeight: 600 }}>
                        <span style={{ marginRight: 6 }}>{p.icon}</span>{p.name}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                          color: p.type === "BUY" ? GREEN : RED,
                          background: p.type === "BUY" ? GREEN + "15" : RED + "15",
                        }}>{p.type}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: TEXT_SECONDARY }}>{patternSignals.length || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: GREEN, fontWeight: 600 }}>{pWins || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: RED, fontWeight: 600 }}>{pLosses || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <WinProbBar percent={+pWinRate} size="small" />
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 600, color: avgProfit !== "—" && +avgProfit >= 0 ? GREEN : avgProfit !== "—" ? RED : TEXT_MUTED }}>
                        {avgProfit !== "—" ? `$${avgProfit}` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                          color: p.baseWinRate >= 70 ? GREEN : GOLD_ACCENT,
                          background: p.baseWinRate >= 70 ? GREEN + "15" : GOLD_ACCENT + "15",
                        }}>
                          {p.baseWinRate >= 70 ? "HIGH" : p.baseWinRate >= 65 ? "MEDIUM" : "MODERATE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div style={{
          textAlign: "center", padding: "20px 0 10px", color: TEXT_MUTED, fontSize: 9,
          letterSpacing: 0.5, lineHeight: 1.6,
        }}>
          AUREUS PRO — Pattern recognition signals are generated by algorithmic analysis of historical candlestick patterns.
          Past performance does not guarantee future results. Trading involves substantial risk of loss.
          Win probabilities are calculated from historical pattern success rates across 10,000+ analyzed formations.
          <br />This is a simulated trading environment for demonstration purposes. Always consult a licensed financial advisor.
        </div>
      </div>
    </div>
  );
}

// Main App
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  if (!loggedIn) {
    return <LoginScreen onLogin={(u) => { setUser(u); setLoggedIn(true); }} />;
  }
  return <Dashboard user={user} onLogout={() => { setLoggedIn(false); setUser(null); }} />;
}

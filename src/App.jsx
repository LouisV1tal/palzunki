import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#0F0A1A", surface: "#1A1130", card: "#221840", border: "#3D2C6A",
  purple: "#7B3FA0", purpleL: "#9B5AC0", mint: "#1FC9A8", mintD: "#16A088",
  red: "#E05555", gold: "#F5C842", white: "#F0EAF8", muted: "#9080B0",
  mutedD: "#6050A0", admin: "#1A2840",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n, short = false) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (short) {
    if (abs >= 1e9) return (n / 1e9).toFixed(1) + " млрд";
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + " млн";
    if (abs >= 1e3) return (n / 1e3).toFixed(0) + " тыс";
    return n.toFixed(0);
  }
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
};

// ─── SliderWithInput ─────────────────────────────────────────────────────────
// Supports type: "number" | "percent" | "both"
// valueType state (controlled externally when type="both")
function SliderWithInput({
  label, value, min, max, step = 1, onChange,
  suffix = "", hint, accent = C.mint,
  type = "number",           // "number" | "percent" | "both"
  valueType, onValueTypeChange,  // for "both" mode
  baseValue,                 // for "both" mode: total to compute pct from
}) {
  const [rawInput, setRawInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const displayedValue = type === "both" && valueType === "percent" && baseValue
    ? ((value / baseValue) * 100).toFixed(1) + "%"
    : fmtNum(value) + (suffix ? " " + suffix : "");

  const ratio = Math.min(Math.max((value - min) / (max - min), 0), 1);

  function commitInput(raw) {
    let v = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
    if (isNaN(v)) return;
    if (type === "both" && valueType === "percent" && baseValue) {
      v = Math.round(baseValue * v / 100);
    }
    v = Math.min(Math.max(v, min), max);
    onChange(v);
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: C.muted, fontSize: 12, letterSpacing: "0.04em" }}>{label}</span>
        {type === "both" && onValueTypeChange && (
          <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {["number", "percent"].map(t => (
              <button key={t} onClick={() => onValueTypeChange(t)}
                style={{
                  padding: "2px 10px", fontSize: 10, cursor: "pointer", border: "none",
                  background: valueType === t ? accent : C.card,
                  color: valueType === t ? "#000" : C.muted,
                  fontWeight: valueType === t ? 700 : 400,
                }}>
                {t === "number" ? "шт" : "%"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slider track */}
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: C.border, marginBottom: 2 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${ratio * 100}%`, borderRadius: 2,
          background: `linear-gradient(90deg, ${C.purple}, ${accent})`,
        }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", marginTop: -8, opacity: 0, cursor: "pointer",
          position: "relative", zIndex: 1, height: 20,
        }} />

      {/* Text input */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <input
          type="text"
          value={inputFocused ? rawInput : displayedValue}
          onFocus={() => { setRawInput(value.toString()); setInputFocused(true); }}
          onChange={e => setRawInput(e.target.value)}
          onBlur={() => { commitInput(rawInput); setInputFocused(false); }}
          onKeyDown={e => { if (e.key === "Enter") { commitInput(rawInput); e.target.blur(); } }}
          style={{
            flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            color: accent, fontSize: 13, fontWeight: 700, padding: "5px 10px",
            outline: "none", fontVariantNumeric: "tabular-nums",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={e => e.target.style.borderColor = accent}
          onMouseLeave={e => { if (!inputFocused) e.target.style.borderColor = C.border; }}
        />
        <span style={{ color: C.mutedD, fontSize: 11, minWidth: 24 }}>
          {type === "both" && valueType === "percent" ? "%" : suffix}
        </span>
      </div>
      {hint && <div style={{ color: C.mutedD, fontSize: 11, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent = C.mint, negative = false }) {
  const col = negative ? C.red : accent;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ color: C.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ color: col, fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ color: C.mutedD, fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ children, accent = C.mint }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 28 }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent }} />
      <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>{children}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: C.muted, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <b>{fmtNum(p.value, true)} сум</b>
        </div>
      ))}
    </div>
  );
};

// ─── Core computation ─────────────────────────────────────────────────────────
function computeModel(p, customSliders) {
  const {
    salesPerCycle, avgPhoneLoss, conversionPct, avgNewTariff,
    profitMargin, existingClientPct, existingTariff, newTariff, years,
  } = p;

  // Apply custom sliders as multipliers/overrides on named keys
  let effectiveSales = salesPerCycle;
  let effectiveLoss = avgPhoneLoss;
  let effectiveConv = conversionPct;
  let effectiveTariff = avgNewTariff;
  customSliders.forEach(s => {
    if (!s.active || !s.linkedTo) return;
    if (s.linkedTo === "salesPerCycle") effectiveSales = s.value;
    if (s.linkedTo === "avgPhoneLoss") effectiveLoss = s.value;
    if (s.linkedTo === "conversionPct") effectiveConv = s.value / 100;
    if (s.linkedTo === "avgNewTariff") effectiveTariff = s.value;
  });

  const annualSales = effectiveSales * 8;
  const annualLoss = annualSales * effectiveLoss;
  const upgradersPerCycle = Math.round(effectiveSales * effectiveConv);
  const monthlyTariffPerClient = effectiveTariff * profitMargin;
  const paybackClient = effectiveLoss / monthlyTariffPerClient;

  const months = years * 12;
  const timeline = [];
  let cumLoss = 0, cumGain = 0, activeUpgraders = 0;
  let breakEvenMonth = null, stableMonth = null;

  for (let m = 1; m <= months; m++) {
    if ((m - 1) % 3 === 0) {
      activeUpgraders += upgradersPerCycle;
      cumLoss += effectiveSales * effectiveLoss;
    }
    const monthlyGain = activeUpgraders * monthlyTariffPerClient;
    cumGain += monthlyGain;
    const net = cumGain - cumLoss;
    const monthlyLossRate = (effectiveSales * effectiveLoss) / 1.5;
    if (net >= 0 && !breakEvenMonth) breakEvenMonth = m;
    if (monthlyGain >= monthlyLossRate && !stableMonth) stableMonth = m;

    if (m % 3 === 0 || m === 1 || m === months) {
      timeline.push({
        month: m,
        label: m === 12 ? "1 г" : m === 24 ? "2 г" : m === 36 ? "3 г" : m === 48 ? "4 г" : m === 60 ? "5 г" : `м${m}`,
        cumLoss: Math.round(cumLoss), cumGain: Math.round(cumGain),
        net: Math.round(net), monthlyGain: Math.round(monthlyGain), activeUpgraders,
      });
    }
  }

  const salesGrowth = annualSales * 1.2;
  const existingClients = Math.round(salesGrowth * existingClientPct);
  const newClients = Math.round(salesGrowth * (1 - existingClientPct));
  const existingRevenue = existingClients * existingTariff * 12;
  const newRevenue = newClients * newTariff * 12;
  const finalNet = timeline[timeline.length - 1]?.net ?? 0;

  return {
    annualSales, annualLoss, upgradersPerCycle, monthlyTariffPerClient, paybackClient,
    timeline, breakEvenMonth, stableMonth,
    existingClients, newClients,
    existingRevenue, newRevenue,
    totalSegmentRevenue: existingRevenue + newRevenue,
    loanVolume: annualSales * effectiveLoss,
    monthlyAtScale: Math.round(annualSales * effectiveConv * monthlyTariffPerClient),
    finalNet,
  };
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const LINK_OPTIONS = [
  { value: "", label: "— нет связки (только информация)" },
  { value: "salesPerCycle", label: "BNPL-продажи за цикл" },
  { value: "avgPhoneLoss", label: "Потеря на телефоне" },
  { value: "conversionPct", label: "Конверсия в апгрейд (%)" },
  { value: "avgNewTariff", label: "Средний новый тариф" },
];

function AdminPanel({ customSliders, setCustomSliders, onClose }) {
  const [draft, setDraft] = useState({
    label: "", min: 0, max: 1000000, step: 10000,
    value: 100000, suffix: "сум", hint: "", linkedTo: "", active: true,
    valueType: "number",
  });

  function addSlider() {
    if (!draft.label.trim()) return;
    setCustomSliders(prev => [...prev, { ...draft, id: Date.now() }]);
    setDraft({ label: "", min: 0, max: 1000000, step: 10000, value: 100000, suffix: "сум", hint: "", linkedTo: "", active: true, valueType: "number" });
  }

  function removeSlider(id) {
    setCustomSliders(prev => prev.filter(s => s.id !== id));
  }

  function toggleActive(id) {
    setCustomSliders(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  const field = (key, label, type = "text", extra = {}) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <input type={type} value={draft[key]}
        onChange={e => setDraft(d => ({ ...d, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
        style={{
          width: "100%", background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 6, color: C.white, fontSize: 13, padding: "6px 10px",
          boxSizing: "border-box", outline: "none",
        }}
        {...extra} />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 1000, display: "flex", alignItems: "flex-start",
      justifyContent: "flex-end", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.admin, border: `1px solid ${C.border}`, borderRadius: 16,
        width: 420, maxHeight: "90vh", overflowY: "auto", padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>⚙️ Admin Panel</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18,
          }}>✕</button>
        </div>

        {/* New slider form */}
        <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ color: C.mint, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
            + Добавить новый ползунок
          </div>
          {field("label", "Название параметра")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {field("min", "Минимум", "number")}
            {field("max", "Максимум", "number")}
            {field("step", "Шаг", "number")}
            {field("value", "Начальное значение", "number")}
          </div>
          {field("suffix", "Единица (сум, шт, % ...)")}
          {field("hint", "Подсказка (необязательно)")}

          <div style={{ marginBottom: 10 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Тип значения</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["number", "percent", "both"].map(t => (
                <button key={t} onClick={() => setDraft(d => ({ ...d, valueType: t }))}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${C.border}`,
                    background: draft.valueType === t ? C.mint : C.card,
                    color: draft.valueType === t ? "#000" : C.muted,
                    cursor: "pointer", fontSize: 11, fontWeight: 600,
                  }}>
                  {t === "number" ? "Число" : t === "percent" ? "Процент" : "Оба"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Связать с параметром модели</div>
            <select value={draft.linkedTo}
              onChange={e => setDraft(d => ({ ...d, linkedTo: e.target.value }))}
              style={{
                width: "100%", background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 6, color: C.white, fontSize: 13, padding: "6px 10px",
              }}>
              {LINK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <button onClick={addSlider} style={{
            width: "100%", padding: "10px 0", borderRadius: 8,
            background: `linear-gradient(135deg, ${C.purple}, ${C.mint})`,
            border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            Добавить ползунок
          </button>
        </div>

        {/* Existing custom sliders */}
        {customSliders.length > 0 && (
          <div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Добавленные ползунки</div>
            {customSliders.map(s => (
              <div key={s.id} style={{
                background: C.surface, borderRadius: 10, padding: "12px 14px",
                marginBottom: 8, opacity: s.active ? 1 : 0.5,
                border: `1px solid ${s.active ? C.border : C.mutedD}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleActive(s.id)} style={{
                      background: "none", border: `1px solid ${C.border}`, borderRadius: 4,
                      color: s.active ? C.mint : C.muted, fontSize: 10, padding: "2px 8px", cursor: "pointer",
                    }}>{s.active ? "вкл" : "выкл"}</button>
                    <button onClick={() => removeSlider(s.id)} style={{
                      background: "none", border: `1px solid ${C.red}`, borderRadius: 4,
                      color: C.red, fontSize: 10, padding: "2px 8px", cursor: "pointer",
                    }}>удалить</button>
                  </div>
                </div>
                <div style={{ color: C.mutedD, fontSize: 11, marginTop: 4 }}>
                  {fmtNum(s.min)} – {fmtNum(s.max)} · шаг {fmtNum(s.step)} · текущее {fmtNum(s.value)} {s.suffix}
                  {s.linkedTo && <span style={{ color: C.mint }}> → {LINK_OPTIONS.find(o => o.value === s.linkedTo)?.label}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [salesPerCycle,     setSalesPerCycle]     = useState(605);
  const [avgPhoneLoss,      setAvgPhoneLoss]      = useState(325536);
  const [conversionPct,     setConversionPct]     = useState(0.50);
  const [convValueType,     setConvValueType]     = useState("percent");
  const [avgNewTariff,      setAvgNewTariff]      = useState(106200);
  const [profitMargin,      setProfitMargin]      = useState(0.75);
  const [existingClientPct, setExistingClientPct] = useState(0.67);
  const [existingTariff,    setExistingTariff]    = useState(15000);
  const [newTariff,         setNewTariff]         = useState(60000);
  const [years,             setYears]             = useState(3);
  const [customSliders,     setCustomSliders]     = useState([]);
  const [customValues,      setCustomValues]      = useState({});
  const [showAdmin,         setShowAdmin]         = useState(false);

  // Sync custom slider values
  const updateCustomValue = useCallback((id, val) => {
    setCustomSliders(prev => prev.map(s => s.id === id ? { ...s, value: val } : s));
  }, []);

  const m = useMemo(() => computeModel({
    salesPerCycle, avgPhoneLoss, conversionPct, avgNewTariff, profitMargin,
    existingClientPct, existingTariff, newTariff, years,
  }, customSliders), [
    salesPerCycle, avgPhoneLoss, conversionPct, avgNewTariff, profitMargin,
    existingClientPct, existingTariff, newTariff, years, customSliders,
  ]);

  const finalNet = m.finalNet;
  const isProfit = finalNet >= 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, #2A1060 100%)`,
        borderBottom: `1px solid ${C.border}`, padding: "24px 32px 20px",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Ucell · BNPL Strategy Calculator
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800 }}>
              Финансовая модель: снижение цены + апгрейд тарифа
            </h1>
          </div>
          <button onClick={() => setShowAdmin(true)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.muted, padding: "8px 16px", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚙️ <span>Admin Panel</span>
          </button>
        </div>
      </div>

      {showAdmin && (
        <AdminPanel
          customSliders={customSliders}
          setCustomSliders={setCustomSliders}
          onClose={() => setShowAdmin(false)}
        />
      )}

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 20px" }}>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 24 }}>
          <Stat label="Потеря на телефонах / год" value={fmtNum(m.annualLoss, true) + " сум"} negative />
          <Stat label="Тарифный профит / мес (в пике)" value={"+" + fmtNum(m.monthlyAtScale, true) + " сум"} />
          <Stat label="Окупаемость портфеля"
            value={m.breakEvenMonth ? `${m.breakEvenMonth} мес` : "> горизонта"}
            sub={m.breakEvenMonth ? `≈ ${(m.breakEvenMonth / 12).toFixed(1)} лет` : "нужно больше конверсий"}
            accent={m.breakEvenMonth ? (m.breakEvenMonth <= 18 ? C.mint : C.gold) : C.red} />
          <Stat label={`Итог за ${years} г.`}
            value={(finalNet >= 0 ? "+" : "") + fmtNum(finalNet, true) + " сум"}
            negative={finalNet < 0} accent={isProfit ? C.mint : C.red} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, marginTop: 20 }}>

          {/* ── Controls ── */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 20px" }}>
            <SectionHead accent={C.purple}>Параметры модели</SectionHead>

            <SliderWithInput label="BNPL-продажи за цикл (1.5 мес)"
              value={salesPerCycle} min={100} max={5000} step={50}
              onChange={setSalesPerCycle} suffix="шт"
              hint={`Годовых: ~${fmtNum(salesPerCycle * 8)} продаж (×8 циклов)`} />

            <SliderWithInput label="Средняя потеря на телефоне"
              value={avgPhoneLoss} min={50000} max={700000} step={5000}
              onChange={setAvgPhoneLoss} suffix="сум"
              hint="Ucell_цена − (cheapest × 0.96)" />

            <SliderWithInput label="Конверсия в апгрейд тарифа"
              value={Math.round(conversionPct * salesPerCycle)}
              min={0} max={salesPerCycle} step={1}
              onChange={v => setConversionPct(v / salesPerCycle)}
              suffix="шт" type="both"
              valueType={convValueType} onValueTypeChange={setConvValueType}
              baseValue={salesPerCycle}
              hint={`${fmtNum(Math.round(conversionPct * salesPerCycle))} чел / цикл · ${(conversionPct * 100).toFixed(1)}%`}
              accent={C.mint} />

            <SliderWithInput label="Средний новый тариф"
              value={avgNewTariff} min={45000} max={180000} step={5000}
              onChange={setAvgNewTariff} suffix="сум/мес"
              hint={`Профит Ucell: ${fmtNum(Math.round(avgNewTariff * profitMargin))} сум/мес/клиент`} />

            <SliderWithInput label="Маржинальность Ucell на тарифе"
              value={Math.round(profitMargin * 100)} min={50} max={90} step={5}
              onChange={v => setProfitMargin(v / 100)} suffix="%" type="percent"
              hint="Из Excel: 75%" accent={C.purpleL} />

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 6 }}>
              <SectionHead accent={C.gold}>Сегменты клиентов</SectionHead>

              <SliderWithInput label="Доля текущих клиентов"
                value={Math.round(existingClientPct * 100)} min={10} max={95} step={1}
                onChange={v => setExistingClientPct(v / 100)} suffix="%"
                type="both"
                valueType="percent"
                hint={`Текущих ${Math.round(existingClientPct * 100)}% · Новых ${Math.round((1 - existingClientPct) * 100)}%`}
                accent={C.gold} />

              <SliderWithInput label="Тариф текущих клиентов"
                value={existingTariff} min={10000} max={80000} step={5000}
                onChange={setExistingTariff} suffix="сум/мес"
                hint="Из Excel: 15 000 сум" accent={C.gold} />

              <SliderWithInput label="Тариф новых клиентов"
                value={newTariff} min={20000} max={180000} step={5000}
                onChange={setNewTariff} suffix="сум/мес"
                hint="Из Excel: 60 000 сум" accent={C.gold} />
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 6 }}>
              <SliderWithInput label="Горизонт прогноза"
                value={years} min={1} max={5} step={1}
                onChange={setYears} suffix="лет" accent={C.purpleL} />
            </div>

            {/* Custom sliders rendered here */}
            {customSliders.filter(s => s.active).length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 6 }}>
                <SectionHead accent={C.purpleL}>Пользовательские параметры</SectionHead>
                {customSliders.filter(s => s.active).map(s => (
                  <SliderWithInput
                    key={s.id}
                    label={s.label}
                    value={s.value}
                    min={s.min} max={s.max} step={s.step}
                    onChange={v => updateCustomValue(s.id, v)}
                    suffix={s.suffix}
                    hint={s.hint || (s.linkedTo ? `Заменяет: ${LINK_OPTIONS.find(o => o.value === s.linkedTo)?.label}` : "Только информация")}
                    type={s.valueType || "number"}
                    accent={C.purpleL}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Charts ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 18px 10px" }}>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Накопленный P&L</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
                Потери vs тарифный профит
                {m.breakEvenMonth && <span style={{ color: C.mint, marginLeft: 8 }}>✓ BEP на {m.breakEvenMonth} мес</span>}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={m.timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.mint} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.mint} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.red} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tickFormatter={v => fmtNum(v, true)} tick={{ fill: C.muted, fontSize: 9 }} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: C.muted, fontSize: 11 }} />
                  <Area type="monotone" dataKey="cumGain" name="Тарифный профит" stroke={C.mint} strokeWidth={2} fill="url(#gG)" />
                  <Area type="monotone" dataKey="cumLoss" name="Потери на телефонах" stroke={C.red} strokeWidth={2} fill="url(#lG)" />
                  {m.breakEvenMonth && (
                    <ReferenceLine x={`м${m.breakEvenMonth}`} stroke={C.mint} strokeDasharray="4 2"
                      label={{ value: "BEP", fill: C.mint, fontSize: 9 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 18px 10px" }}>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Чистый результат</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Ниже нуля = ещё окупается</div>
              <ResponsiveContainer width="100%" height={165}>
                <AreaChart data={m.timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isProfit ? C.mint : C.red} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isProfit ? C.mint : C.red} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tickFormatter={v => fmtNum(v, true)} tick={{ fill: C.muted, fontSize: 9 }} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke={C.border} strokeWidth={2} />
                  <Area type="monotone" dataKey="net" name="Чистый результат"
                    stroke={isProfit ? C.mint : C.red} strokeWidth={2.5} fill="url(#nG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>

        {/* Detailed stats */}
        <SectionHead accent={C.gold}>Детализация по сегментам</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <Stat label={`Текущие клиенты (${Math.round(existingClientPct * 100)}%)`}
            value={fmtNum(m.existingClients) + " чел"}
            sub={`${fmtNum(existingTariff)} сум/мес · год: ${fmtNum(m.existingRevenue, true)} сум`}
            accent={C.gold} />
          <Stat label={`Новые клиенты (${Math.round((1 - existingClientPct) * 100)}%)`}
            value={fmtNum(m.newClients) + " чел"}
            sub={`${fmtNum(newTariff)} сум/мес · год: ${fmtNum(m.newRevenue, true)} сум`}
            accent={C.purpleL} />
          <Stat label="Тарифная выручка / год (сегменты)"
            value={fmtNum(m.totalSegmentRevenue, true) + " сум"}
            sub={`${fmtNum(m.existingRevenue, true)} + ${fmtNum(m.newRevenue, true)}`} />
        </div>

        <SectionHead>Экономика на одного клиента</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat label="Потеря на скидке (раз)" value={"-" + fmtNum(avgPhoneLoss) + " сум"} negative />
          <Stat label="Профит с тарифа / мес"
            value={"+" + fmtNum(m.monthlyTariffPerClient) + " сум"}
            sub={`${fmtNum(avgNewTariff)} × ${Math.round(profitMargin * 100)}%`} />
          <Stat label="Окупаемость (1 клиент)"
            value={m.paybackClient.toFixed(1) + " мес"}
            accent={m.paybackClient <= 6 ? C.mint : m.paybackClient <= 12 ? C.gold : C.red} />
          <Stat label="Объём займа / год"
            value={fmtNum(m.loanVolume, true) + " сум"}
            sub={fmtNum(m.annualSales) + " прод. × потеря"} />
        </div>

        {/* Table */}
        <SectionHead>Детальная таблица</SectionHead>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.card }}>
                  {["Месяц", "Активных апгрейдеров", "Профит / мес", "Накопл. потери", "Накопл. профит", "Чистый итог"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "right", color: C.muted, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.timeline.map((r, i) => {
                  const isBreak = r.month === m.breakEvenMonth;
                  return (
                    <tr key={i} style={{ background: isBreak ? `${C.mint}12` : i % 2 === 0 ? "transparent" : `${C.card}88` }}>
                      <td style={{ padding: "7px 14px", color: isBreak ? C.mint : C.white, fontWeight: isBreak ? 700 : 400 }}>
                        {isBreak ? "✓ " : ""}{r.label}
                      </td>
                      <td style={{ padding: "7px 14px", textAlign: "right", color: C.purpleL }}>{fmtNum(r.activeUpgraders)}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", color: C.mint }}>+{fmtNum(r.monthlyGain, true)}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", color: C.red }}>-{fmtNum(r.cumLoss, true)}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", color: C.mint }}>+{fmtNum(r.cumGain, true)}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", color: r.net >= 0 ? C.mint : C.red, fontWeight: 700 }}>
                        {r.net >= 0 ? "+" : ""}{fmtNum(r.net, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 32, padding: "14px 20px", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 11, color: C.mutedD, lineHeight: 1.6 }}>
          <b style={{ color: C.muted }}>Допущения:</b> 1.5-месячные циклы × 8 = год; апгрейднутые клиенты платят тариф бессрочно; профит Ucell = маржа × полная сумма нового тарифа; потеря = старая цена Ucell − (cheapest_competitor × 0.96).
        </div>

      </div>
    </div>
  );
}

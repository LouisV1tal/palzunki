import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const C = {
  bg: "#0F0A1A", surface: "#1A1130", card: "#221840", border: "#3D2C6A",
  purple: "#7B3FA0", purpleL: "#9B5AC0", mint: "#1FC9A8", mintD: "#16A088",
  red: "#E05555", gold: "#F5C842", white: "#F0EAF8", muted: "#9080B0",
  mutedD: "#6050A0", admin: "#0E1A2B",
};

const fmtNum = (n, short = false) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (short) {
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + " млрд";
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + " млн";
    if (abs >= 1e3) return (n / 1e3).toFixed(0) + " тыс";
    return Math.round(n).toString();
  }
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
};

// ─── All known model params (for formula builder) ────────────────────────────
const MODEL_PARAMS = [
  { key: "salesPerCycle",     label: "Продажи за цикл",        unit: "шт"   },
  { key: "avgPhoneLoss",      label: "Потеря на телефоне",      unit: "сум"  },
  { key: "conversionPct",     label: "Конверсия (доля)",        unit: ""     },
  { key: "avgNewTariff",      label: "Новый тариф",             unit: "сум"  },
  { key: "profitMargin",      label: "Маржа Ucell (доля)",      unit: ""     },
  { key: "existingClientPct", label: "Доля текущих клиентов",   unit: ""     },
  { key: "existingTariff",    label: "Тариф текущих клиентов",  unit: "сум"  },
  { key: "newTariff",         label: "Тариф новых клиентов",    unit: "сум"  },
  { key: "years",             label: "Горизонт (лет)",          unit: "лет"  },
  { key: "SLIDER_VALUE",      label: "Значение этого ползунка", unit: ""     },
];

// Evaluate a formula string like "salesPerCycle * avgPhoneLoss / avgNewTariff"
// against a context object of { key: value }
function evalFormula(formula, ctx) {
  try {
    // Replace known param names with their values
    let expr = formula;
    MODEL_PARAMS.forEach(p => {
      const re = new RegExp(`\\b${p.key}\\b`, "g");
      const val = ctx[p.key] ?? 0;
      expr = expr.replace(re, val);
    });
    // Safe eval — only allow numbers and math operators
    if (/[^0-9+\-*/.() ]/.test(expr)) return null;
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${expr})`)();
  } catch { return null; }
}

// ─── SliderWithInput ──────────────────────────────────────────────────────────
function SliderWithInput({
  label, value, min, max, step = 1, onChange,
  suffix = "", hint, accent = C.mint,
  type = "number",
  valueType, onValueTypeChange,
  baseValue,
}) {
  const [rawInput, setRawInput] = useState("");
  const [focused, setFocused] = useState(false);

  // No upper-bound clamp on input — user can type any number
  function commitInput(raw) {
    let v = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
    if (isNaN(v)) return;
    if (type === "both" && valueType === "percent" && baseValue) {
      v = Math.round(baseValue * v / 100);
    }
    v = Math.max(v, min); // only enforce minimum, no maximum clamp
    onChange(v);
  }

  const displayedValue = type === "both" && valueType === "percent" && baseValue
    ? ((value / baseValue) * 100).toFixed(1) + "%"
    : fmtNum(value) + (suffix ? " " + suffix : "");

  // Slider ratio capped at 1 so the track doesn't overflow visually
  const ratio = Math.min(Math.max((value - min) / (max - min), 0), 1);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
        {type === "both" && onValueTypeChange && (
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {["number", "percent"].map(t => (
              <button key={t} onClick={() => onValueTypeChange(t)} style={{
                padding: "2px 10px", fontSize: 10, cursor: "pointer", border: "none",
                background: valueType === t ? accent : C.card,
                color: valueType === t ? "#000" : C.muted,
                fontWeight: valueType === t ? 700 : 400,
              }}>{t === "number" ? "шт" : "%"}</button>
            ))}
          </div>
        )}
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: C.border, marginBottom: 2 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${ratio * 100}%`, borderRadius: 2,
          background: `linear-gradient(90deg, ${C.purple}, ${accent})`,
        }} />
      </div>
      <input type="range" min={min} max={Math.max(max, value)} step={step} value={Math.min(value, Math.max(max, value))}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: -8, opacity: 0, cursor: "pointer", position: "relative", zIndex: 1, height: 20 }} />

      {/* Text input — no max restriction */}
      <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
        <input type="text"
          value={focused ? rawInput : displayedValue}
          onFocus={() => { setRawInput(String(value)); setFocused(true); }}
          onChange={e => setRawInput(e.target.value)}
          onBlur={() => { commitInput(rawInput); setFocused(false); }}
          onKeyDown={e => { if (e.key === "Enter") { commitInput(rawInput); e.target.blur(); } }}
          style={{
            flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            color: accent, fontSize: 13, fontWeight: 700, padding: "5px 10px",
            outline: "none", fontVariantNumeric: "tabular-nums",
          }}
        />
        <span style={{ color: C.mutedD, fontSize: 11, minWidth: 28 }}>
          {type === "both" && valueType === "percent" ? "%" : suffix}
        </span>
      </div>
      {hint && <div style={{ color: C.mutedD, fontSize: 11, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

// ─── Formula Builder component ────────────────────────────────────────────────
// Lets the user build "term OP term OP term …" visually
// Each term is either a model param or a numeric literal
function FormulaBuilder({ formula, onChange }) {
  // formula: array of { type: "param"|"literal"|"op", value: string }
  function addTerm(type) {
    onChange([...formula, { type, value: type === "op" ? "*" : type === "param" ? "salesPerCycle" : "1" }]);
  }
  function removeLast() {
    onChange(formula.slice(0, -1));
  }
  function updateTerm(idx, val) {
    onChange(formula.map((t, i) => i === idx ? { ...t, value: val } : t));
  }
  function toFormulaString(f) {
    return f.map(t => t.value).join(" ");
  }

  const preview = toFormulaString(formula);

  return (
    <div>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>Формула связки</div>

      {/* Term chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {formula.map((term, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {term.type === "op" ? (
              <select value={term.value} onChange={e => updateTerm(idx, e.target.value)} style={{
                background: C.purpleL, border: "none", borderRadius: 6,
                color: "#fff", fontWeight: 700, fontSize: 14, padding: "4px 8px", cursor: "pointer",
              }}>
                {["*", "/", "+", "-"].map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            ) : term.type === "param" ? (
              <select value={term.value} onChange={e => updateTerm(idx, e.target.value)} style={{
                background: C.card, border: `1px solid ${C.mint}`, borderRadius: 6,
                color: C.mint, fontSize: 11, padding: "4px 8px", cursor: "pointer",
              }}>
                {MODEL_PARAMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            ) : (
              <input type="number" value={term.value}
                onChange={e => updateTerm(idx, e.target.value)}
                style={{
                  width: 72, background: C.card, border: `1px solid ${C.gold}`, borderRadius: 6,
                  color: C.gold, fontSize: 12, padding: "4px 8px", outline: "none",
                }} />
            )}
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[
          { label: "+ Параметр", type: "param", color: C.mint },
          { label: "+ Оператор", type: "op", color: C.purpleL },
          { label: "+ Число",    type: "literal", color: C.gold },
        ].map(btn => (
          <button key={btn.type} onClick={() => addTerm(btn.type)} style={{
            flex: 1, padding: "5px 0", borderRadius: 6,
            border: `1px solid ${btn.color}`, background: "transparent",
            color: btn.color, fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>{btn.label}</button>
        ))}
        {formula.length > 0 && (
          <button onClick={removeLast} style={{
            padding: "5px 10px", borderRadius: 6,
            border: `1px solid ${C.red}`, background: "transparent",
            color: C.red, fontSize: 10, cursor: "pointer",
          }}>← Удалить</button>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
          padding: "6px 10px", fontSize: 11, color: C.muted, fontFamily: "monospace",
        }}>
          <span style={{ color: C.mutedD }}>формула: </span>
          <span style={{ color: C.white }}>{preview}</span>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent = C.mint, negative = false }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ color: C.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ color: negative ? C.red : accent, fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</div>
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
function computeModel(baseParams, customSliders) {
  let p = { ...baseParams };

  // Apply custom sliders: either direct override or formula result
  customSliders.forEach(s => {
    if (!s.active) return;
    const ctx = { ...p, SLIDER_VALUE: s.value };
    if (s.formula && s.formula.length > 0) {
      const formulaStr = s.formula.map(t => t.value).join(" ");
      const result = evalFormula(formulaStr, ctx);
      if (result !== null && !isNaN(result) && s.linkedTo) {
        p[s.linkedTo] = result;
      }
    } else if (s.linkedTo) {
      // simple override
      if (s.linkedTo === "conversionPct") p[s.linkedTo] = s.value / 100;
      else p[s.linkedTo] = s.value;
    }
  });

  const {
    salesPerCycle, avgPhoneLoss, conversionPct, avgNewTariff,
    profitMargin, existingClientPct, existingTariff, newTariff, years,
  } = p;

  const annualSales = salesPerCycle * 8;
  const annualLoss = annualSales * avgPhoneLoss;
  const upgradersPerCycle = Math.round(salesPerCycle * conversionPct);
  const monthlyTariffPerClient = avgNewTariff * profitMargin;
  const paybackClient = avgPhoneLoss / monthlyTariffPerClient;

  const months = years * 12;
  const timeline = [];
  let cumLoss = 0, cumGain = 0, activeUpgraders = 0;
  let breakEvenMonth = null, stableMonth = null;

  for (let m = 1; m <= months; m++) {
    if ((m - 1) % 3 === 0) {
      activeUpgraders += upgradersPerCycle;
      cumLoss += salesPerCycle * avgPhoneLoss;
    }
    const monthlyGain = activeUpgraders * monthlyTariffPerClient;
    cumGain += monthlyGain;
    const net = cumGain - cumLoss;
    if (net >= 0 && !breakEvenMonth) breakEvenMonth = m;
    if (monthlyGain >= (salesPerCycle * avgPhoneLoss) / 1.5 && !stableMonth) stableMonth = m;

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

  return {
    annualSales, annualLoss, upgradersPerCycle, monthlyTariffPerClient, paybackClient,
    timeline, breakEvenMonth, stableMonth,
    existingClients, newClients,
    existingRevenue: existingClients * existingTariff * 12,
    newRevenue: newClients * newTariff * 12,
    totalSegmentRevenue: existingClients * existingTariff * 12 + newClients * newTariff * 12,
    loanVolume: annualSales * avgPhoneLoss,
    monthlyAtScale: Math.round(annualSales * conversionPct * monthlyTariffPerClient),
    finalNet: timeline[timeline.length - 1]?.net ?? 0,
  };
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const EMPTY_DRAFT = {
  label: "", min: 0, max: 10000000, step: 100000,
  value: 1000000, suffix: "сум", hint: "", linkedTo: "",
  active: true, valueType: "number", formula: [],
};

function AdminPanel({ customSliders, setCustomSliders, baseParams, onClose }) {
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });

  function addSlider() {
    if (!draft.label.trim()) return;
    setCustomSliders(prev => [...prev, { ...draft, id: Date.now() }]);
    setDraft({ ...EMPTY_DRAFT });
  }

  function removeSlider(id) {
    setCustomSliders(prev => prev.filter(s => s.id !== id));
  }

  function toggleActive(id) {
    setCustomSliders(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  function editSlider(id, key, val) {
    setCustomSliders(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));
  }

  // Live formula preview
  const ctx = { ...baseParams, SLIDER_VALUE: draft.value };
  const formulaStr = draft.formula.map(t => t.value).join(" ");
  const formulaResult = formulaStr ? evalFormula(formulaStr, ctx) : null;

  const inputStyle = {
    width: "100%", background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.white, fontSize: 13, padding: "6px 10px",
    boxSizing: "border-box", outline: "none",
  };

  function field(key, label, type = "text") {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{label}</div>
        <input type={type} value={draft[key]}
          onChange={e => setDraft(d => ({ ...d, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          style={inputStyle} />
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 20,
      overflowY: "auto",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.admin, border: `1px solid ${C.border}`, borderRadius: 16,
        width: 460, padding: 24, marginTop: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>⚙️ Admin Panel</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ color: C.mint, fontWeight: 600, fontSize: 13, marginBottom: 14 }}>+ Новый ползунок</div>

          {field("label", "Название параметра")}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {field("min", "Минимум", "number")}
            {field("max", "Максимум (начальный)", "number")}
            {field("step", "Шаг", "number")}
            {field("value", "Начальное значение", "number")}
          </div>

          {field("suffix", "Единица (сум, шт, % ...)")}
          {field("hint", "Подсказка")}

          {/* Value type */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>Тип значения</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["number", "percent", "both"].map(t => (
                <button key={t} onClick={() => setDraft(d => ({ ...d, valueType: t }))} style={{
                  flex: 1, padding: "6px 0", borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: draft.valueType === t ? C.mint : C.card,
                  color: draft.valueType === t ? "#000" : C.muted,
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                }}>
                  {t === "number" ? "Число" : t === "percent" ? "Процент" : "Оба"}
                </button>
              ))}
            </div>
          </div>

          {/* Target param */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Параметр модели (цель)</div>
            <select value={draft.linkedTo}
              onChange={e => setDraft(d => ({ ...d, linkedTo: e.target.value }))}
              style={{ ...inputStyle }}>
              <option value="">— не связывать</option>
              {MODEL_PARAMS.filter(p => p.key !== "SLIDER_VALUE").map(p => (
                <option key={p.key} value={p.key}>{p.label} ({p.unit})</option>
              ))}
            </select>
          </div>

          {/* Formula builder */}
          <div style={{ marginBottom: 14, background: C.card, borderRadius: 10, padding: 12 }}>
            <FormulaBuilder
              formula={draft.formula}
              onChange={f => setDraft(d => ({ ...d, formula: f }))}
            />
            {formulaResult !== null && (
              <div style={{
                marginTop: 8, background: C.surface, borderRadius: 6,
                padding: "6px 10px", fontSize: 12,
              }}>
                <span style={{ color: C.muted }}>Результат при текущих значениях: </span>
                <span style={{ color: C.mint, fontWeight: 700 }}>{fmtNum(formulaResult)}</span>
                {draft.linkedTo && (
                  <span style={{ color: C.mutedD }}> → перезапишет «{MODEL_PARAMS.find(p => p.key === draft.linkedTo)?.label}»</span>
                )}
              </div>
            )}
            {draft.formula.length === 0 && (
              <div style={{ color: C.mutedD, fontSize: 11, marginTop: 6 }}>
                Без формулы — ползунок напрямую заменяет выбранный параметр.<br />
                С формулой — результат вычисления записывается в параметр модели.
              </div>
            )}
          </div>

          <button onClick={addSlider} style={{
            width: "100%", padding: "10px 0", borderRadius: 8,
            background: `linear-gradient(135deg, ${C.purple}, ${C.mint})`,
            border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>Добавить ползунок</button>
        </div>

        {/* Existing sliders */}
        {customSliders.length > 0 && (
          <div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Добавленные ползунки ({customSliders.length})</div>
            {customSliders.map(s => {
              const sFormulaStr = s.formula?.map(t => t.value).join(" ") ?? "";
              return (
                <div key={s.id} style={{
                  background: C.surface, borderRadius: 10, padding: "12px 14px",
                  marginBottom: 8, opacity: s.active ? 1 : 0.5,
                  border: `1px solid ${s.active ? C.border : C.mutedD}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                    <div style={{ display: "flex", gap: 6 }}>
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

                  {/* Inline value edit */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>Значение:</span>
                    <input type="number" value={s.value}
                      onChange={e => editSlider(s.id, "value", Number(e.target.value))}
                      style={{
                        width: 110, background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: 6, color: C.mint, fontSize: 12, padding: "3px 8px", outline: "none",
                      }} />
                    <span style={{ color: C.mutedD, fontSize: 11 }}>{s.suffix}</span>
                  </div>

                  <div style={{ color: C.mutedD, fontSize: 10, lineHeight: 1.5 }}>
                    {s.linkedTo && <span style={{ color: C.mint }}>→ {MODEL_PARAMS.find(p => p.key === s.linkedTo)?.label}</span>}
                    {sFormulaStr && <span style={{ color: C.gold }}> · формула: <code style={{ fontSize: 10 }}>{sFormulaStr}</code></span>}
                  </div>
                </div>
              );
            })}
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
  const [showAdmin,         setShowAdmin]         = useState(false);

  const updateCustomValue = useCallback((id, val) => {
    setCustomSliders(prev => prev.map(s => s.id === id ? { ...s, value: val } : s));
  }, []);

  const baseParams = {
    salesPerCycle, avgPhoneLoss, conversionPct, avgNewTariff, profitMargin,
    existingClientPct, existingTariff, newTariff, years,
  };

  const m = useMemo(() => computeModel(baseParams, customSliders),
    
    [salesPerCycle, avgPhoneLoss, conversionPct, avgNewTariff, profitMargin,
     existingClientPct, existingTariff, newTariff, years, customSliders]);

  const isProfit = m.finalNet >= 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, #2A1060 100%)`,
        borderBottom: `1px solid ${C.border}`, padding: "22px 32px 18px",
      }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Ucell · BNPL Strategy Calculator</div>
            <h1 style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 800 }}>Финансовая модель: снижение цены + апгрейд тарифа</h1>
          </div>
          <button onClick={() => setShowAdmin(true)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.muted, padding: "8px 18px", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}>⚙️ Admin Panel</button>
        </div>
      </div>

      {showAdmin && (
        <AdminPanel
          customSliders={customSliders}
          setCustomSliders={setCustomSliders}
          baseParams={baseParams}
          onClose={() => setShowAdmin(false)}
        />
      )}

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 20px" }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 22 }}>
          <Stat label="Потеря на телефонах / год" value={fmtNum(m.annualLoss, true) + " сум"} negative />
          <Stat label="Тарифный профит / мес (пик)" value={"+" + fmtNum(m.monthlyAtScale, true) + " сум"} />
          <Stat label="Окупаемость портфеля"
            value={m.breakEvenMonth ? `${m.breakEvenMonth} мес` : "> горизонта"}
            sub={m.breakEvenMonth ? `≈ ${(m.breakEvenMonth / 12).toFixed(1)} лет` : "нужно больше конверсий"}
            accent={m.breakEvenMonth ? (m.breakEvenMonth <= 18 ? C.mint : C.gold) : C.red} />
          <Stat label={`Итог за ${years} лет`}
            value={(m.finalNet >= 0 ? "+" : "") + fmtNum(m.finalNet, true) + " сум"}
            negative={m.finalNet < 0} accent={isProfit ? C.mint : C.red} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 20, marginTop: 20 }}>

          {/* Controls */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 20px" }}>
            <SectionHead accent={C.purple}>Параметры модели</SectionHead>

            <SliderWithInput label="BNPL-продажи за цикл (1.5 мес)"
              value={salesPerCycle} min={10} max={5000} step={10}
              onChange={setSalesPerCycle} suffix="шт"
              hint={`Годовых: ~${fmtNum(salesPerCycle * 8)} (×8 циклов)`} />

            <SliderWithInput label="Средняя потеря на телефоне"
              value={avgPhoneLoss} min={1000} max={2000000} step={1000}
              onChange={setAvgPhoneLoss} suffix="сум"
              hint="Ucell_цена − (cheapest × 0.96)" />

            <SliderWithInput label="Конверсия в апгрейд тарифа"
              value={Math.round(conversionPct * salesPerCycle)}
              min={0} max={salesPerCycle} step={1}
              onChange={v => setConversionPct(v / salesPerCycle)}
              suffix="шт" type="both"
              valueType={convValueType} onValueTypeChange={setConvValueType}
              baseValue={salesPerCycle}
              hint={`${Math.round(conversionPct * salesPerCycle)} чел/цикл · ${(conversionPct * 100).toFixed(1)}%`}
              accent={C.mint} />

            <SliderWithInput label="Средний новый тариф"
              value={avgNewTariff} min={10000} max={1000000} step={1000}
              onChange={setAvgNewTariff} suffix="сум/мес"
              hint={`Профит Ucell: ${fmtNum(Math.round(avgNewTariff * profitMargin))} сум/клиент/мес`} />

            <SliderWithInput label="Маржинальность Ucell"
              value={Math.round(profitMargin * 100)} min={10} max={99} step={1}
              onChange={v => setProfitMargin(v / 100)} suffix="%"
              hint="Из Excel: 75%" accent={C.purpleL} />

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 4 }}>
              <SectionHead accent={C.gold}>Сегменты клиентов</SectionHead>

              <SliderWithInput label="Доля текущих клиентов"
                value={Math.round(existingClientPct * 100)} min={1} max={99} step={1}
                onChange={v => setExistingClientPct(v / 100)} suffix="%"
                type="both" valueType="percent"
                hint={`Текущих ${Math.round(existingClientPct * 100)}% · Новых ${Math.round((1 - existingClientPct) * 100)}%`}
                accent={C.gold} />

              <SliderWithInput label="Тариф текущих клиентов"
                value={existingTariff} min={1000} max={1000000} step={1000}
                onChange={setExistingTariff} suffix="сум/мес" accent={C.gold}
                hint="Из Excel: 15 000 сум" />

              <SliderWithInput label="Тариф новых клиентов"
                value={newTariff} min={1000} max={1000000} step={1000}
                onChange={setNewTariff} suffix="сум/мес" accent={C.gold}
                hint="Из Excel: 60 000 сум" />
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 4 }}>
              <SliderWithInput label="Горизонт прогноза"
                value={years} min={1} max={10} step={1}
                onChange={setYears} suffix="лет" accent={C.purpleL} />
            </div>

            {/* Custom sliders */}
            {customSliders.filter(s => s.active).length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginTop: 4 }}>
                <SectionHead accent={C.purpleL}>Пользовательские параметры</SectionHead>
                {customSliders.filter(s => s.active).map(s => (
                  <SliderWithInput key={s.id}
                    label={s.label}
                    value={s.value} min={s.min} max={Math.max(s.max, s.value)} step={s.step}
                    onChange={v => updateCustomValue(s.id, v)}
                    suffix={s.suffix} hint={s.hint || undefined}
                    type={s.valueType || "number"} accent={C.purpleL} />
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 18px 10px" }}>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Накопленный P&L</div>
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
              <div style={{ color: C.white, fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Чистый результат</div>
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

        {/* Segments */}
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
          <Stat label="Тарифная выручка / год"
            value={fmtNum(m.totalSegmentRevenue, true) + " сум"}
            sub={`${fmtNum(m.existingRevenue, true)} + ${fmtNum(m.newRevenue, true)}`} />
        </div>

        {/* Per-client */}
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
        <SectionHead>Детальная таблица по периодам</SectionHead>
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

        <div style={{ marginTop: 28, padding: "14px 20px", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 11, color: C.mutedD, lineHeight: 1.6 }}>
          <b style={{ color: C.muted }}>Допущения:</b> 1.5-месячные циклы × 8 = год; апгрейднутые клиенты платят тариф бессрочно; профит Ucell = маржа × полная сумма нового тарифа; потеря = старая цена Ucell − (cheapest × 0.96).
        </div>
      </div>
    </div>
  );
}

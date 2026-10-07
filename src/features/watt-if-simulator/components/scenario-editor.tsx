"use client";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { applianceIcons } from "@/features/appliance-registration/components/appliance-picker";
import type { PreviewAppliance } from "@/features/dashboard/preview-data";
import type { ScenarioEntry } from "../types";

export default function ScenarioEditor({ entries, baseline, days, onChange, onAdd, onRemove, onReset }: {
  entries: ScenarioEntry[]; baseline: PreviewAppliance[]; days: string;
  onChange: (id: string, patch: Partial<ScenarioEntry>) => void; onAdd: () => void; onRemove: (id: string) => void; onReset: (id: string) => void;
}) {
  return <section className="ui-panel wi-editor" aria-labelledby="wi-editor-heading">
    <div className="ui-panel-heading"><div><h2 id="wi-editor-heading">Your what-if appliances</h2><p>Adjust usage, swap a power rating, or add a different appliance.</p></div><span className="ui-count">{entries.filter(item => item.included).length} included</span></div>
    <div className="wi-entries">{entries.map((entry, index) => {
      const original = baseline.find(item => item.id === entry.id);
      const Icon = applianceIcons[entry.kind] ?? applianceIcons.other;
      return <fieldset key={entry.id} className={`wi-entry${entry.included ? "" : " is-excluded"}`} aria-label={`Scenario appliance ${index + 1}`}>
        <legend className="ws-sr-only">{entry.name || `Appliance ${index + 1}`}</legend>
        <div className="wi-entry-head"><span className={`ap-icon is-${entry.kind}`}><Icon aria-hidden="true" /></span><div><h3>{entry.name || "New scenario appliance"}</h3><p>{original ? "From your baseline" : "Added only to this scenario"}</p></div><label className="wi-include"><input type="checkbox" checked={entry.included} aria-label={`Include ${entry.name || `appliance ${index + 1}`} in scenario`} onChange={event => onChange(entry.id, { included: event.target.checked })} /><span>Include</span></label></div>
        {original && <p className="wi-original-values">Baseline: {original.watts} W × {original.quantity} × {original.hours} hrs/day × {days || "—"} days</p>}
        <div className="wi-entry-fields">
          <label className="wi-wide">Scenario name<input aria-label={`Scenario name for appliance ${index + 1}`} value={entry.name} maxLength={80} disabled={!entry.included} placeholder="e.g. LED bulbs or bedroom fan" onChange={event => onChange(entry.id, { name: event.target.value })} /></label>
          <label>Power <small>W</small><input aria-label={`Power in watts for appliance ${index + 1}`} type="number" inputMode="decimal" min="0.001" step="any" disabled={!entry.included} value={entry.watts} placeholder="Unknown" onChange={event => onChange(entry.id, { watts: event.target.value })} /></label>
          <label>Quantity<input aria-label={`Quantity for appliance ${index + 1}`} type="number" inputMode="numeric" min="1" max="50" step="1" disabled={!entry.included} value={entry.quantity} onChange={event => onChange(entry.id, { quantity: event.target.value })} /></label>
          <label className="wi-wide wi-hours-label">Hours per day<input aria-label={`Hours per day for appliance ${index + 1}`} type="number" inputMode="decimal" min="0" max="24" step="any" disabled={!entry.included} value={entry.hours} placeholder="0 to 24" onChange={event => onChange(entry.id, { hours: event.target.value })} /></label>
        </div>
        <input className="wi-hours-slider" aria-label={`Adjust hours for appliance ${index + 1}`} type="range" min="0" max="24" step="0.25" disabled={!entry.included} value={Math.min(24, Math.max(0, Number(entry.hours) || 0))} onChange={event => onChange(entry.id, { hours: event.target.value })} /><div className="wi-slider-labels" aria-hidden="true"><span>0 hrs</span><span>12 hrs</span><span>24 hrs</span></div>
        <div className="wi-entry-actions">{original ? <button type="button" onClick={() => onReset(entry.id)}><RotateCcw size={14} aria-hidden="true" />Reset this appliance</button> : <button type="button" onClick={() => onRemove(entry.id)}><Trash2 size={14} aria-hidden="true" />Remove from scenario</button>}{!entry.included && <span>Excluded · contributes 0 kWh</span>}</div>
      </fieldset>;
    })}</div>
    <button type="button" className="ui-secondary wi-add" onClick={onAdd}><Plus size={17} aria-hidden="true" />Add scenario appliance</button>
    <p className="ui-helper">For partial fan substitution, reduce the aircon’s hours and add a fan for those hours. Use rated watts from the labels or your own clearly approximate inputs.</p>
  </section>;
}

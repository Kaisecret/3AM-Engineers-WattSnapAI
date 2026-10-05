"use client";
import { useState } from "react";
import { Plug, Plus, Trash2 } from "lucide-react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { dailyApplianceKwh, validateAppliance } from "../preview-data";

export default function AppliancesScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const total = household.appliances.reduce((sum, item) => sum + dailyApplianceKwh(item), 0);
  return <PageShell title="Appliances" subtitle="See how your appliances use energy" active="Appliances">
    <div className="ui-stats"><div><span>Your appliances</span><strong>{household.appliances.reduce((sum, item) => sum + item.quantity, 0)}</strong></div><div><span>Estimated daily use</span><strong>{total.toFixed(2)} <small>kWh</small></strong></div><div><span>Estimated monthly use</span><strong>{(total * 30).toFixed(2)} <small>kWh</small></strong></div></div>
    <div className="ui-two-columns">
      <section className="ui-panel"><div className="ui-panel-heading"><h2>Your appliances</h2><span className="ui-count">{household.appliances.length} entries</span></div>
        {household.appliances.length ? <div className="ui-appliance-list">{household.appliances.map(item => <div className="ui-appliance-row" key={item.id}><span className="ui-appliance-icon"><Plug /></span><div><h3>{item.name}</h3><p>{item.watts} W · {item.hours} hrs/day · Qty {item.quantity}</p></div><strong>{dailyApplianceKwh(item).toFixed(2)}<small>kWh/day</small></strong><button className="ui-icon-button" disabled={!ready} aria-label={`Remove ${item.name}`} onClick={() => { if (update({ appliances: household.appliances.filter(appliance => appliance.id !== item.id) })) setMessage(`${item.name} removed.`); }}><Trash2 size={16} /></button></div>)}</div> : <div className="ui-empty"><Plug /><h3>No appliances added yet</h3><p>Add an appliance to estimate its daily energy use.</p></div>}
        <p className="ui-helper">Estimates use wattage × hours × quantity. Monthly estimates assume 30 days; actual usage varies.</p>
      </section>
      <section className="ui-panel"><div className="ui-panel-heading"><h2><Plus size={20} /> Add appliance</h2></div>
        <form className="ui-form" onSubmit={event => {
          event.preventDefault(); setMessage(""); const data = new FormData(event.currentTarget);
          const appliance = { name: String(data.get("name")).trim(), watts: Number(data.get("watts")), hours: Number(data.get("hours")), quantity: Number(data.get("quantity")) };
          const issue = validateAppliance(appliance); if (issue) { setError(issue); return; }
          if (update({ appliances: [...household.appliances, { ...appliance, id: crypto.randomUUID() }] })) { setError(""); setMessage(`${appliance.name} added.`); event.currentTarget.reset(); }
        }}>
          <label>Appliance name<input name="name" placeholder="e.g. Electric fan" maxLength={80} required /></label>
          <label>Rated power (watts)<input name="watts" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="60" required /></label>
          <div className="ui-field-row"><label>Hours used per day<input name="hours" type="number" inputMode="decimal" min="0.1" max="24" step="0.1" placeholder="8" required /></label><label>Quantity<input name="quantity" type="number" min="1" step="1" defaultValue="1" required /></label></div>
          <button className="ui-primary" disabled={!ready} type="submit">Add appliance</button>
        </form>
        {message && <p className="ui-success" role="status">{message}</p>}{(error || storageError) && <p className="ui-error" role="alert">{error || storageError}</p>}
      </section>
    </div>
  </PageShell>;
}

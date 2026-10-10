"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleCheck, House, Info, LocateFixed, MapPin, Pencil, ReceiptText, ShieldCheck, WifiOff, X, Zap } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { previewProviders, previewProviderName } from "../provider-preview";
import { lookupLocation } from "../location-suggestion";
import { PROVINCES, getMunicipalitiesForProvince, getBarangaysForMunicipality } from "../philippine-locations";
import "../household-setup.css";

type Draft = { name: string; province: string; municipality: string; barangay: string; provider: string };
type FieldErrors = Partial<Record<keyof Draft, string>>;
const steps = ["Your household", "Electricity provider", "Review & save"];

export default function HouseholdSetupScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [complete, setComplete] = useState(false);
  const [offline, setOffline] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "example" | "manual">("idle");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const locationRequest = useRef<AbortController | null>(null);
  const lastLookup = useRef(0);
  const permission = useRef<HTMLDialogElement>(null);
  const locationButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const parts = household.location?.split(",").map(part => part.trim()) ?? [];
  const values: Draft = draft ?? {
    name: household.name,
    province: household.locality?.province ?? parts.at(-1) ?? "",
    municipality: household.locality?.municipality ?? (parts.length > 1 ? parts.at(-2)! : ""),
    barangay: household.locality?.barangay ?? (parts.length > 2 ? parts.slice(0, -2).join(", ") : ""),
    provider: household.provider ?? "",
  };
  const provider = previewProviders.find(item => item.id === values.provider);
  const location = [values.barangay.trim(), values.municipality.trim(), values.province.trim()].filter(Boolean).join(", ");
  const suggestions = previewProviders.filter(item => item.area.toLowerCase() === values.province.trim().toLowerCase());
  const availableMunicipalities = getMunicipalitiesForProvince(values.province);
  const availableBarangays = getBarangaysForMunicipality(values.province, values.municipality);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [step, complete]);

  useEffect(() => () => locationRequest.current?.abort(), []);

  useEffect(() => {
    if (ready && household.location && new URLSearchParams(window.location.search).get("step") === "provider") {
      setStep(1); setFurthest(1);
    }
  }, [ready, household.location]);

  function edit(patch: Partial<Draft>) {
    setDraft({ ...values, ...patch });
    setErrors({});
  }

  function handleProvinceChange(newProvince: string) {
    const nextMunis = getMunicipalitiesForProvince(newProvince);
    const keepMuni = nextMunis.some(m => m.toLowerCase() === values.municipality.toLowerCase());
    edit({
      province: newProvince,
      municipality: keepMuni ? values.municipality : "",
      barangay: keepMuni ? values.barangay : "",
    });
  }

  function handleMunicipalityChange(newMunicipality: string) {
    const nextBrgys = getBarangaysForMunicipality(values.province, newMunicipality);
    const keepBrgy = nextBrgys.some(b => b.toLowerCase() === values.barangay.toLowerCase());
    edit({
      municipality: newMunicipality,
      barangay: keepBrgy ? values.barangay : "",
    });
  }

  function go(next: number) {
    moved.current = true;
    setErrors({});
    setStep(next);
    setFurthest(previous => Math.max(previous, next));
  }

  function validateHousehold() {
    const issues: FieldErrors = {};
    if (!values.name.trim()) issues.name = "Enter a household name.";
    if (!values.province.trim()) issues.province = "Enter your province.";
    if (!values.municipality.trim()) issues.municipality = "Enter your municipality or city.";
    return issues;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = validateHousehold();
    if (Object.keys(issues).length) {
      setErrors(issues);
      if (step !== 0) { moved.current = true; setStep(0); }
      requestAnimationFrame(() => document.getElementById(`setup-${Object.keys(issues)[0]}`)?.focus());
      return;
    }
    if (step === 0) { go(1); return; }
    if (!provider) { setErrors({ provider: "Choose the provider shown on your electricity bill." }); return; }
    if (step === 1) { go(2); return; }
    if (update({ name: values.name.trim(), location, provider: provider.id, locality: { province: values.province.trim(), municipality: values.municipality.trim(), barangay: values.barangay.trim() } })) {
      moved.current = true;
      setComplete(true);
    }
  }

  function exampleLocation() {
    setLocationMessage("");
    edit({ province: "Antique", municipality: "San Jose de Buenavista", barangay: "Payao" });
    setLocationState("example");
    permission.current?.close();
  }

  function currentLocation() {
    permission.current?.close();
    if (!navigator.onLine) { setLocationMessage("You’re offline. Enter your home location manually."); return; }
    if (!navigator.geolocation) { setLocationMessage("This browser cannot request location. Enter your home location manually."); return; }
    if (locating || Date.now() - lastLookup.current < 1500) return;
    setLocating(true); setLocationState("idle"); setLocationMessage("Finding a location suggestion…");
    const request = new AbortController(); locationRequest.current = request;
    navigator.geolocation.getCurrentPosition(async position => {
      if (request.signal.aborted) return;
      lastLookup.current = Date.now();
      const timeout = window.setTimeout(() => request.abort(), 10000);
      try {
        const suggestion = await lookupLocation(position.coords.latitude, position.coords.longitude, request.signal);
        setDraft(previous => ({ ...(previous ?? values), ...suggestion, barangay: "" })); setErrors({});
        setLocationMessage("Location suggestion filled in. Check that it is your home, then confirm the provider shown on your bill.");
      } catch (issue) { setLocationMessage(issue instanceof Error && issue.name !== "AbortError" ? issue.message : "Location lookup timed out. Enter your home location manually."); }
      finally { window.clearTimeout(timeout); setLocating(false); }
    }, issue => {
      if (request.signal.aborted) return;
      setLocating(false); setLocationMessage(issue.code === 1 ? "Location permission was declined. You can enter your home location manually." : "Your location could not be found. Enter your home location manually.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  function saveProfile() {
    const issues = validateHousehold();
    if (Object.keys(issues).length) { setErrors(issues); requestAnimationFrame(() => document.getElementById(`setup-${Object.keys(issues)[0]}`)?.focus()); return; }
    if (update({ name: values.name.trim(), location, locality: { province: values.province.trim(), municipality: values.municipality.trim(), barangay: values.barangay.trim() } })) go(1);
  }

  return <PageShell title="Set up your household" subtitle="A little context for a smarter home" active="Home" className="hs-page">
    <div className="hs-preview-note"><Info aria-hidden="true" /><p><strong>UI preview</strong> · Try the setup flow. Location and provider choices are saved only in this browser.</p></div>
    {offline && <div className="hs-offline" role="status"><WifiOff aria-hidden="true" /><p><strong>You’re offline.</strong> You can enter your location and select a provider manually. Changes stay on this device.</p></div>}
    {!ready ? <section className="ui-panel hs-loading" role="status"><span className="hs-spinner" /> Loading your saved household…</section> : <div className="hs-layout">
      <aside className="hs-story">
        <span className="hs-eyebrow"><House size={15} aria-hidden="true" /> ONE HOME, ONE WATTSNAP</span>
        <h2>Your home.<br />Your energy story.</h2>
        <p>Start with where you live and who supplies your electricity. We’ll use this context for your bills and advisories.</p>
        <Image className="hs-mascot" src="/assets/branding/actions-3.png" alt="" width={320} height={320} sizes="(min-width: 900px) 220px, 110px" priority />
        <div className="hs-story-note"><ShieldCheck aria-hidden="true" /><span><strong>You choose what to share</strong>Location permission is optional. You can enter your home address yourself.</span></div>
      </aside>

      <section className="ui-panel hs-card" aria-labelledby="setup-heading">
        {complete ? <div className="hs-complete">
          <span className="hs-complete-icon"><CircleCheck aria-hidden="true" /></span>
          <span className="hs-eyebrow">HOUSEHOLD SAVED</span>
          <h2 ref={heading} tabIndex={-1} id="setup-heading">Welcome home, {values.name.trim().split(/\s+/)[0]}!</h2>
          <p>Your household preview is ready. Next, add a bill to start building your energy history.</p>
          <dl className="hs-review-list"><div><dt><House aria-hidden="true" /> Household</dt><dd>{values.name.trim()}</dd></div><div><dt><MapPin aria-hidden="true" /> Home location</dt><dd>{location}</dd></div><div><dt><Zap aria-hidden="true" /> Provider</dt><dd>{provider?.name}</dd></div></dl>
          <Link href="/bills/new" className="ui-primary"><ReceiptText size={18} aria-hidden="true" /> Add your first bill <ArrowRight size={17} aria-hidden="true" /></Link>
          <div className="hs-complete-links"><button type="button" onClick={() => { moved.current = true; setComplete(false); go(0); }}>Edit household</button><Link href="/setup">Continue home setup</Link><Link href="/dashboard">Go to dashboard</Link></div>
          <p className="hs-local-note">Saved in this browser. You can revisit setup from Account settings.</p>
        </div> : <>
          <ol className="hs-steps" aria-label="Household setup progress">{steps.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}><button type="button" disabled={index > furthest} aria-current={index === step ? "step" : undefined} onClick={() => go(index)}><span>{index < step ? <Check size={15} aria-hidden="true" /> : index + 1}</span><b>{label}</b></button></li>)}</ol>
          <div className="hs-card-heading"><span className="hs-eyebrow">STEP {step + 1} OF 3</span><h2 id="setup-heading" ref={heading} tabIndex={-1}>{["Let’s get to know your home", "Who supplies your electricity?", "Everything look right?"][step]}</h2><p>{["Enter the location of your household, even if you’re somewhere else right now.", "Check the provider name on your bill, then select it below.", "Confirm your household details before saving this preview."][step]}</p></div>
          <form onSubmit={submit} noValidate>
            {step === 0 && <div className="hs-form">
              <label htmlFor="setup-name"><span id="setup-name-label">Household name</span><input id="setup-name" aria-labelledby="setup-name-label" autoComplete="organization" maxLength={50} placeholder="e.g. Santos household" value={values.name} onChange={event => edit({ name: event.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "setup-name-error" : undefined} />{errors.name && <span className="hs-field-error" id="setup-name-error">{errors.name}</span>}</label>
              <div className="hs-location-option"><span className="hs-location-symbol"><LocateFixed aria-hidden="true" /></span><div><strong>Start with a location suggestion</strong><p>Optional. Always check that the suggestion is your home.</p></div><button ref={locationButton} type="button" disabled={locating} onClick={() => permission.current?.showModal()}>Try preview <ArrowRight size={15} aria-hidden="true" /></button></div>
              {locationMessage && <p className="hs-inline-note" role="status">{locationMessage}</p>}
              {locationState !== "idle" && <p className={`hs-inline-note ${locationState === "example" ? "is-example" : ""}`} role="status">{locationState === "example" ? "Example location filled in. No device location was requested. Edit it to match your household." : "Location permission skipped. Continue by entering your home location below."}</p>}
              <div className="hs-divider"><span>or enter your home location</span></div>
              <div className="hs-fields-row">
                <label htmlFor="setup-province">
                  <span id="setup-province-label">Province</span>
                  <input
                    id="setup-province"
                    aria-labelledby="setup-province-label"
                    list="setup-provinces"
                    autoComplete="address-level1"
                    maxLength={40}
                    placeholder="e.g. Antique"
                    value={values.province}
                    onChange={event => handleProvinceChange(event.target.value)}
                    aria-invalid={!!errors.province}
                    aria-describedby={errors.province ? "setup-province-error" : undefined}
                  />
                  {errors.province && <span className="hs-field-error" id="setup-province-error">{errors.province}</span>}
                </label>
                <label htmlFor="setup-municipality">
                  <span id="setup-municipality-label">Municipality or city</span>
                  <input
                    id="setup-municipality"
                    aria-labelledby="setup-municipality-label"
                    list="setup-municipalities"
                    autoComplete="address-level2"
                    maxLength={60}
                    placeholder={availableMunicipalities.length ? `e.g. ${availableMunicipalities[0]}` : "e.g. Hamtic, San Jose"}
                    value={values.municipality}
                    onChange={event => handleMunicipalityChange(event.target.value)}
                    aria-invalid={!!errors.municipality}
                    aria-describedby={errors.municipality ? "setup-municipality-error" : undefined}
                  />
                  {errors.municipality && <span className="hs-field-error" id="setup-municipality-error">{errors.municipality}</span>}
                </label>
              </div>
              <datalist id="setup-provinces">{PROVINCES.map(name => <option key={name} value={name} />)}</datalist>
              <datalist id="setup-municipalities">{availableMunicipalities.map(name => <option key={name} value={name} />)}</datalist>
              <label htmlFor="setup-barangay">
                <span id="setup-barangay-label">Barangay</span>
                <small>optional</small>
                <input
                  id="setup-barangay"
                  aria-labelledby="setup-barangay-label"
                  list="setup-barangays"
                  aria-describedby="setup-barangay-hint"
                  autoComplete="address-level3"
                  maxLength={60}
                  placeholder={availableBarangays.length ? `e.g. ${availableBarangays[0]}` : "e.g. Malandog, Payao"}
                  value={values.barangay}
                  onChange={event => edit({ barangay: event.target.value })}
                />
                <span id="setup-barangay-hint" className="hs-field-hint">
                  {availableBarangays.length > 0 && values.municipality ? (
                    `Select your barangay in ${values.municipality} (${availableBarangays.length} available) for specific advisory matching.`
                  ) : (
                    "A barangay helps make future advisory matching more specific."
                  )}
                </span>
              </label>
              <datalist id="setup-barangays">{availableBarangays.map(name => <option key={name} value={name} />)}</datalist>
              <button type="button" className="ui-secondary" onClick={saveProfile}>Save household profile</button>
            </div>}

            {step === 1 && <>
              <div className="hs-home-location"><MapPin aria-hidden="true" /><span>{location}</span><button type="button" onClick={() => go(0)} aria-label="Edit household location"><Pencil size={15} /></button></div>
              <div className="hs-suggestion"><Info size={18} aria-hidden="true" /><p>{suggestions.length === 1 ? <><strong>Example suggestion: {suggestions[0].name}</strong>Based on your province in this UI preview. Confirm against your electricity bill.</> : suggestions.length > 1 ? <><strong>Several providers may serve this province</strong>Province alone cannot identify your provider. Choose the name printed on your bill.</> : <><strong>No provider suggestion for this location</strong>You can still choose manually. Coverage verification will be added later.</>}</p></div>
              <fieldset className="hs-provider-options" aria-describedby="setup-provider-help"><legend className="ws-sr-only">Choose your electricity provider</legend>{previewProviders.map(item => <label key={item.id} className={`hs-provider${values.provider === item.id ? " is-selected" : ""}`}><input type="radio" name="provider" value={item.id} checked={values.provider === item.id} onChange={() => edit({ provider: item.id })} /><span className="hs-provider-icon"><Zap aria-hidden="true" /></span><span className="hs-provider-copy"><strong>{item.name}</strong><small>{item.detail}</small><em>{item.area} · preview choice</em></span><span className="hs-radio-mark" aria-hidden="true">{values.provider === item.id && <Check size={14} />}</span></label>)}</fieldset>
              <p id="setup-provider-help" className="hs-field-hint">These choices demonstrate the design. Service boundaries and provider support have not been verified.</p>
              {errors.provider && <p className="ui-error" role="alert">{errors.provider}</p>}
            </>}

            {step === 2 && <>
              <dl className="hs-review-list"><div><dt><House aria-hidden="true" /> Household</dt><dd>{values.name.trim()}<button type="button" onClick={() => go(0)} aria-label="Edit household name"><Pencil size={15} /></button></dd></div><div><dt><MapPin aria-hidden="true" /> Home location</dt><dd>{location}<button type="button" onClick={() => go(0)} aria-label="Edit home location"><Pencil size={15} /></button></dd></div><div><dt><Zap aria-hidden="true" /> Electricity provider</dt><dd>{previewProviderName(values.provider)}<button type="button" onClick={() => go(1)} aria-label="Edit electricity provider"><Pencil size={15} /></button></dd></div></dl>
              <div className="hs-suggestion is-save-note"><ShieldCheck size={19} aria-hidden="true" /><p><strong>Your preview stays on this device</strong>Saving updates the name, home location and provider used in this browser. You can change them later.</p></div>
            </>}

            {storageError && <p className="ui-error" role="alert">{storageError}</p>}
            <div className="hs-actions">{step > 0 ? <button type="button" className="hs-back" onClick={() => go(step - 1)}><ArrowLeft size={17} aria-hidden="true" /> Back</button> : <Link href="/dashboard" className="hs-back">Set up later</Link>}<button type="submit" className="ui-primary">{step === 2 ? <><Check size={17} aria-hidden="true" /> Save household</> : <>Continue <ArrowRight size={17} aria-hidden="true" /></>}</button></div>
          </form>
        </>}
      </section>
    </div>}

    <dialog ref={permission} className="hs-permission" aria-labelledby="location-permission-title" aria-describedby="location-permission-description" onClose={() => locationButton.current?.focus()} onClick={event => { if (event.target === event.currentTarget) permission.current?.close(); }}>
      <button type="button" className="hs-dialog-close" aria-label="Close location preview" onClick={() => permission.current?.close()}><X aria-hidden="true" /></button>
      <span className="hs-permission-icon"><LocateFixed aria-hidden="true" /></span><span className="hs-eyebrow">OPTIONAL LOCATION</span><h2 id="location-permission-title">Find a starting point for your home</h2><p id="location-permission-description">Use an example, or allow a one-time device location lookup. The lookup shares your approximate coordinates with OpenStreetMap to suggest a province and municipality. Check the result before saving. Your precise coordinates are not saved.</p>
      <div className="hs-permission-example"><MapPin size={18} aria-hidden="true" /><span>Payao, San Jose de Buenavista, Antique<small>Example location · confirm or edit before saving</small></span></div>
      <button type="button" className="ui-primary" disabled={offline || locating} onClick={currentLocation}>Use my current location</button><button type="button" className="hs-back" onClick={exampleLocation}>Use example location</button><button type="button" className="hs-back" onClick={() => { setLocationState("manual"); permission.current?.close(); }}>Skip permission & enter manually</button>
      <p className="hs-field-hint">Location data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. Permission is optional; manual entry always works.</p>
    </dialog>
  </PageShell>;
}

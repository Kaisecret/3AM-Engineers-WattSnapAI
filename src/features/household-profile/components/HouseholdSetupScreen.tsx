"use client";
import { isDeviceOffline } from "@/features/offline-access/connectivity";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleCheck, House, LocateFixed, MapPin, Pencil, ReceiptText, ShieldCheck, X, Zap } from "lucide-react";
import PageShell from "@/features/dashboard/components/PageShell";
import { usePreviewHousehold } from "@/features/dashboard/use-preview-household";
import { previewProviders, previewProviderName } from "../provider-preview";
import { lookupLocation } from "../location-suggestion";
import { PROVINCES, getMunicipalitiesForProvince, getBarangaysForMunicipality } from "../philippine-locations";
import "../household-setup.css";

type Draft = { name: string; province: string; municipality: string; barangay: string; provider: string; customProvider: string };
type FieldErrors = Partial<Record<keyof Draft, string>>;
const steps = ["Home", "Provider", "Review"];

export default function HouseholdSetupScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [complete, setComplete] = useState(false);
  const [offline, setOffline] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "manual">("idle");
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
    name: household.name === "Your home" ? "" : household.name,
    province: household.locality?.province ?? parts.at(-1) ?? "",
    municipality: household.locality?.municipality ?? (parts.length > 1 ? parts.at(-2)! : ""),
    barangay: household.locality?.barangay ?? (parts.length > 2 ? parts.slice(0, -2).join(", ") : ""),
    provider: household.provider?.startsWith("custom:") ? "other" : household.provider ?? "",
    customProvider: household.provider?.startsWith("custom:") ? previewProviderName(household.provider) : "",
  };
  const provider = values.provider === "other" && values.customProvider.trim() ? { id: `custom:${encodeURIComponent(values.customProvider.trim())}`, name: values.customProvider.trim() } : previewProviders.find(item => item.id === values.provider);
  const location = [values.barangay.trim(), values.municipality.trim(), values.province.trim()].filter(Boolean).join(", ");
  const providerChoices = [...previewProviders, { id: "other", name: "Other provider", detail: "Enter the utility or cooperative printed on your bill", area: "Manual entry" }];
  const availableMunicipalities = getMunicipalitiesForProvince(values.province);
  const availableBarangays = getBarangaysForMunicipality(values.province, values.municipality);

  useEffect(() => {
    const sync = () => setOffline(isDeviceOffline());
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



  function currentLocation() {
    permission.current?.close();
    if (isDeviceOffline()) { setLocationMessage("You’re offline. Enter your home location manually."); return; }
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
        setLocationMessage("Location filled in. Check that this is your home.");
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

  return <PageShell title="Household setup" active="Home" className="hs-page">
    {!ready ? <section className="ui-panel hs-loading" role="status"><span className="hs-spinner" /> Loading your saved household…</section> : <div className="hs-layout">
      <aside className="hs-story">
        <span className="hs-eyebrow"><House size={15} aria-hidden="true" /> YOUR HOME</span>
        <h2>One home for your energy.</h2>
        <p>Your location and provider help personalize bills and advisories.</p>
        <Image className="hs-mascot" src="/assets/branding/actions-3.png" alt="" width={320} height={320} sizes="(min-width: 900px) 220px, 110px" priority />
        <div className="hs-story-note"><ShieldCheck aria-hidden="true" /><span>Location access is optional.</span></div>
      </aside>

      <section className="ui-panel hs-card" aria-labelledby="setup-heading">
        {complete ? <div className="hs-complete">
          <span className="hs-complete-icon"><CircleCheck aria-hidden="true" /></span>
          <span className="hs-eyebrow">HOUSEHOLD SAVED</span>
          <h2 ref={heading} tabIndex={-1} id="setup-heading">Welcome home, {values.name.trim().split(/\s+/)[0]}!</h2>
          <p>Add a bill to get started.</p>
          <dl className="hs-review-list"><div><dt><House aria-hidden="true" /> Household</dt><dd>{values.name.trim()}</dd></div><div><dt><MapPin aria-hidden="true" /> Home location</dt><dd>{location}</dd></div><div><dt><Zap aria-hidden="true" /> Provider</dt><dd>{provider?.name}</dd></div></dl>
          <Link href="/bills/new" className="ui-primary"><ReceiptText size={18} aria-hidden="true" /> Add your first bill <ArrowRight size={17} aria-hidden="true" /></Link>
          <div className="hs-complete-links"><button type="button" onClick={() => { moved.current = true; setComplete(false); go(0); }}>Edit household</button><Link href="/setup">Continue home setup</Link><Link href="/dashboard">Go to dashboard</Link></div>
        </div> : <>
          <ol className="hs-steps" aria-label="Household setup progress">{steps.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}><button type="button" disabled={index > furthest} aria-current={index === step ? "step" : undefined} onClick={() => go(index)}><span>{index < step ? <Check size={15} aria-hidden="true" /> : index + 1}</span><b>{label}</b></button></li>)}</ol>
          <div className="hs-card-heading"><h2 id="setup-heading" ref={heading} tabIndex={-1}>{["Your home", "Electricity provider", "Review your details"][step]}</h2><p>{["Where is your household located?", "Choose the name printed on your bill.", "Check your details, then save."][step]}</p></div>
          <form onSubmit={submit} noValidate>
            {step === 0 && <div className="hs-form">
              <label htmlFor="setup-name"><span id="setup-name-label">Household name</span><input id="setup-name" aria-labelledby="setup-name-label" autoComplete="organization" maxLength={50} placeholder="e.g. Santos household" value={values.name} onChange={event => edit({ name: event.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "setup-name-error" : undefined} />{errors.name && <span className="hs-field-error" id="setup-name-error">{errors.name}</span>}</label>
              <div className="hs-location-option"><button ref={locationButton} type="button" disabled={locating} onClick={() => permission.current?.showModal()}><LocateFixed size={18} aria-hidden="true" />{locating ? "Finding location…" : "Use my location"}<span>Optional</span></button></div>
              {locationMessage && <p className="hs-inline-note" role="status">{locationMessage}</p>}
              {locationState !== "idle" && <p className="hs-inline-note" role="status">Enter your home location below.</p>}
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
                    `Choose from ${availableBarangays.length} barangays in ${values.municipality}.`
                  ) : (
                    "Helps match advisories to your area."
                  )}
                </span>
              </label>
              <datalist id="setup-barangays">{availableBarangays.map(name => <option key={name} value={name} />)}</datalist>
            </div>}

            {step === 1 && <>
              <div className="hs-home-location"><MapPin aria-hidden="true" /><span>{location}</span><button type="button" onClick={() => go(0)} aria-label="Edit household location"><Pencil size={15} /></button></div>
              <fieldset className="hs-provider-options" aria-describedby="setup-provider-help"><legend className="ws-sr-only">Choose your electricity provider</legend>{providerChoices.map(item => <label key={item.id} className={`hs-provider${values.provider === item.id ? " is-selected" : ""}`}><input type="radio" name="provider" value={item.id} checked={values.provider === item.id} onChange={() => edit({ provider: item.id })} /><span className="hs-provider-icon"><Zap aria-hidden="true" /></span><span className="hs-provider-copy"><strong>{item.name}</strong><small>{item.detail}</small><em>{item.area}</em></span><span className="hs-radio-mark" aria-hidden="true">{values.provider === item.id && <Check size={14} />}</span></label>)}</fieldset>
              {values.provider === "other" && <div className="hs-form"><label>Provider name<input maxLength={80} value={values.customProvider} onChange={event => edit({ customProvider: event.target.value })} placeholder="Name on your bill" /></label></div>}<p id="setup-provider-help" className="hs-field-hint">Not listed? Choose Other provider.</p>
              {errors.provider && <p className="ui-error" role="alert">{errors.provider}</p>}
            </>}

            {step === 2 && <>
              <dl className="hs-review-list"><div><dt><House aria-hidden="true" /> Household</dt><dd>{values.name.trim()}<button type="button" onClick={() => go(0)} aria-label="Edit household name"><Pencil size={15} /></button></dd></div><div><dt><MapPin aria-hidden="true" /> Home location</dt><dd>{location}<button type="button" onClick={() => go(0)} aria-label="Edit home location"><Pencil size={15} /></button></dd></div><div><dt><Zap aria-hidden="true" /> Electricity provider</dt><dd>{provider?.name}<button type="button" onClick={() => go(1)} aria-label="Edit electricity provider"><Pencil size={15} /></button></dd></div></dl>
              <p className="hs-save-note"><ShieldCheck size={16} aria-hidden="true" />Saved on this device. Edit anytime.</p>
            </>}

            {storageError && <p className="ui-error" role="alert">{storageError}</p>}
            <div className="hs-actions">
              {step > 0 ? (
                <button type="button" className="hs-back" onClick={() => go(step - 1)}>
                  <ArrowLeft size={17} aria-hidden="true" /> Back
                </button>
              ) : (
                <Link href="/dashboard" className="hs-back">Set up later</Link>
              )}
              <div className="hs-actions-group">
                {step === 0 && (
                  <button type="button" className="ui-secondary hs-quick-save" onClick={saveProfile}>
                    Save profile
                  </button>
                )}
                <button type="submit" className="ui-primary">
                  {step === 2 ? <><Check size={17} aria-hidden="true" /> Save household</> : <>Continue <ArrowRight size={17} aria-hidden="true" /></>}
                </button>
              </div>
            </div>
          </form>
        </>}
      </section>
    </div>}

    <dialog ref={permission} className="hs-permission" aria-labelledby="location-permission-title" aria-describedby="location-permission-description" onClose={() => locationButton.current?.focus()} onClick={event => { if (event.target === event.currentTarget) permission.current?.close(); }}>
      <button type="button" className="hs-dialog-close" aria-label="Close location options" onClick={() => permission.current?.close()}><X aria-hidden="true" /></button>
      <span className="hs-permission-icon"><LocateFixed aria-hidden="true" /></span><h2 id="location-permission-title">Use your location?</h2><p id="location-permission-description">OpenStreetMap uses your approximate location to suggest a province and city. Check the result before saving. Precise coordinates aren’t saved.</p>

      <button type="button" className="ui-primary" disabled={offline || locating} onClick={currentLocation}>Use my current location</button><button type="button" className="hs-back" onClick={() => { setLocationState("manual"); permission.current?.close(); }}>Enter manually</button>
      <p className="hs-field-hint">Location data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. Permission is optional; manual entry always works.</p>
    </dialog>
  </PageShell>;
}

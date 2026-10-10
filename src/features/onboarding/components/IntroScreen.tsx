"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { initialIntro, readIntro, saveIntro, type IntroState } from "../intro-state";
import { IntroPreview } from "./IntroPreview";
import "../onboarding.css";

const screens = [
  { title: "Smarter energy.", accent: "Easier days.", description: "Understand your electricity, manage your home, and discover simple ways to save." },
  { title: "Know your bill", accent: "at a glance.", description: "Scan your electricity bill and easily understand your consumption, due date, and amount due." },
  { title: "See where your", accent: "energy goes.", description: "Register household appliances, scan their wattage labels, and estimate electricity consumption." },
  { title: "Save smarter.", accent: "Stay informed.", description: "Discover personalized Tipid Tips and understand electricity-provider advisories that may affect your household." },
];

export default function IntroScreen() {
  const router = useRouter();
  const [state, setState] = useState(initialIntro);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const screen = screens[state.step];

  useEffect(() => {
    try { setState(readIntro()); } catch { setError("Your browser cannot remember progress. You can still continue."); }
    setReady(true);
  }, []);
  useEffect(() => { if (moved.current) heading.current?.focus(); }, [state.step]);

  function remember(next: IntroState) {
    setState(next);
    try { saveIntro(next); setError(""); return true; }
    catch { setError("Your browser could not save progress. You can continue without remembering it."); return false; }
  }
  function go(step: number) { moved.current = true; remember({ version: 1, step, status: "in-progress" }); }
  function finish(status: "completed" | "skipped", destination = "/signup") {
    remember({ ...state, status });
    router.push(destination);
  }

  return <main className={`intro-page intro-step-${state.step}`}>
    <div className="intro-shell">
      <header className="intro-header"><Link href="/" aria-label="WattSnap home"><Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={1983} height={793} sizes="180px" priority /></Link>{state.step > 0 && <button type="button" disabled={!ready} onClick={() => finish("skipped")}>Skip</button>}</header>
      <div className="intro-topline">{state.step > 0 ? <button type="button" onClick={() => go(state.step - 1)}><ArrowLeft size={18} aria-hidden="true" />Back</button> : <span>YOUR HOME ELECTRICITY ASSISTANT</span>}<span className="intro-step-label" aria-live="polite">{state.step + 1} of 4</span></div>
      <section className="intro-content" aria-labelledby="intro-heading">
        <div className="intro-copy" key={state.step}><h1 id="intro-heading" ref={heading} tabIndex={-1}>{screen.title}<br /><span>{screen.accent}</span></h1><p>{screen.description}</p></div>
        <IntroPreview step={state.step} />
      </section>
      {error && <p className="intro-storage-error" role="status">{error}</p>}
      <footer className={`intro-footer${state.step === 0 ? " is-welcome" : ""}`}>
        {state.step === 0 && <><button className="intro-primary" type="button" disabled={!ready} onClick={() => go(1)}>Get Started <ArrowRight aria-hidden="true" /></button><p>Already set up this device? <button type="button" onClick={() => finish("skipped", "/login")}>Open household</button></p></>}
        <div className="intro-controls"><button className="intro-skip" type="button" disabled={!ready} onClick={() => finish("skipped")}>{state.step === 0 ? "Skip introduction" : "Skip"}</button><nav className="intro-dots" aria-label="Onboarding progress">{screens.map((item, index) => <button key={item.title} type="button" disabled={!ready} aria-label={`Screen ${index + 1}: ${item.title} ${item.accent}`} aria-current={index === state.step ? "step" : undefined} onClick={() => go(index)}><span /></button>)}</nav>{state.step > 0 && <button className="intro-next" type="button" disabled={!ready} aria-label={state.step === 3 ? "Finish introduction and set up household" : "Next screen"} onClick={() => state.step === 3 ? finish("completed") : go(state.step + 1)}>{state.step === 3 ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}<span>{state.step === 3 ? "Finish" : "Next"}</span></button>}</div>
      </footer>
    </div>
  </main>;
}

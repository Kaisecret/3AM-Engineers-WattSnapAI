"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";

const steps = [
  { title: "Scan your electricity bill", description: "Upload a photo as a reference, then enter and confirm the printed values.", label: "Illustrative bill review", value: "180 kWh", detail: "Confirm the consumption before saving" },
  { title: "Understand your consumption", description: "Compare confirmed bills and estimate how much energy your appliances use.", label: "Illustrative appliance estimate", value: "240 kWh", detail: "1,000 W · 8 hours a day · 30 days" },
  { title: "Explore ways to save", description: "Try a Watt-If scenario and get practical, personalized Tipid Tips.", label: "Illustrative energy difference", value: "90 kWh", detail: "Reduce use from 8 to 5 hours a day" },
  { title: "Be ready for brownouts", description: "Review an advisory and keep your locally saved checklist available after the app shell is prepared online.", label: "Illustrative published schedule", value: "1–5 PM", detail: "Charge devices · Prepare lights · Save work" },
];

export function ProductTour() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!open || !playing) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 4500);
    return () => window.clearInterval(timer);
  }, [open, playing]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const current = steps[step];

  return (
    <>
      <button type="button" className="btn-secondary hero-watch" onClick={() => {
        setStep(0);
        setPlaying(true);
        setOpen(true);
        dialog.current?.showModal();
      }}>
        <span className="hero-play-icon"><Play size={17} fill="currentColor" aria-hidden="true" /></span>
        Watch Video
      </button>
      <dialog ref={dialog} className="product-tour" aria-labelledby="tour-title" onClose={() => setOpen(false)} onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}>
        <div className="product-tour-body">
          <button type="button" className="tour-close" aria-label="Close product walkthrough" onClick={() => dialog.current?.close()}><X size={23} /></button>
          <span className="tour-eyebrow">WattSnap product walkthrough</span>
          <div className="tour-preview">
            <Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="WattSnap mascot" width={180} height={180} />
            <div key={step} className="tour-example">
              <span>{current.label}</span><strong>{current.value}</strong><p>{current.detail}</p>
            </div>
          </div>
          <h2 id="tour-title">{current.title}</h2>
          <p>{current.description}</p>
          <span className="tour-demo-label">Illustrative demo · Features are in development</span>
          <div className="tour-controls">
            <button type="button" aria-label="Previous step" onClick={() => setStep((step + steps.length - 1) % steps.length)}><ChevronLeft size={22} /></button>
            <button type="button" aria-label={playing ? "Pause walkthrough" : "Play walkthrough"} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <span>Step {step + 1} of {steps.length}</span>
            <button type="button" aria-label="Next step" onClick={() => setStep((step + 1) % steps.length)}><ChevronRight size={22} /></button>
          </div>
        </div>
      </dialog>
    </>
  );
}

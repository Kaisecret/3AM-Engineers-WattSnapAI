"use client";
import { useState } from "react";
import PageShell from "./PageShell";
import { usePreviewHousehold } from "../use-preview-household";
import { ProfileAvatar } from "./DashboardArtwork";

export default function SettingsScreen() {
  const { household, update, ready, storageError } = usePreviewHousehold();
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  return <PageShell title="Account settings" subtitle="Your household profile"><section className="ui-panel ui-settings"><div className="ui-profile-summary"><span className="ws-avatar"><ProfileAvatar /></span><div><h2>{household.name}&apos;s home</h2><p>Household preview profile</p></div></div><form className="ui-form" onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get("name")).trim(); if (!name) { setError("Enter your name."); return; } if (update({ name })) { setError(""); setMessage("Profile saved."); } }}><label>Your name<input key={household.name} name="name" defaultValue={household.name} maxLength={50} required /></label><button className="ui-primary" disabled={!ready} type="submit">Save profile</button></form>{message && <p className="ui-success" role="status">{message}</p>}{(error || storageError) && <p className="ui-error" role="alert">{error || storageError}</p>}</section></PageShell>;
}

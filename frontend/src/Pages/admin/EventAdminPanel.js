import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { formatAdminDate, getApiErrorMessage, toDateTimeLocal } from "./adminHelpers";

const emptyForm = {
  name: "",
  description: "",
  date: "",
  eventEndDate: "",
  registrationStartDate: "",
  registrationEndDate: "",
  location: "",
  pointsAwarded: "",
  isActive: true,
  image: null,
};

const EventAdminPanel = () => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load events."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const updateField = (event) => {
    const { name, value, type, checked, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : type === "file" ? files?.[0] || null : value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (event) => {
    setEditingId(event._id);
    setForm({
      name: event.name || "",
      description: event.description || "",
      date: toDateTimeLocal(event.date),
      eventEndDate: toDateTimeLocal(event.eventEndDate),
      registrationStartDate: toDateTimeLocal(event.registrationStartDate),
      registrationEndDate: toDateTimeLocal(event.registrationEndDate),
      location: event.location || "",
      pointsAwarded: String(event.pointsAwarded || ""),
      isActive: event.isActive !== false,
      image: null,
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key !== "image" && value !== null && value !== undefined) body.append(key, String(value));
    });
    body.append("customRegistrationFields", "[]");
    if (form.image) body.append("image", form.image);

    try {
      const response = editingId
        ? await api.put(`/api/events/${editingId}`, body)
        : await api.post("/api/events", body);
      setNotice(`Event “${response.data?.name || form.name}” saved successfully.`);
      resetForm();
      await loadEvents();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save event."));
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Delete “${event.name}”? This also removes its registrations and adjusts awarded EXP.`)) return;
    setDeletingId(event._id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/api/events/${event._id}`);
      setNotice(`Event “${event.name}” deleted.`);
      await loadEvents();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete event."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-feature-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Event Management</h2>
          <p>Create, edit, and retire events without leaving the admin console.</p>
        </div>
        {editingId && <button className="btn btn-secondary" type="button" onClick={resetForm}>Cancel edit</button>}
      </div>

      {(error || notice) && <div className={`message ${error ? "message-error" : "message-success"}`}>{error || notice}</div>}

      <form className="admin-editor-form" onSubmit={submit}>
        <h3>{editingId ? "Edit event" : "Create event"}</h3>
        <div className="admin-form-grid">
          <label className="form-group"><span className="form-label">Name *</span><input className="form-input" name="name" value={form.name} onChange={updateField} required minLength={3} /></label>
          <label className="form-group"><span className="form-label">Location *</span><input className="form-input" name="location" value={form.location} onChange={updateField} required /></label>
          <label className="form-group"><span className="form-label">Event start *</span><input className="form-input" type="datetime-local" name="date" value={form.date} onChange={updateField} required /></label>
          <label className="form-group"><span className="form-label">Event end *</span><input className="form-input" type="datetime-local" name="eventEndDate" value={form.eventEndDate} onChange={updateField} required /></label>
          <label className="form-group"><span className="form-label">Registration opens *</span><input className="form-input" type="datetime-local" name="registrationStartDate" value={form.registrationStartDate} onChange={updateField} required /></label>
          <label className="form-group"><span className="form-label">Registration closes *</span><input className="form-input" type="datetime-local" name="registrationEndDate" value={form.registrationEndDate} onChange={updateField} required /></label>
          <label className="form-group"><span className="form-label">EXP awarded *</span><input className="form-input" type="number" min="1" name="pointsAwarded" value={form.pointsAwarded} onChange={updateField} required /></label>
          <label className="form-group"><span className="form-label">Poster (optional)</span><input className="form-input" type="file" name="image" accept="image/*" onChange={updateField} /></label>
        </div>
        <label className="form-group"><span className="form-label">Description *</span><textarea className="form-textarea" name="description" value={form.description} onChange={updateField} minLength={10} required /></label>
        <label className="form-checkbox"><input type="checkbox" name="isActive" checked={form.isActive} onChange={updateField} /> Active and visible to visitors</label>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create event"}</button>
      </form>

      <div className="admin-list-section">
        <h3>Existing events</h3>
        {loading && <p className="admin-state">Loading events…</p>}
        {!loading && !events.length && <p className="admin-state">No events found.</p>}
        {!loading && events.map((event) => (
          <article className="admin-record" key={event._id}>
            <div className="admin-record-copy">
              <h4>{event.name}</h4>
              <p>{event.location} · {formatAdminDate(event.date)} · {event.pointsAwarded} EXP</p>
              <p className="admin-muted">{event.isActive ? "Active" : "Inactive"} · {event.description}</p>
            </div>
            <div className="admin-record-actions">
              <button className="btn btn-secondary" type="button" onClick={() => startEdit(event)}>Edit</button>
              <button className="btn btn-danger" type="button" onClick={() => deleteEvent(event)} disabled={deletingId === event._id}>{deletingId === event._id ? "Deleting…" : "Delete"}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default EventAdminPanel;

// frontend/src/pages/AdminPage.js

import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";
const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState("dashboard");

  // Events state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [createEventForm, setCreateEventForm] = useState({
    eventId: "",
    name: "",
    description: "",
    date: "",
    eventEndDate: "",
    registrationStartDate: "",
    registrationEndDate: "",
    location: "",
    pointsAwarded: "",
    isActive: true,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editEventForm, setEditEventForm] = useState({});
  const [editCustomFields, setEditCustomFields] = useState([]);
  const [editSelectedImage, setEditSelectedImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [message, setMessage] = useState("");

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // EXP management state
  const [selectedUser, setSelectedUser] = useState(null);
  const [expForm, setExpForm] = useState({ amount: "", reason: "" });
  const [expSearch, setExpSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/login?unauthorized=true");
    } else if (user && user.role === "admin") {
      fetchEvents();
      fetchUsers();
    }
  }, [user, authLoading, navigate]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const { data } = await api.get("/api/events");
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      setMessage("Failed to load events.");
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/api/user");
      console.log("Fetched users:", data); // Debug
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      console.error("Error response:", error.response); // Debug
      setMessage("Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    totalEvents: events.length,
    activeEvents: events.filter(e => e.isActive).length,
    upcomingEvents: events.filter(e => new Date(e.date) > new Date()).length,
    pastEvents: events.filter(e => new Date(e.eventEndDate) < new Date()).length,
    totalUsers: users.length,
  };

  // Event handlers
  const handleCreateEventChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCreateEventForm({
      ...createEventForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("eventId", createEventForm.eventId.trim() || "");
      formData.append("name", createEventForm.name);
      formData.append("description", createEventForm.description);
      formData.append("date", createEventForm.date);
      formData.append("eventEndDate", createEventForm.eventEndDate);
      formData.append("registrationStartDate", createEventForm.registrationStartDate);
      formData.append("registrationEndDate", createEventForm.registrationEndDate);
      formData.append("location", createEventForm.location);
      formData.append("pointsAwarded", parseInt(createEventForm.pointsAwarded, 10));
      formData.append("isActive", createEventForm.isActive);
      formData.append("customRegistrationFields", JSON.stringify(customFields));
      
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const { data } = await api.post("/api/events", formData);

      setMessage(`✅ Event "${data.name}" created successfully!`);
      setCreateEventForm({
        eventId: "",
        name: "",
        description: "",
        date: "",
        eventEndDate: "",
        registrationStartDate: "",
        registrationEndDate: "",
        location: "",
        pointsAwarded: "",
        isActive: true,
      });
      setCustomFields([]);
      setSelectedImage(null);
      setImagePreview("");
      setShowCreateEventForm(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error.response?.data?.message || error.message);
      setMessage(`❌ Error creating event: ${error.response?.data?.message || "Server error"}`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await api.delete(`/api/events/${eventId}`);
        setMessage("✅ Event deleted successfully!");
        fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error.response?.data?.message || error.message);
        setMessage(`❌ Error deleting event: ${error.response?.data?.message || "Server error"}`);
      }
    }
  };

  const handleUpdateEvent = (event) => {
    setEditingEvent(event);
    setEditEventForm({
      eventId: event.eventId || "",
      name: event.name,
      description: event.description,
      date: new Date(event.date).toISOString().slice(0, 16),
      eventEndDate: new Date(event.eventEndDate).toISOString().slice(0, 16),
      registrationStartDate: new Date(event.registrationStartDate).toISOString().slice(0, 16),
      registrationEndDate: new Date(event.registrationEndDate).toISOString().slice(0, 16),
      location: event.location,
      pointsAwarded: event.pointsAwarded,
      isActive: event.isActive,
      imageUrl: event.imageUrl || "",
    });
    setEditCustomFields(event.customRegistrationFields || []);
    setEditImagePreview(event.imageUrl || "");
    setEditSelectedImage(null);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditEventSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("eventId", editEventForm.eventId || "");
      formData.append("name", editEventForm.name);
      formData.append("description", editEventForm.description);
      formData.append("date", editEventForm.date);
      formData.append("eventEndDate", editEventForm.eventEndDate);
      formData.append("registrationStartDate", editEventForm.registrationStartDate);
      formData.append("registrationEndDate", editEventForm.registrationEndDate);
      formData.append("location", editEventForm.location);
      formData.append("pointsAwarded", parseInt(editEventForm.pointsAwarded, 10));
      formData.append("isActive", editEventForm.isActive);
      formData.append("customRegistrationFields", JSON.stringify(editCustomFields));
      
      if (editSelectedImage) {
        formData.append("image", editSelectedImage);
      }

      const { data } = await api.put(`/api/events/${editingEvent._id}`,formData);
      setMessage(`✅ Event "${data.name}" updated successfully!`);
      setEditingEvent(null);
      setEditEventForm({});
      setEditCustomFields([]);
      setEditSelectedImage(null);
      setEditImagePreview("");
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error.response?.data?.message || error.message);
      setMessage(`❌ Error updating event: ${error.response?.data?.message || "Server error"}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    setEditEventForm({});
    setEditCustomFields([]);
    setEditSelectedImage(null);
    setEditImagePreview("");
    setMessage("");
  };

  // EXP Management handlers
  const handleAwardEXP = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setMessage("❌ Please select a user first");
      return;
    }
    try {
      await api.post(`/api/users/${selectedUser._id}/exp`, {
        exp: parseInt(expForm.amount, 10),
        reason: expForm.reason,
      });
      setMessage(`✅ Awarded ${expForm.amount} EXP to ${selectedUser.username}`);
      setExpForm({ amount: "", reason: "" });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error awarding EXP:", error);
      setMessage(`❌ Error awarding EXP: ${error.response?.data?.message || "Server error"}`);
    }
  };

  const handleRemoveEXP = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setMessage("❌ Please select a user first");
      return;
    }
    try {
      await api.post(`/api/users/${selectedUser._id}/exp`, {
        exp: -parseInt(expForm.amount, 10),
        reason: expForm.reason,
      });
      setMessage(`✅ Removed ${expForm.amount} EXP from ${selectedUser.username}`);
      setExpForm({ amount: "", reason: "" });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error removing EXP:", error);
      setMessage(`❌ Error removing EXP: ${error.response?.data?.message || "Server error"}`);
    }
  };


  // Loading and auth checks
  if (authLoading) {
    return <div className="admin-dashboard">Loading admin dashboard...</div>;
  }

  if (!user || user.role !== "admin") {
    return <div className="admin-dashboard">Access Denied. You are not an administrator.</div>;
  }

  // Render functions
  const renderDashboard = () => (
    <div>
      <div className="bento-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">📊</span>
            <span className="stat-label">Total Events</span>
          </div>
          <div className="stat-value">{stats.totalEvents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">✅</span>
            <span className="stat-label">Active Events</span>
          </div>
          <div className="stat-value">{stats.activeEvents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">📅</span>
            <span className="stat-label">Upcoming Events</span>
          </div>
          <div className="stat-value">{stats.upcomingEvents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">👥</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
      </div>

      <div className="content-card">
        <h2>🚀 Quick Actions</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => setActiveTab("events")}>
            Create Event
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab("users")}>
            Manage Users
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab("exp")}>
            Award EXP
          </button>
        </div>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div>
      <div className="bento-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">📊</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-value">{stats.totalEvents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">✅</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-value">{stats.activeEvents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">📅</span>
            <span className="stat-label">Upcoming</span>
          </div>
          <div className="stat-value">{stats.upcomingEvents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-icon">🕒</span>
            <span className="stat-label">Past</span>
          </div>
          <div className="stat-value">{stats.pastEvents}</div>
        </div>
      </div>

      <div className="content-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2>📋 Event Management</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateEventForm(!showCreateEventForm)}
          >
            {showCreateEventForm ? "Cancel" : "➕ Create Event"}
          </button>
        </div>

        {showCreateEventForm && (
          <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "12px" }}>
            <h3 style={{ color: "#fff", marginBottom: "1rem" }}>Create New Event</h3>
            <form onSubmit={handleCreateEventSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Event Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={createEventForm.name}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Event ID (optional)</label>
                  <input
                    type="text"
                    name="eventId"
                    value={createEventForm.eventId}
                    onChange={handleCreateEventChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={createEventForm.location}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Points Awarded *</label>
                  <input
                    type="number"
                    name="pointsAwarded"
                    value={createEventForm.pointsAwarded}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="datetime-local"
                    name="date"
                    value={createEventForm.date}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="datetime-local"
                    name="eventEndDate"
                    value={createEventForm.eventEndDate}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Registration Start *</label>
                  <input
                    type="datetime-local"
                    name="registrationStartDate"
                    value={createEventForm.registrationStartDate}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Registration End *</label>
                  <input
                    type="datetime-local"
                    name="registrationEndDate"
                    value={createEventForm.registrationEndDate}
                    onChange={handleCreateEventChange}
                    className="form-input"
                    required
                  />
                </div>

              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={createEventForm.description}
                  onChange={handleCreateEventChange}
                  className="form-textarea"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Image</label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="form-input"
                  style={{ padding: "0.5rem" }}
                />

                {imagePreview && (
                  <div style={{ marginTop: "1rem" }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: "300px", 
                        maxHeight: "200px", 
                        borderRadius: "8px",
                        objectFit: "cover"
                      }} 
                    />
                  </div>
                )}
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={createEventForm.isActive}
                  onChange={handleCreateEventChange}
                />
                <label className="form-label" style={{ marginBottom: 0 }}>Active Event</label>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="submit" className="btn btn-primary">Create Event</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateEventForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {eventsLoading ? (
          <p style={{ color: "#999", textAlign: "center" }}>Loading events...</p>
        ) : (
          <div className="event-list">
            {events.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center" }}>No events found. Create your first event!</p>
            ) : (
              events.map((event) => (
                editingEvent && editingEvent._id === event._id ? (
                  <div key={event._id} style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "12px" }}>
                    <h3 style={{ color: "#fff", marginBottom: "1rem" }}>Edit Event</h3>
                    <form onSubmit={handleEditEventSubmit}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                        <div className="form-group">
                          <label className="form-label">Event Name *</label>
                          <input
                            type="text"
                            name="name"
                            value={editEventForm.name}
                            onChange={(e) => setEditEventForm({ ...editEventForm, name: e.target.value })}
                            className="form-input"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Location *</label>
                          <input
                            type="text"
                            name="location"
                            value={editEventForm.location}
                            onChange={(e) => setEditEventForm({ ...editEventForm, location: e.target.value })}
                            className="form-input"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Points *</label>
                          <input
                            type="number"
                            name="pointsAwarded"
                            value={editEventForm.pointsAwarded}
                            onChange={(e) => setEditEventForm({ ...editEventForm, pointsAwarded: e.target.value })}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description *</label>
                        <textarea
                          name="description"
                          value={editEventForm.description}
                          onChange={(e) => setEditEventForm({ ...editEventForm, description: e.target.value })}
                          className="form-textarea"
                          rows="4"
                          required
                        />
                      </div>

                      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                        <button type="submit" className="btn btn-success">Save Changes</button>
                        <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div key={event._id} className="event-item">
                    <div className="event-info">
                      <h3>{event.name}</h3>
                      <p>📍 {event.location}</p>
                      <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                      <p>⭐ {event.pointsAwarded} EXP</p>
                      <p>{event.isActive ? "✅ Active" : "⏸️ Inactive"}</p>
                    </div>
                    <div className="event-actions">
                      <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={() => handleUpdateEvent(event)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" style={{ padding: "0.5rem 1rem" }} onClick={() => handleDeleteEvent(event._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderUsers = () => {
    const filteredUsers = users.filter(u =>
      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
      <div>
        <div className="content-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2>👥 User Management</h2>
            <div className="form-group" style={{ marginBottom: 0, minWidth: "300px" }}>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {usersLoading ? (
            <p style={{ color: "#999", textAlign: "center" }}>Loading users...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {filteredUsers.length === 0 ? (
                <p style={{ color: "#999", textAlign: "center" }}>No users found.</p>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user._id} className="user-card">
                    <div className="user-header">
                      <div className="user-avatar">
                        {user.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="user-details">
                        <h4>{user.username || "Unknown User"}</h4>
                        <p>{user.email}</p>
                      </div>
                    </div>
                    <div className="user-stats">
                      <div className="user-stat">
                        <span className="user-stat-label">Level</span>
                        <span className="user-stat-value">{user.level || 1}</span>
                      </div>
                      <div className="user-stat">
                        <span className="user-stat-label">EXP</span>
                        <span className="user-stat-value">{user.exp || 0}</span>
                      </div>
                      <div className="user-stat">
                        <span className="user-stat-label">Rank</span>
                        <span className="user-stat-value">{user.rank || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderEXP = () => {
    const filteredUsers = users.filter(u =>
      u.username?.toLowerCase().includes(expSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(expSearch.toLowerCase())
    );

    return (
      <div>
        <div className="content-card">
          <h2>⭐ EXP Management</h2>

          <div className="form-group">
            <label className="form-label">Search User</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={expSearch}
              onChange={(e) => setExpSearch(e.target.value)}
              className="form-input"
            />
          </div>

          {expSearch && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
              {filteredUsers.slice(0, 5).map((user) => (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    padding: "1rem",
                    background: selectedUser?._id === user._id ? "rgba(255, 206, 0, 0.1)" : "rgba(255, 255, 255, 0.05)",
                    border: selectedUser?._id === user._id ? "2px solid #ffce00" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="user-avatar" style={{ width: "40px", height: "40px", fontSize: "1rem" }}>
                      {user.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <h4 style={{ color: "#fff", margin: 0, fontSize: "0.95rem" }}>{user.username}</h4>
                      <p style={{ color: "#999", margin: 0, fontSize: "0.8rem" }}>{user.exp || 0} EXP · Lvl {user.level || 1}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(255, 206, 0, 0.05)", borderRadius: "12px", border: "1px solid rgba(255, 206, 0, 0.2)" }}>
              <h3 style={{ color: "#fff", marginBottom: "1rem" }}>
                Manage EXP for {selectedUser.username}
              </h3>
              <p style={{ color: "#999", marginBottom: "1.5rem" }}>
                Current EXP: <span style={{ color: "#ffce00", fontWeight: "700" }}>{selectedUser.exp || 0}</span> · Level: <span style={{ color: "#ffce00", fontWeight: "700" }}>{selectedUser.level || 1}</span>
              </p>

              <form>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    value={expForm.amount}
                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                    className="form-input"
                    placeholder="Enter EXP amount..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea
                    value={expForm.reason}
                    onChange={(e) => setExpForm({ ...expForm, reason: e.target.value })}
                    className="form-textarea"
                    rows="3"
                    placeholder="Reason for EXP change..."
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button type="button" onClick={handleAwardEXP} className="btn btn-success">
                    ➕ Award EXP
                  </button>
                  <button type="button" onClick={handleRemoveEXP} className="btn btn-danger">
                    ➖ Remove EXP
                  </button>
                  <button type="button" onClick={() => { setSelectedUser(null); setExpForm({ amount: "", reason: "" }); }} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <>
      <div className="admin-dashboard">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Manage events, users, and more</p>
        </div>

        {message && (
          <div className={`message ${message.includes("✅") ? "message-success" : "message-error"}`}>
            {message}
          </div>
        )}

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            className={`admin-tab ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            📋 Events
          </button>
          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </button>
          <button
            className={`admin-tab ${activeTab === "exp" ? "active" : ""}`}
            onClick={() => setActiveTab("exp")}
          >
            ⭐ EXP
          </button>
        </div>

        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "events" && renderEvents()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "exp" && renderEXP()}
      </div>
    </>
  );
};

export default AdminPage;

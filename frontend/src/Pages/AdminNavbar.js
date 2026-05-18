import React, { useState } from "react";
import "./AdminNavbar.css";

const AdminNavbar = () => {
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <div className="admin-navbar">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <button
          className={`admin-nav-btn ${
            activeTab === "calendar" ? "active" : ""
          }`}
          onClick={() => setActiveTab("calendar")}
          style={{ marginLeft: "2rem", marginRight: "2rem" }}
        >
          Event Calendar
        </button>
        <button
          className={`admin-nav-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
          style={{ marginLeft: "2rem", marginRight: "2rem" }}
        >
          User Details
        </button>
        <button
          className={`admin-nav-btn ${
            activeTab === "participation" ? "active" : ""
          }`}
          onClick={() => setActiveTab("participation")}
          style={{ marginLeft: "2rem", marginRight: "2rem" }}
        >
          Participation Details
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "calendar" && <EventCalendar />}
        {activeTab === "users" && <UserDetails />}
        {activeTab === "participation" && <ParticipationDetails />}
      </div>
    </div>
  );
};

const EventCalendar = () => {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
  });

  const handleAddEvent = () => {
    setEvents([...events, newEvent]);
    setNewEvent({ title: "", date: "", time: "", location: "" });
  };

  return (
    <div
      className="admin-section"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <h2>Event Calendar</h2>
      <div className="event-form">
        <input
          type="text"
          placeholder="Event Title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <input
          type="date"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
        />
        <input
          type="time"
          value={newEvent.time}
          onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
        />
        <input
          type="text"
          placeholder="Location"
          value={newEvent.location}
          onChange={(e) =>
            setNewEvent({ ...newEvent, location: e.target.value })
          }
        />
        <button onClick={handleAddEvent}>Add Event</button>
      </div>
      <div className="events-list">
        {events.map((event, index) => (
          <div key={index} className="event-item" style={{ display: "flex" }}>
            <h3 style={{ marginLeft: "2rem", marginRight: "2rem" }}>
              {event.title}
            </h3>
            <p style={{ marginLeft: "2rem", marginRight: "2rem" }}>
              Date: {event.date}
            </p>
            <p style={{ marginLeft: "2rem", marginRight: "2rem" }}>
              Time: {event.time}
            </p>
            <p style={{ marginLeft: "2rem", marginRight: "2rem" }}>
              Location: {event.location}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserDetails = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Doe",
      username: "johndoe",
      age: 22,
      email: "john@example.com",
      phone: "1234567890",
      college: "ABC College",
    },
    // Add more sample users as needed
  ]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-section">
      <h2>User Details</h2>
      <input
        type="text"
        placeholder="Search by name or username"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar"
      />
      <table className="users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Username</th>
            <th>Age</th>
            <th>Email</th>
            <th>Phone</th>
            <th>College</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{user.name}</td>
              <td>{user.username}</td>
              <td>{user.age}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>{user.college}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ParticipationDetails = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [participations, setParticipations] = useState([
    {
      id: 1,
      name: "John Doe",
      enrollmentNo: "EN001",
      branch: "CSE",
      year: "3rd",
      exp: 50,
      events: "Hackathon, Coding Competition",
      eventType: "Hackathon",
      level: 10,
    },
    {
      id: 2,
      name: "Jane Smith",
      enrollmentNo: "EN002",
      branch: "ECE",
      year: "2nd",
      exp: 75,
      events: "UI/UX Workshop, Design Challenge",
      eventType: "Designathon",
      level: 12,
    },
    {
      id: 3,
      name: "Mike Johnson",
      enrollmentNo: "EN003",
      branch: "CSE",
      year: "4th",
      exp: 100,
      events: "Gaming Championship",
      eventType: "Game Tournament",
      level: 15,
    },
    {
      id: 4,
      name: "Sarah Wilson",
      enrollmentNo: "EN004",
      branch: "IT",
      year: "3rd",
      exp: 85,
      events: "Game Development Marathon, Unity Workshop",
      eventType: "Gameathon",
      level: 13,
    },
    {
      id: 5,
      name: "Alex Chen",
      enrollmentNo: "EN005",
      branch: "CSE",
      year: "2nd",
      exp: 90,
      events: "48-Hour Game Jam, Indie Game Challenge",
      eventType: "Gameathon",
      level: 14,
    },
    {
      id: 6,
      name: "Emily Davis",
      enrollmentNo: "EN006",
      branch: "ECE",
      year: "4th",
      exp: 60,
      events: "AI in Tech Talk, Machine Learning Seminar",
      eventType: "Speaker Session",
      level: 11,
    },
    {
      id: 7,
      name: "David Kumar",
      enrollmentNo: "EN007",
      branch: "IT",
      year: "3rd",
      exp: 70,
      events: "Startup Founder Talk, Entrepreneurship Session",
      eventType: "Speaker Session",
      level: 12,
    },
    {
      id: 8,
      name: "Akp",
      enrollmentNo: "EN004",
      branch: "IT",
      year: "3rd",
      exp: 75,
      events: "Game Development Marathon, Unity Workshop",
      eventType: "Game Tournament",
      level: 13,
    },
  ]);

  const eventTypes = ["Hackathon", "Designathon", "Gameathon", "Game Tournament", "Speaker Session"];

  const handleEventTypeChange = (eventType) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventType)
        ? prev.filter(type => type !== eventType)
        : [...prev, eventType]
    );
  };

  const filteredParticipations = participations.filter((participation) => {
    const matchesSearch = 
      participation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participation.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participation.events.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedEventTypes.length === 0 || 
      selectedEventTypes.includes(participation.eventType);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="admin-section">
      <h2>Participation Details</h2>
      
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name, enrollment no., or event name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar"
      />

      {/* Event Type Filters */}
      <div className="filter-section" style={{ marginBottom: "20px", marginTop: "15px" }}>
        <h4 style={{ marginBottom: "10px", color: "#d4a017" }}>Filter by Event Type:</h4>
        <div className="filter-checkboxes" style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          {eventTypes.map((eventType) => (
            <label key={eventType} className="filter-checkbox" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="checkbox"
                checked={selectedEventTypes.includes(eventType)}
                onChange={() => handleEventTypeChange(eventType)}
                style={{ accentColor: "#d4a017" }}
              />
              <span style={{ color: "#f0e6d2", fontSize: "14px" }}>{eventType}</span>
            </label>
          ))}
        </div>
        {selectedEventTypes.length > 0 && (
          <button
            onClick={() => setSelectedEventTypes([])}
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              backgroundColor: "#d93a3a",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: "15px", color: "#d4a017", fontSize: "14px" }}>
        Showing {filteredParticipations.length} of {participations.length} participants
      </div>

      <table className="participations-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Enrollment No.</th>
            <th>Branch</th>
            <th>Year</th>
            <th>Event Type</th>
            <th>Exp</th>
            <th>Events</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {filteredParticipations.length > 0 ? (
            filteredParticipations.map((participation, index) => (
              <tr key={participation.id}>
                <td>{index + 1}</td>
                <td>{participation.name}</td>
                <td>{participation.enrollmentNo}</td>
                <td>{participation.branch}</td>
                <td>{participation.year}</td>
                <td>
                  <span style={{ 
                    backgroundColor: "#d4a017", 
                    color: "#2a2518", 
                    padding: "2px 6px", 
                    borderRadius: "4px", 
                    fontSize: "12px" 
                  }}>
                    {participation.eventType}
                  </span>
                </td>
                <td>{participation.exp}</td>
                <td>{participation.events}</td>
                <td>{participation.level}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" style={{ textAlign: "center", color: "#d4a017", fontStyle: "italic" }}>
                No participants found matching your criteria
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminNavbar;

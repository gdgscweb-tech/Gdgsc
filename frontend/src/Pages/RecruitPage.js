// frontend/src/Pages/RecruitPage.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './RecruitPage.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const USS_OPTIONS = ['USAR', 'USDI', 'USAP', 'USMC'];

const YEAR_OPTIONS = [
  '2026-2030',
  '2025-2029',
  '2024-2028',
  '2023-2027',
  'Other',
];

const TEAM_OPTIONS = [
  'Unreal (Game Development)',
  'Blender (Game Design)',
  'Prototype (Graphic Design, UI/UX)',
  'Scratch (Web Development)',
  'Overwatch (Event Management)',
  'Outreach (PR and Media)',
  'Catalyst (Research & Development)',
  'Theft (sponsorship)',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const emptyForm = {
  email: '',
  fullName: '',
  enrollmentNumber: '',
  contactNumber: '',
  uss: '',
  year: '',
  yearOther: '',
  teams: [],
  motivation: '',
  experience: '',
  portfolioOrSocials: '',
};

/**
 * Normalise a legacy team value into a clean string array.
 * Handles: undefined, null, '', 'single string', ['array', 'of', 'strings']
 */
const normaliseTeams = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const StatusBadge = ({ status }) => (
  <span className={`status-badge ${status}`}>{status}</span>
);

const Req = () => <span className="required-star">*</span>;

// ---------------------------------------------------------------------------
// Custom Multi-Select component — dark/yellow GDGSC theme
// ---------------------------------------------------------------------------
const MultiSelect = ({ options, value = [], onChange, placeholder = 'Select teams…', error }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (option) => {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(next);
  };

  const remove = (e, option) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== option));
  };

  const triggerLabel =
    value.length === 0
      ? null
      : value.length === 1
      ? value[0]
      : `${value.length} teams selected`;

  return (
    <div className="multi-select-wrapper" ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        className={`multi-select-trigger${open ? ' open' : ''}${error ? ' has-error' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {triggerLabel ? (
          triggerLabel
        ) : (
          <span className="multi-select-placeholder">{placeholder}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="multi-select-dropdown" role="listbox" aria-multiselectable="true">
          {options.map((option) => {
            const checked = value.includes(option);
            return (
              <label
                key={option}
                className={`multi-select-option${checked ? ' selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option)}
                  aria-selected={checked}
                />
                {option}
              </label>
            );
          })}
        </div>
      )}

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="multi-select-chips">
          {value.map((option) => (
            <span key={option} className="multi-select-chip">
              {option}
              <button
                type="button"
                className="multi-select-chip-remove"
                onClick={(e) => remove(e, option)}
                aria-label={`Remove ${option}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Existing application read-only view
// ---------------------------------------------------------------------------
const ApplicationView = ({ application, onEdit }) => {
  const teams = normaliseTeams(application.teams);

  const rows = [
    ['Email', application.email],
    ['Full Name', application.fullName],
    ['Enrollment Number', application.enrollmentNumber],
    ['Contact Number', application.contactNumber],
    ['USS', application.uss],
    ['Year', application.year === 'Other' ? application.yearOther || 'Other' : application.year],
    ['Team(s)', teams.length > 0 ? teams.join(', ') : '—'],
    ['Why do you want to join GDGSC?', application.motivation],
    ['Prior Experience / Skills', application.experience],
    ['Portfolio / GitHub / Socials', application.portfolioOrSocials || '—'],
    ['Submitted At', application.createdAt ? new Date(application.createdAt).toLocaleString() : '—'],
  ];

  return (
    <div className="recruit-view-card">
      <h2>
        Your Application{' '}
        <StatusBadge status={application.status} />
      </h2>

      {application.status === 'pending' && (
        <div className="recruit-alert success" style={{ marginBottom: '1.5rem' }}>
          ✅ Your application has been received. You can edit it while it is still <strong>pending</strong>.
        </div>
      )}
      {application.status === 'shortlisted' && (
        <div className="recruit-alert success">
          🎉 Congratulations! You have been <strong>shortlisted</strong>. Watch out for further communications.
        </div>
      )}
      {application.status === 'selected' && (
        <div className="recruit-alert success">
          🏆 You have been <strong>selected</strong> for GDGSC! Welcome aboard.
        </div>
      )}
      {application.status === 'rejected' && (
        <div className="recruit-alert error">
          Thank you for applying. Unfortunately your application was not moved forward this time.
        </div>
      )}

      <table className="recruit-view-table">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {application.status === 'pending' && (
        <button className="btn btn-secondary" onClick={onEdit}>
          ✏️ Edit Application
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main recruitment form
// ---------------------------------------------------------------------------
const RecruitmentForm = ({ initialValues, onSuccess, isEditing, eventId }) => {
  const [form, setForm] = useState({ ...emptyForm, ...initialValues });
  const [teamsError, setTeamsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeamsChange = (newTeams) => {
    setForm((prev) => ({ ...prev, teams: newTeams }));
    if (newTeams.length > 0) setTeamsError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTeamsError('');

    // Client-side teams guard
    if (!form.teams || form.teams.length === 0) {
      setTeamsError('Please select at least one team.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        const { data } = await api.put('/api/recruitments/me', form);
        onSuccess(data.application);
      } else {
        const { data } = await api.post('/api/recruitments', { ...form, eventId });
        onSuccess(data.application);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="recruit-form-container">
      <h2>{isEditing ? '✏️ Edit Your Application' : '📋 GDGSC Recruitment Interview Form'}</h2>

      {error && <div className="recruit-alert error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="recruit-form-grid">

          {/* Section: Personal Info */}
          <div className="recruit-section-title">Personal Information</div>

          <div className="recruit-field recruit-form-full">
            <label>Email <Req /></label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="recruit-field">
            <label>Full Name <Req /></label>
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              placeholder="As per college records"
            />
          </div>

          <div className="recruit-field">
            <label>Enrollment Number / Application No. <Req /></label>
            <input
              type="text"
              name="enrollmentNumber"
              value={form.enrollmentNumber}
              onChange={handleChange}
              required
              placeholder="e.g. 04820202922"
            />
          </div>

          <div className="recruit-field">
            <label>Contact Number <Req /></label>
            <input
              type="tel"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              required
              placeholder="10-digit mobile number"
            />
          </div>

          {/* Section: Academic */}
          <div className="recruit-section-title">Academic Details</div>

          <div className="recruit-field">
            <label>USS (University School / Campus) <Req /></label>
            <select name="uss" value={form.uss} onChange={handleChange} required>
              <option value="">— Select USS —</option>
              {USS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="recruit-field">
            <label>Batch Year <Req /></label>
            <select name="year" value={form.year} onChange={handleChange} required>
              <option value="">— Select your batch —</option>
              {YEAR_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {form.year === 'Other' && (
            <div className="recruit-field recruit-form-full">
              <label>Please specify your batch year <Req /></label>
              <input
                type="text"
                name="yearOther"
                value={form.yearOther}
                onChange={handleChange}
                required
                placeholder="e.g. 2021-2025"
              />
            </div>
          )}

          {/* Section: Team (multi-select) */}
          <div className="recruit-section-title">Team Selection</div>

          <div className="recruit-field recruit-form-full">
            <label>Which team(s) are you applying for? <Req /></label>
            <MultiSelect
              options={TEAM_OPTIONS}
              value={form.teams}
              onChange={handleTeamsChange}
              placeholder="— Select one or more teams —"
              error={!!teamsError}
            />
            {teamsError && (
              <span className="field-hint" style={{ color: '#ff7b7b' }}>{teamsError}</span>
            )}
            <span className="field-hint">You may apply to multiple teams</span>
          </div>

          {/* Section: Questions */}
          <div className="recruit-section-title">Application Questions</div>

          <div className="recruit-field recruit-form-full">
            <label>Why do you want to join GDGSC? <Req /></label>
            <textarea
              name="motivation"
              value={form.motivation}
              onChange={handleChange}
              required
              placeholder="Tell us about your motivation to join GDGSC and what you hope to contribute..."
              rows={5}
            />
          </div>

          <div className="recruit-field recruit-form-full">
            <label>Prior Experience / Skills <Req /></label>
            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              required
              placeholder="Describe your relevant skills, prior projects, or experience..."
              rows={5}
            />
          </div>

          {/* Section: Portfolio */}
          <div className="recruit-section-title">Portfolio (Optional)</div>

          <div className="recruit-field recruit-form-full">
            <label>Portfolio / GitHub / Socials</label>
            <input
              type="text"
              name="portfolioOrSocials"
              value={form.portfolioOrSocials}
              onChange={handleChange}
              placeholder="https://github.com/yourprofile or behance, linkedin, etc."
            />
            <span className="field-hint">Optional — share any relevant links</span>
          </div>

        </div>{/* end grid */}

        <div className="recruit-submit-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? isEditing ? 'Saving…' : 'Submitting…'
              : isEditing ? '💾 Save Changes' : '🚀 Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------
const RecruitPage = () => {
  const { user, loading: authLoading } = useAuth();

  // Recruitment event config — fetched from backend, no env var needed
  const [eventConfig, setEventConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  const [loadingApp, setLoadingApp] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch event config on mount — public endpoint, no auth needed
  useEffect(() => {
    const fetchConfig = async () => {
      setConfigLoading(true);
      try {
        const { data } = await api.get('/api/recruitments/config');
        setEventConfig(data);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          'Could not load recruitment event. Please try again later.';
        setConfigError(msg);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const fetchExistingApp = useCallback(async () => {
    setLoadingApp(true);
    try {
      const { data } = await api.get('/api/recruitments/me');
      setExistingApp(data);
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error('Error fetching recruitment application:', err);
      }
      setExistingApp(null);
    } finally {
      setLoadingApp(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchExistingApp();
    }
  }, [user, fetchExistingApp]);

  const handleSuccess = (application) => {
    setExistingApp(application);
    setIsEditing(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prefill form from user profile (new application)
  const getProfilePrefill = () => {
    if (!user) return {};
    return {
      email: user.email || '',
      fullName: user.name || user.username || '',
      enrollmentNumber: user.enrollmentNumber || '',
      contactNumber: user.phoneNumber || '',
      teams: [],
      portfolioOrSocials: '',
    };
  };

  // Prefill for edit: use snapshotted application data, normalise teams
  const getEditPrefill = () => {
    if (!existingApp) return {};
    return {
      email: existingApp.email || '',
      fullName: existingApp.fullName || '',
      enrollmentNumber: existingApp.enrollmentNumber || '',
      contactNumber: existingApp.contactNumber || '',
      uss: existingApp.uss || '',
      year: existingApp.year || '',
      yearOther: existingApp.yearOther || '',
      // normalise in case a legacy single-string value slipped through
      teams: normaliseTeams(existingApp.teams),
      motivation: existingApp.motivation || '',
      experience: existingApp.experience || '',
      portfolioOrSocials: existingApp.portfolioOrSocials || '',
    };
  };

  const eventTitle = eventConfig?.name || 'GDGSC Recruitments 2026';

  return (
    <div className="recruit-page">
      <div className="recruit-hero">
        <h1>{eventTitle}</h1>
        <p>
          Join GDGSC and be part of a community that builds, designs, grows, and innovates.
          Select your team(s) and submit your application below.
        </p>
      </div>

      {configLoading && (
        <div className="recruit-loading">Loading recruitment details…</div>
      )}

      {!configLoading && configError && (
        <div className="recruit-alert error" style={{ maxWidth: 640, margin: '2rem auto' }}>
          ⚠️ {configError}
        </div>
      )}

      {!configLoading && eventConfig && (
        <>
          {!eventConfig.isActive && (
            <div className="recruit-alert error" style={{ maxWidth: 640, margin: '0 auto 2rem' }}>
              🔒 Recruitment applications are currently closed.
            </div>
          )}

          {authLoading && <div className="recruit-loading">Loading…</div>}

          {!authLoading && !user && (
            <div className="recruit-login-prompt">
              <h2>🔐 Login Required</h2>
              <p>You need to be logged in to apply for {eventTitle}.</p>
              <Link to="/login" className="btn btn-primary">
                Log In to Apply
              </Link>
            </div>
          )}

          {!authLoading && user && loadingApp && (
            <div className="recruit-loading">Loading your application…</div>
          )}

          {!authLoading && user && !loadingApp && (
            <>
              {submitted && !isEditing && (
                <div className="recruit-alert success" style={{ maxWidth: 780, margin: '0 auto 1.5rem' }}>
                  ✅ Your application has been saved successfully!
                </div>
              )}

              {existingApp && !isEditing ? (
                <ApplicationView
                  application={existingApp}
                  onEdit={() => { setIsEditing(true); setSubmitted(false); }}
                />
              ) : eventConfig.isActive ? (
                <RecruitmentForm
                  key={isEditing ? 'edit' : 'new'}
                  initialValues={isEditing ? getEditPrefill() : getProfilePrefill()}
                  onSuccess={handleSuccess}
                  isEditing={isEditing}
                  eventId={eventConfig.eventId}
                />
              ) : null}

              {isEditing && (
                <div style={{ maxWidth: 780, margin: '1rem auto 0', textAlign: 'right' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setIsEditing(false); setSubmitted(false); }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RecruitPage;

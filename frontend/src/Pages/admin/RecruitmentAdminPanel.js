// frontend/src/Pages/admin/RecruitmentAdminPanel.js

import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { formatAdminDate, getApiErrorMessage } from './adminHelpers';

const STATUS_OPTIONS = ['pending', 'shortlisted', 'rejected', 'selected'];

const STATUS_COLORS = {
  pending:     { bg: 'rgba(255,206,0,0.12)',     color: '#ffce00' },
  shortlisted: { bg: 'rgba(52,211,153,0.12)',    color: '#34d399' },
  rejected:    { bg: 'rgba(255,85,85,0.12)',     color: '#ff7b7b' },
  selected:    { bg: 'rgba(165,180,252,0.12)',   color: '#a5b4fc' },
};

/**
 * Format a teams value for display.
 * Handles: string (legacy), array, undefined.
 */
const formatTeams = (teams) => {
  if (!teams) return '—';
  if (Array.isArray(teams)) return teams.length > 0 ? teams.join(', ') : '—';
  if (typeof teams === 'string') return teams;
  return '—';
};

const StatusPill = ({ status }) => {
  const style = STATUS_COLORS[status] || {};
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.65rem',
        borderRadius: 12,
        fontSize: '0.78rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        background: style.bg,
        color: style.color,
        letterSpacing: '0.04em',
      }}
    >
      {status}
    </span>
  );
};

const RecruitmentAdminPanel = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Expanded row for detailed view
  const [expandedId, setExpandedId] = useState(null);

  // Status update state per application
  const [updatingId, setUpdatingId] = useState(null);

  // CSV download state
  const [exporting, setExporting] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const { data } = await api.get('/api/recruitments', { params });
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load applications.'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingId(applicationId);
    setNotice('');
    setError('');
    try {
      const { data } = await api.put(`/api/recruitments/${applicationId}/status`, {
        status: newStatus,
      });
      setApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status: data.application.status } : app
        )
      );
      setNotice(`✅ Status updated to "${newStatus}"`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await api.get('/api/recruitments/export/csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'gdgsc-recruitments-2026.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to export CSV.'));
    } finally {
      setExporting(false);
    }
  };

  // Stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    selected: applications.filter((a) => a.status === 'selected').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div>
      {/* Stats bar */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: '📋', label: 'Total',       value: stats.total },
          { icon: '🕐', label: 'Pending',     value: stats.pending },
          { icon: '⭐', label: 'Shortlisted', value: stats.shortlisted },
          { icon: '✅', label: 'Selected',    value: stats.selected },
          { icon: '❌', label: 'Rejected',    value: stats.rejected },
        ].map(({ icon, label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon">{icon}</span>
              <span className="stat-label">{label}</span>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="content-card">
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2>🎯 Recruitment Applications</h2>
          <button
            className="btn btn-primary"
            onClick={handleExportCsv}
            disabled={exporting}
            style={{ padding: '0.6rem 1.2rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: '#ffce00', color: '#000' }}
          >
            {exporting ? 'Exporting…' : '⬇️ Export CSV'}
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, email, enrollment no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ flex: '1', minWidth: '220px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ maxWidth: '180px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.6rem 0.8rem' }}
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} style={{ background: '#1a1a1a' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback messages */}
        {notice && (
          <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {notice}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)', color: '#ff7b7b', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Loading applications…</p>
        ) : applications.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No applications found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  {['Full Name', 'Email', 'Enrollment No.', 'USS', 'Year', 'Team(s)', 'Status', 'Submitted', ''].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 0.5rem', color: '#888', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <React.Fragment key={app._id}>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: expandedId === app._id ? 'rgba(255,206,0,0.04)' : 'transparent',
                      }}
                      onClick={() => toggleExpand(app._id)}
                    >
                      <td style={{ padding: '0.7rem 0.5rem', color: '#fff', fontWeight: 500 }}>{app.fullName}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: '#bbb' }}>{app.email}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: '#bbb' }}>{app.enrollmentNumber}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: '#bbb' }}>{app.uss}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: '#bbb' }}>{app.year === 'Other' ? app.yearOther || 'Other' : app.year}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: '#bbb', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatTeams(app.teams)}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        <StatusPill status={app.status} />
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', color: '#888', whiteSpace: 'nowrap' }}>{formatAdminDate(app.createdAt)}</td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>{expandedId === app._id ? '▲' : '▼'}</span>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === app._id && (
                      <tr>
                        <td colSpan={9} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '2px solid rgba(255,206,0,0.15)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                            {/* Left column */}
                            <div>
                              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</p>
                              <p style={{ color: '#ccc', marginBottom: '1rem' }}>{app.contactNumber}</p>

                              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team(s)</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                                {Array.isArray(app.teams) && app.teams.length > 0 ? (
                                  app.teams.map((t) => (
                                    <span key={t} style={{ background: 'rgba(255,206,0,0.1)', border: '1px solid rgba(255,206,0,0.25)', borderRadius: 12, padding: '0.2rem 0.6rem', fontSize: '0.8rem', color: '#ffce00' }}>
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: '#888' }}>{formatTeams(app.teams)}</span>
                                )}
                              </div>

                              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio / Socials</p>
                              <p style={{ color: '#ccc', marginBottom: '1rem', wordBreak: 'break-all' }}>
                                {app.portfolioOrSocials ? (
                                  <a href={app.portfolioOrSocials} target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc' }}>
                                    {app.portfolioOrSocials}
                                  </a>
                                ) : '—'}
                              </p>

                              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Status</p>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {STATUS_OPTIONS.map((s) => (
                                  <button
                                    key={s}
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(app._id, s); }}
                                    disabled={updatingId === app._id || app.status === s}
                                    style={{
                                      padding: '0.35rem 0.8rem',
                                      borderRadius: 8,
                                      border: `1px solid ${app.status === s ? STATUS_COLORS[s]?.color || '#fff' : 'rgba(255,255,255,0.15)'}`,
                                      background: app.status === s ? (STATUS_COLORS[s]?.bg || 'transparent') : 'transparent',
                                      color: app.status === s ? (STATUS_COLORS[s]?.color || '#fff') : '#888',
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                      cursor: app.status === s ? 'default' : 'pointer',
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    {updatingId === app._id ? '…' : s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Right column — long text answers */}
                            <div>
                              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why GDGSC?</p>
                              <p style={{ color: '#ccc', marginBottom: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{app.motivation}</p>

                              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience / Skills</p>
                              <p style={{ color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{app.experience}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentAdminPanel;

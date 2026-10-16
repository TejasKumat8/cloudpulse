import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    investigating: 0,
    mitigated: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    sla_compliance_pct: 100.0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_name: 'api-gateway',
    severity: 'MEDIUM',
    status: 'OPEN',
    assignee: 'DevOps On-Call',
  });

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const url = activeFilter === 'ALL' 
        ? `${API_BASE}/incidents` 
        : `${API_BASE}/incidents?status=${activeFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch incidents`);
      const data = await res.json();
      setIncidents(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('/health');
      if (res.ok) {
        setBackendStatus('HEALTHY');
      } else {
        setBackendStatus('DEGRADED');
      }
    } catch (e) {
      setBackendStatus('OFFLINE');
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchStats();
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create incident');
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        service_name: 'api-gateway',
        severity: 'MEDIUM',
        status: 'OPEN',
        assignee: 'DevOps On-Call',
      });
      fetchIncidents();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update incident');
      fetchIncidents();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this incident record?')) return;
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete incident');
      fetchIncidents();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-badge">CP</div>
          <div className="logo-text">
            <h1>CloudPulse</h1>
            <p>SRE / DevOps Platform</p>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#incidents" className="nav-item active">
            <span>🚨 Incidents Dashboard</span>
          </a>
          <a href="/docs" target="_blank" rel="noreferrer" className="nav-item">
            <span>⚡ Swagger REST API</span>
          </a>
          <a href="/metrics" target="_blank" rel="noreferrer" className="nav-item">
            <span>📊 Prometheus Metrics</span>
          </a>
          <a href="/health" target="_blank" rel="noreferrer" className="nav-item">
            <span>❤️ Health Check</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div>Kubernetes / EKS Deployment</div>
          <div className="status-indicator">
            <span
              className="pulse-dot"
              style={{
                backgroundColor: backendStatus === 'HEALTHY' ? '#10b981' : '#ef4444',
                boxShadow: `0 0 8px ${backendStatus === 'HEALTHY' ? '#10b981' : '#ef4444'}`,
              }}
            ></span>
            <span>API: {backendStatus}</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-wrapper">
        <header className="top-header">
          <div className="page-title">
            <h2>Incident Command Center</h2>
            <p>Real-time reliability, SLA compliance, and incident response operations</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => { fetchIncidents(); fetchStats(); }}>
              🔄 Refresh
            </button>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + Report Incident
            </button>
          </div>
        </header>

        <div className="content-body">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Incidents</span>
              <span className="kpi-val" style={{ color: '#38bdf8' }}>{stats.total}</span>
              <span className="kpi-sub">Across all microservices</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Critical Outages</span>
              <span className="kpi-val" style={{ color: stats.critical > 0 ? '#ef4444' : '#10b981' }}>
                {stats.critical}
              </span>
              <span className="kpi-sub">P1 Priority incidents</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Active Response</span>
              <span className="kpi-val" style={{ color: '#f59e0b' }}>
                {stats.open + stats.investigating}
              </span>
              <span className="kpi-sub">Open + Investigating</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">SLA Resolution Rate</span>
              <span className="kpi-val" style={{ color: stats.sla_compliance_pct >= 90 ? '#10b981' : '#f59e0b' }}>
                {stats.sla_compliance_pct}%
              </span>
              <span className="kpi-sub">Resolved vs Total ratio</span>
            </div>
          </div>

          {/* Controls / Filter Bar */}
          <div className="controls-bar">
            <div className="filters-group">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Filter Status:</span>
              {['ALL', 'OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  className={`filter-chip ${activeFilter === status ? 'active' : ''}`}
                  onClick={() => setActiveFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
              Showing {incidents.length} records
            </div>
          </div>

          {/* Table */}
          {error ? (
            <div className="empty-state" style={{ color: '#f87171' }}>
              ⚠️ {error} - Check if backend is reachable.
            </div>
          ) : loading && incidents.length === 0 ? (
            <div className="empty-state">Loading active incidents...</div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">
              🎉 No incidents matching filter "{activeFilter}". All systems operational!
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Incident Title</th>
                    <th>Service</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Reported</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', color: '#64748b' }}>#{item.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.description && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="service-tag">{item.service_name}</span>
                      </td>
                      <td>
                        <span className={`badge sev-${item.severity.toLowerCase()}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge status-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{item.assignee}</td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {item.status !== 'RESOLVED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStatusChange(item.id, 'RESOLVED')}
                              title="Resolve Incident"
                            >
                              ✓ Resolve
                            </button>
                          )}
                          {item.status === 'OPEN' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStatusChange(item.id, 'INVESTIGATING')}
                            >
                              Investigate
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item.id)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚨 Report New Incident</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Incident Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Elevated 500 error rates on auth endpoint"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description & Scope</label>
                <textarea
                  rows="3"
                  placeholder="Impact summary, affected customers, error codes..."
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Affected Service</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Severity</label>
                  <select
                    className="form-select"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="CRITICAL">CRITICAL (P1 Outage)</option>
                    <option value="HIGH">HIGH (P2 Major)</option>
                    <option value="MEDIUM">MEDIUM (P3 Degraded)</option>
                    <option value="LOW">LOW (P4 Minor)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="MITIGATED">MITIGATED</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assignee / Responder</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Dispatch Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

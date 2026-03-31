function DashboardPage({
  summary,
  loading,
  errorMessage,
  services,
  navigateToSection,
}) {
  return (
    <>
      <section className="stats-grid">
        <article className="stat-card">
          <span>Total Services</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="stat-card">
          <span>Live</span>
          <strong className="success-text">{summary.live}</strong>
        </article>
        <article className="stat-card">
          <span>Offline</span>
          <strong className="danger-text">{summary.offline}</strong>
        </article>
      </section>

      <section className="status-panel">
        <div className="status-header simple">
          <div>
            <p className="section-label">Service Health</p>
            <h3>Current Status</h3>
          </div>
        </div>

        {loading ? <p className="state-message">Loading service statuses...</p> : null}
        {errorMessage ? <p className="state-message warning">{errorMessage}</p> : null}

        <div className="status-list" role="list">
          {services.map((service) => (
            <button
              key={service.name}
              type="button"
              className="status-row"
              onClick={() => navigateToSection(service.name)}
            >
              <span className="status-name">{service.label}</span>
              <span className="status-url">{service.url}</span>
              <span className={service.status === "live" ? "badge live" : "badge offline"}>
                {service.status}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

export default DashboardPage;

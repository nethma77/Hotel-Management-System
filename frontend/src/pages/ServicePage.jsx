function ServicePage({ service, pageConfig }) {
  return (
    <section className="service-page">
      <div className="service-page-header">
        <div>
          <p className="section-label">Service Page</p>
          <h3>{pageConfig.title}</h3>
          <p className="hero-copy">{pageConfig.summary}</p>
        </div>
        <span className={service.status === "live" ? "badge live" : "badge offline"}>
          {service.status}
        </span>
      </div>

      <div className="service-page-grid">
        <article className="service-page-card">
          <span>Service URL</span>
          <strong>{service.url}</strong>
        </article>
        <article className="service-page-card">
          <span>Status Code</span>
          <strong>{service.status_code ?? "Unavailable"}</strong>
        </article>
      </div>

      <div className="service-page-section">
        <p className="section-label">Available Endpoints</p>
        <div className="endpoint-list">
          {pageConfig.endpoints.map((endpoint) => (
            <div key={endpoint} className="endpoint-item">
              {endpoint}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServicePage;

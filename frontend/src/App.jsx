import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  fallbackServices,
  formatServiceName,
  gatewayBaseUrl,
  getSectionFromPath,
  sectionPaths,
  serviceMeta,
  servicePages,
} from "./config/appConfig";
import BookingPage from "./pages/BookingPage";
import CustomerPage from "./pages/CustomerPage";
import DashboardPage from "./pages/DashboardPage";
import PaymentCheckoutPage from "./pages/PaymentCheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import ReviewPage from "./pages/ReviewPage";
import RoomPage from "./pages/RoomPage";
import ServicePage from "./pages/ServicePage";
import ServiceRequestPage from "./pages/ServiceRequestPage";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [services, setServices] = useState(fallbackServices);
  const [summary, setSummary] = useState({
    total: fallbackServices.length,
    live: 0,
    offline: fallbackServices.length,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const activeSection = getSectionFromPath(location.pathname);

  function navigateToSection(section) {
    navigate(sectionPaths[section] || sectionPaths.dashboard);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadStatuses() {
      try {
        const response = await fetch(`${gatewayBaseUrl}/services/status`);
        if (!response.ok) {
          throw new Error("Could not load service status.");
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        const normalizedServices = data.services.map((service) => ({
          ...service,
          label: formatServiceName(service.name),
          description:
            serviceMeta[service.name]?.description
            || "Service health and endpoint information.",
        }));

        setServices(normalizedServices);
        setSummary(data.summary);
        setLastUpdated(new Date().toLocaleTimeString());
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setServices(fallbackServices);
        setSummary({
          total: fallbackServices.length,
          live: 0,
          offline: fallbackServices.length,
        });
        setErrorMessage("Gateway is not reachable. Showing offline fallback data.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStatuses();
    const intervalId = window.setInterval(loadStatuses, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const activeService = useMemo(() => {
    if (activeSection === "dashboard" || activeSection === "payment-checkout") {
      return null;
    }

    return services.find((service) => service.name === activeSection) || null;
  }, [activeSection, services]);

  const pageConfig = activeService ? servicePages[activeService.name] : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="sidebar-eyebrow">Hotel Management</p>
          <h1>Control Panel</h1>
          <p className="sidebar-copy">
            Track every core microservice from one dashboard.
          </p>
        </div>

        <nav className="sidebar-nav" aria-label="Service navigation">
          <button
            type="button"
            className={activeSection === "dashboard" ? "nav-item active" : "nav-item"}
            onClick={() => navigateToSection("dashboard")}
          >
            Dashboard
          </button>

          {services.map((service) => (
            <button
              key={service.name}
              type="button"
              className={activeSection === service.name ? "nav-item active" : "nav-item"}
              onClick={() => navigateToSection(service.name)}
            >
              <span>{service.label}</span>
              <span
                className={service.status === "live" ? "nav-dot live" : "nav-dot offline"}
                aria-hidden="true"
              />
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-content">
        <section className="hero-card">
          <div>
            <p className="section-label">
              {activeSection === "dashboard"
                ? "Overview"
                : activeSection === "payment-checkout"
                  ? "Checkout"
                  : "Service Page"}
            </p>
            <h2>
              {activeSection === "payment-checkout"
                ? "Payment Checkout"
                : activeService
                  ? activeService.label
                  : "Dashboard"}
            </h2>
            <p className="hero-copy">
              {activeSection === "payment-checkout"
                ? "Complete card payments securely using Stripe Elements."
                : activeService
                  ? activeService.description
                  : "Monitor the current health of booking, payment, review, room, customer, and guest service request systems."}
            </p>
          </div>

          <div className="hero-meta">
            <span className="badge neutral">
              Gateway: {gatewayBaseUrl}
            </span>
          </div>
        </section>

        <Routes>
          <Route path="/" element={<Navigate to={sectionPaths.dashboard} replace />} />
          <Route
            path="/dashboard"
            element={(
              <DashboardPage
                summary={summary}
                loading={loading}
                errorMessage={errorMessage}
                services={services}
                navigateToSection={navigateToSection}
              />
            )}
          />
          <Route path="/customers" element={<CustomerPage gatewayUrl={gatewayBaseUrl} />} />
          <Route path="/bookings" element={<BookingPage gatewayUrl={gatewayBaseUrl} />} />
          <Route
            path="/payments"
            element={(
              <PaymentPage
                gatewayUrl={gatewayBaseUrl}
                onPayNow={(paymentId) => navigate(`/payments/checkout/${encodeURIComponent(paymentId)}`)}
              />
            )}
          />
          <Route
            path="/payments/checkout/:paymentId"
            element={<PaymentCheckoutPage gatewayUrl={gatewayBaseUrl} />}
          />
          <Route path="/rooms" element={<RoomPage gatewayUrl={gatewayBaseUrl} />} />
          <Route path="/reviews" element={<ReviewPage gatewayUrl={gatewayBaseUrl} />} />
          <Route
            path="/service-requests"
            element={<ServiceRequestPage gatewayUrl={gatewayBaseUrl} />}
          />
          <Route
            path="*"
            element={
              activeService && pageConfig
                ? <ServicePage service={activeService} pageConfig={pageConfig} />
                : <Navigate to={sectionPaths.dashboard} replace />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;

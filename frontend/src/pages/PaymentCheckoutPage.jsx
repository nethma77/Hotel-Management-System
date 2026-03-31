import { useMemo, useState, useEffect } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate, useParams } from "react-router-dom";
import { sectionPaths } from "../config/appConfig";

function PaymentCheckoutForm({ gatewayUrl, paymentId, paymentIntentId, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        throw new Error(error.message || "Payment confirmation failed.");
      }

      if (paymentIntentId) {
        const response = await fetch(`${gatewayUrl}/payment/payments/stripe/sync-intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payment_intent_id: paymentIntentId }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Payment sync failed.");
        }

        setMessage(`Payment ${paymentId} completed successfully.`);
        onPaymentSuccess?.(data);
      } else {
        setMessage(`Payment ${paymentId} completed successfully.`);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="customer-form expanded" onSubmit={handleSubmit}>
      <h4>Pay With Card</h4>
      <div className="stripe-element-wrap">
        <PaymentElement />
      </div>
      <div className="form-actions">
        <button type="submit" className="secondary-button" disabled={!stripe || submitting}>
          {submitting ? "Processing..." : "Pay Now"}
        </button>
      </div>
      {message ? <p className="form-message success">{message}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
    </form>
  );
}

function PaymentCheckoutPage({ gatewayUrl }) {
  const navigate = useNavigate();
  const { paymentId = "" } = useParams();
  const [payment, setPayment] = useState(null);
  const [publishableKey, setPublishableKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCheckoutData() {
      if (!paymentId) {
        setLoading(false);
        setErrorMessage("No payment selected.");
        return;
      }

      try {
        setLoading(true);
        const [paymentRes, configRes] = await Promise.all([
          fetch(`${gatewayUrl}/payment/payments/${encodeURIComponent(paymentId)}`),
          fetch(`${gatewayUrl}/payment/payments/config/public`),
        ]);

        const paymentData = await paymentRes.json();
        const configData = await configRes.json();

        if (!paymentRes.ok) {
          throw new Error(paymentData.detail || "Could not load payment details.");
        }

        if (!configRes.ok) {
          throw new Error(configData.detail || "Could not load Stripe configuration.");
        }

        if (!configData.stripe_publishable_key) {
          throw new Error("Stripe publishable key is missing.");
        }

        if (!paymentData.stripe_client_secret) {
          throw new Error("This payment does not have a Stripe client secret.");
        }

        setPayment(paymentData);
        setPublishableKey(configData.stripe_publishable_key);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutData();
  }, [gatewayUrl, paymentId]);

  const stripePromise = useMemo(() => {
    if (!publishableKey) {
      return null;
    }
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const options = useMemo(() => {
    if (!payment?.stripe_client_secret) {
      return null;
    }

    return {
      clientSecret: payment.stripe_client_secret,
      appearance: {
        theme: "night",
        variables: {
          colorPrimary: "#38bdf8",
          colorBackground: "#0f172a",
          colorText: "#e5eefb",
          colorTextSecondary: "#9fb2cc",
          colorDanger: "#f87171",
          colorSuccess: "#4ade80",
          borderRadius: "12px",
          fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
          spacingUnit: "4px",
        },
        rules: {
          ".Input": {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            boxShadow: "none",
            color: "#e5eefb",
          },
          ".Input:focus": {
            border: "1px solid #38bdf8",
            boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.2)",
          },
          ".Label": {
            color: "#9fb2cc",
          },
          ".Tab": {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
          },
          ".Tab:hover": {
            color: "#e5eefb",
          },
          ".Tab--selected": {
            borderColor: "#38bdf8",
            boxShadow: "0 0 0 1px #38bdf8",
          },
          ".Block": {
            backgroundColor: "rgba(8, 17, 32, 0.75)",
          },
        },
      },
    };
  }, [payment]);

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Payment Checkout</p>
          <h3>Stripe Card Payment</h3>
        </div>
        <button
          type="button"
          className="secondary-button subtle"
          onClick={() => navigate(sectionPaths.payment)}
        >
          Back to Payments
        </button>
      </div>

      {loading ? <p className="state-message">Loading payment checkout...</p> : null}
      {errorMessage ? <p className="form-message error standalone">{errorMessage}</p> : null}

      {payment ? (
        <div className="service-page-grid">
          <article className="service-page-card">
            <span>Payment ID</span>
            <strong>{payment.payment_id}</strong>
          </article>
          <article className="service-page-card">
            <span>Amount</span>
            <strong>{payment.amount} {payment.currency}</strong>
          </article>
          <article className="service-page-card">
            <span>Booking ID</span>
            <strong>{payment.booking_id}</strong>
          </article>
          <article className="service-page-card">
            <span>Status</span>
            <strong>{payment.status}</strong>
          </article>
        </div>
      ) : null}

      {stripePromise && options ? (
        <Elements stripe={stripePromise} options={options}>
          <PaymentCheckoutForm
            gatewayUrl={gatewayUrl}
            paymentId={paymentId}
            paymentIntentId={payment.transaction_ref}
            onPaymentSuccess={(updatedPayment) => setPayment(updatedPayment)}
          />
        </Elements>
      ) : null}
    </section>
  );
}

export default PaymentCheckoutPage;

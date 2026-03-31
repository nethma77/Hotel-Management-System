import { useState } from "react";

const emptyPaymentForm = {
  booking_id: "",
  customer_id: "",
  amount: "",
  currency: "LKR",
  method: "CASH",
};

function PaymentPage({ gatewayUrl, onPayNow }) {
  const [payments, setPayments] = useState([]);
  const [formData, setFormData] = useState(emptyPaymentForm);
  const [searchBookingId, setSearchBookingId] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  async function loadPaymentsByBooking(bookingId) {
    if (!bookingId.trim()) {
      setPayments([]);
      setPaymentError("Enter a booking ID to load payments.");
      return;
    }

    try {
      setLoadingPayments(true);
      const response = await fetch(
        `${gatewayUrl}/payment/payments/booking/${encodeURIComponent(bookingId.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load payments.");
      }
      setPayments(data);
      setStatusDrafts(
        Object.fromEntries((Array.isArray(data) ? data : []).map((payment) => [
          payment.payment_id,
          payment.status,
        ])),
      );
      setPaymentError("");
    } catch (error) {
      setPayments([]);
      setPaymentError(error.message);
    } finally {
      setLoadingPayments(false);
    }
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleStatusDraftChange(paymentId, status) {
    setStatusDrafts((current) => ({ ...current, [paymentId]: status }));
  }

  async function handleCreatePayment(event) {
    event.preventDefault();
    setSavingPayment(true);
    setPaymentMessage("");
    setPaymentError("");

    const payload = {
      booking_id: formData.booking_id.trim(),
      customer_id: formData.customer_id.trim(),
      amount: Number(formData.amount),
      currency: formData.currency.trim().toUpperCase(),
      method: formData.method,
    };

    try {
      const response = await fetch(`${gatewayUrl}/payment/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Payment creation failed.");
      }
      setPaymentMessage("Payment created successfully.");
      setFormData(emptyPaymentForm);
      setSearchBookingId(payload.booking_id);
      await loadPaymentsByBooking(payload.booking_id);
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleStatusUpdate(paymentId, status) {
    setPaymentMessage("");
    setPaymentError("");

    try {
      const response = await fetch(`${gatewayUrl}/payment/payments/${paymentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not update payment status.");
      }
      setPaymentMessage(`Payment ${paymentId} updated to ${status}.`);
      await loadPaymentsByBooking(searchBookingId);
    } catch (error) {
      setPaymentError(error.message);
    }
  }

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Payment Service</p>
          <h3>Manage Payments</h3>
        </div>
      </div>

      <form className="customer-form expanded" onSubmit={handleCreatePayment}>
        <h4>Create Payment</h4>

        <div className="customer-form-grid">
          <label>
            Booking ID
            <input name="booking_id" value={formData.booking_id} onChange={handleInputChange} required />
          </label>
          <label>
            Customer ID
            <input name="customer_id" value={formData.customer_id} onChange={handleInputChange} required />
          </label>
          <label>
            Amount
            <input type="number" min="0.01" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} required />
          </label>
          <label>
            Currency
            <input name="currency" value={formData.currency} onChange={handleInputChange} maxLength="3" required />
          </label>
          <label>
            Method
            <select name="method" value={formData.method} onChange={handleInputChange}>
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="secondary-button" disabled={savingPayment}>
            {savingPayment ? "Saving..." : "Create Payment"}
          </button>
        </div>
      </form>

      <div className="customer-list-panel table-panel">
        <div className="customer-panel-header">
          <h4>Payments List</h4>
          <div className="customer-header-actions">
            <input
              className="inline-input"
              placeholder="Search by booking ID"
              value={searchBookingId}
              onChange={(event) => setSearchBookingId(event.target.value)}
            />
            <button
              type="button"
              className="secondary-button subtle"
              onClick={() => loadPaymentsByBooking(searchBookingId)}
            >
              Load Payments
            </button>
          </div>
        </div>

        {paymentMessage ? <p className="form-message success standalone">{paymentMessage}</p> : null}
        {paymentError ? <p className="form-message error standalone">{paymentError}</p> : null}
        {loadingPayments ? <p className="state-message">Loading payments...</p> : null}
        {!loadingPayments && payments.length === 0 && searchBookingId ? (
          <p className="state-message">No payments found for this booking.</p>
        ) : null}

        {payments.length > 0 ? (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Booking ID</th>
                  <th>Customer ID</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{payment.payment_id}</td>
                    <td>{payment.booking_id}</td>
                    <td>{payment.customer_id}</td>
                    <td>{payment.amount} {payment.currency}</td>
                    <td>{payment.method}</td>
                    <td>{payment.status}</td>
                    <td className="payment-action-cell">
                      <div className="table-actions payment-actions">
                        {payment.method !== "CARD" ? (
                          <>
                            <select
                              className="status-select payment-status-select"
                              value={statusDrafts[payment.payment_id] || payment.status}
                              onChange={(event) => handleStatusDraftChange(payment.payment_id, event.target.value)}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="SUCCESS">SUCCESS</option>
                              <option value="FAILED">FAILED</option>
                            </select>
                            <button
                              type="button"
                              className="secondary-button subtle payment-action-button"
                              onClick={() =>
                                handleStatusUpdate(
                                  payment.payment_id,
                                  statusDrafts[payment.payment_id] || payment.status,
                                )
                              }
                            >
                              Update
                            </button>
                          </>
                        ) : payment.status !== "SUCCESS" ? (
                          <button
                            type="button"
                            className="secondary-button subtle payment-action-button"
                            onClick={() => onPayNow(payment.payment_id)}
                          >
                            Pay Now
                          </button>
                        ) : (
                          <span className="badge live payment-paid-badge">Paid</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PaymentPage;

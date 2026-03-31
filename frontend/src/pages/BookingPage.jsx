import { useEffect, useState } from "react";

const emptyBookingForm = {
  user_id: "",
  room_id: "",
  check_in: "",
  check_out: "",
  total_price: "",
};

function BookingPage({ gatewayUrl }) {
  const [bookings, setBookings] = useState([]);
  const [formData, setFormData] = useState(emptyBookingForm);
  const [editingBookingId, setEditingBookingId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  const isEditing = Boolean(editingBookingId);

  async function loadBookings() {
    try {
      setLoadingBookings(true);
      const response = await fetch(`${gatewayUrl}/booking/booking/bookings`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load bookings.");
      }
      setBookings(data);
      setBookingError("");
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [gatewayUrl]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function resetBookingForm() {
    setFormData(emptyBookingForm);
    setEditingBookingId("");
    setShowCreateForm(false);
  }

  function handleCreateClick() {
    setFormData(emptyBookingForm);
    setEditingBookingId("");
    setShowCreateForm((current) => !current);
    setBookingMessage("");
    setBookingError("");
  }

  function handleEditBooking(booking) {
    setFormData({
      user_id: booking.user_id || "",
      room_id: booking.room_id || "",
      check_in: booking.check_in || "",
      check_out: booking.check_out || "",
      total_price: String(booking.total_price ?? ""),
    });
    setEditingBookingId(booking._id);
    setShowCreateForm(true);
    setBookingMessage("");
    setBookingError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingBooking(true);
    setBookingMessage("");
    setBookingError("");

    const payload = {
      user_id: formData.user_id.trim(),
      room_id: formData.room_id.trim(),
      check_in: formData.check_in,
      check_out: formData.check_out,
      total_price: Number(formData.total_price),
    };

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${gatewayUrl}/booking/booking/bookings/${editingBookingId}`
      : `${gatewayUrl}/booking/booking/bookings`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Booking request failed.");
      }
      setBookingMessage(isEditing ? "Booking updated successfully." : "Booking created successfully.");
      resetBookingForm();
      await loadBookings();
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setSavingBooking(false);
    }
  }

  async function handleDeleteBooking(booking) {
    const confirmed = window.confirm(`Delete booking for user ${booking.user_id}?`);
    if (!confirmed) return;

    setBookingMessage("");
    setBookingError("");

    try {
      const response = await fetch(`${gatewayUrl}/booking/booking/bookings/${booking.user_id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok && !data.error) {
        throw new Error(data.detail || "Could not delete booking.");
      }
      if (data.error) {
        throw new Error(data.error);
      }
      if (editingBookingId === booking._id) {
        resetBookingForm();
      }
      setBookingMessage("Booking deleted successfully.");
      await loadBookings();
    } catch (error) {
      setBookingError(error.message);
    }
  }

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Booking Service</p>
          <h3>Manage Bookings</h3>
        </div>
        <div className="customer-header-actions">
          <button type="button" className="secondary-button subtle" onClick={loadBookings}>
            Refresh List
          </button>
          <button type="button" className="secondary-button" onClick={handleCreateClick}>
            {showCreateForm && !isEditing ? "Close Create" : "Create Booking"}
          </button>
        </div>
      </div>

      {(showCreateForm || isEditing) ? (
        <form className="customer-form expanded" onSubmit={handleSubmit}>
          <h4>{isEditing ? "Update Booking" : "Create Booking"}</h4>

          <div className="customer-form-grid">
            <label>
              User ID
              <input name="user_id" value={formData.user_id} onChange={handleInputChange} required />
            </label>
            <label>
              Room ID
              <input name="room_id" value={formData.room_id} onChange={handleInputChange} required />
            </label>
            <label>
              Check In
              <input type="date" name="check_in" value={formData.check_in} onChange={handleInputChange} required />
            </label>
            <label>
              Check Out
              <input type="date" name="check_out" value={formData.check_out} onChange={handleInputChange} required />
            </label>
            <label>
              Total Price
              <input type="number" min="0" step="0.01" name="total_price" value={formData.total_price} onChange={handleInputChange} required />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="secondary-button" disabled={savingBooking}>
              {savingBooking ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button type="button" className="secondary-button subtle" onClick={resetBookingForm}>
              Cancel
            </button>
          </div>

          {bookingMessage ? <p className="form-message success">{bookingMessage}</p> : null}
          {bookingError ? <p className="form-message error">{bookingError}</p> : null}
        </form>
      ) : null}

      {!showCreateForm && !isEditing && bookingMessage ? (
        <p className="form-message success standalone">{bookingMessage}</p>
      ) : null}
      {!showCreateForm && !isEditing && bookingError ? (
        <p className="form-message error standalone">{bookingError}</p>
      ) : null}

      <div className="customer-list-panel table-panel">
        <h4>Bookings List</h4>
        {loadingBookings ? <p className="state-message">Loading bookings...</p> : null}
        {!loadingBookings && bookings.length === 0 ? (
          <p className="state-message">No bookings found.</p>
        ) : null}

        {bookings.length > 0 ? (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Room ID</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Total Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.user_id}</td>
                    <td>{booking.room_id}</td>
                    <td>{booking.check_in}</td>
                    <td>{booking.check_out}</td>
                    <td>{booking.total_price}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="secondary-button subtle" onClick={() => handleEditBooking(booking)}>
                          Edit
                        </button>
                        <button type="button" className="secondary-button danger" onClick={() => handleDeleteBooking(booking)}>
                          Delete
                        </button>
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

export default BookingPage;

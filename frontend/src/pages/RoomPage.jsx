import { useEffect, useState } from "react";

const emptyRoomForm = {
  room_number: "",
  room_type: "",
  price: "",
  is_available: true,
  description: "",
};

function RoomPage({ gatewayUrl }) {
  const [rooms, setRooms] = useState([]);
  const [formData, setFormData] = useState(emptyRoomForm);
  const [editingRoomNumber, setEditingRoomNumber] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomMessage, setRoomMessage] = useState("");
  const [roomError, setRoomError] = useState("");

  const isEditing = Boolean(editingRoomNumber);

  async function loadRooms() {
    try {
      setLoadingRooms(true);
      const response = await fetch(`${gatewayUrl}/room/rooms`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load rooms.");
      }
      setRooms(data);
      setRoomError("");
    } catch (error) {
      setRoomError(error.message);
    } finally {
      setLoadingRooms(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, [gatewayUrl]);

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetRoomForm() {
    setFormData(emptyRoomForm);
    setEditingRoomNumber("");
    setShowCreateForm(false);
  }

  function handleCreateClick() {
    setFormData(emptyRoomForm);
    setEditingRoomNumber("");
    setShowCreateForm((current) => !current);
    setRoomMessage("");
    setRoomError("");
  }

  function handleEditRoom(room) {
    setFormData({
      room_number: room.room_number || "",
      room_type: room.room_type || "",
      price: String(room.price ?? ""),
      is_available: Boolean(room.is_available),
      description: room.description || "",
    });
    setEditingRoomNumber(room.room_number);
    setShowCreateForm(true);
    setRoomMessage("");
    setRoomError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingRoom(true);
    setRoomMessage("");
    setRoomError("");

    const payload = isEditing
      ? {
          room_type: formData.room_type.trim(),
          price: Number(formData.price),
          is_available: formData.is_available,
        }
      : {
          room_number: formData.room_number.trim(),
          room_type: formData.room_type.trim(),
          price: Number(formData.price),
          is_available: formData.is_available,
          description: formData.description.trim() || null,
        };

    const method = isEditing ? "PATCH" : "POST";
    const endpoint = isEditing
      ? `${gatewayUrl}/room/rooms/${editingRoomNumber}`
      : `${gatewayUrl}/room/rooms`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Room request failed.");
      }
      setRoomMessage(isEditing ? "Room updated successfully." : "Room created successfully.");
      resetRoomForm();
      await loadRooms();
    } catch (error) {
      setRoomError(error.message);
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleDeleteRoom(roomNumber) {
    const confirmed = window.confirm(`Delete room ${roomNumber}?`);
    if (!confirmed) return;

    setRoomMessage("");
    setRoomError("");

    try {
      const response = await fetch(`${gatewayUrl}/room/rooms/${roomNumber}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not delete room.");
      }
      if (editingRoomNumber === roomNumber) {
        resetRoomForm();
      }
      setRoomMessage("Room deleted successfully.");
      await loadRooms();
    } catch (error) {
      setRoomError(error.message);
    }
  }

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Room Service</p>
          <h3>Manage Rooms</h3>
        </div>
        <div className="customer-header-actions">
          <button type="button" className="secondary-button subtle" onClick={loadRooms}>
            Refresh List
          </button>
          <button type="button" className="secondary-button" onClick={handleCreateClick}>
            {showCreateForm && !isEditing ? "Close Create" : "Create Room"}
          </button>
        </div>
      </div>

      {(showCreateForm || isEditing) ? (
        <form className="customer-form expanded" onSubmit={handleSubmit}>
          <h4>{isEditing ? "Update Room" : "Create Room"}</h4>

          <div className="customer-form-grid">
            <label>
              Room Number
              <input name="room_number" value={formData.room_number} onChange={handleInputChange} disabled={isEditing} required />
            </label>
            <label>
              Room Type
              <input name="room_type" value={formData.room_type} onChange={handleInputChange} required />
            </label>
            <label>
              Price
              <input type="number" min="0" step="0.01" name="price" value={formData.price} onChange={handleInputChange} required />
            </label>
            <label className="checkbox-field">
              <span>Available</span>
              <input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleInputChange} />
            </label>
          </div>

          {!isEditing ? (
            <label>
              Description
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" />
            </label>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="secondary-button" disabled={savingRoom}>
              {savingRoom ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button type="button" className="secondary-button subtle" onClick={resetRoomForm}>
              Cancel
            </button>
          </div>

          {roomMessage ? <p className="form-message success">{roomMessage}</p> : null}
          {roomError ? <p className="form-message error">{roomError}</p> : null}
        </form>
      ) : null}

      {!showCreateForm && !isEditing && roomMessage ? (
        <p className="form-message success standalone">{roomMessage}</p>
      ) : null}
      {!showCreateForm && !isEditing && roomError ? (
        <p className="form-message error standalone">{roomError}</p>
      ) : null}

      <div className="customer-list-panel table-panel">
        <h4>Rooms List</h4>
        {loadingRooms ? <p className="state-message">Loading rooms...</p> : null}
        {!loadingRooms && rooms.length === 0 ? <p className="state-message">No rooms found.</p> : null}

        {rooms.length > 0 ? (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Room Type</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room._id || room.room_number}>
                    <td>{room.room_number}</td>
                    <td>{room.room_type}</td>
                    <td>{room.price}</td>
                    <td>{room.is_available ? "Yes" : "No"}</td>
                    <td>{room.description || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="secondary-button subtle" onClick={() => handleEditRoom(room)}>
                          Edit
                        </button>
                        <button type="button" className="secondary-button danger" onClick={() => handleDeleteRoom(room.room_number)}>
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

export default RoomPage;

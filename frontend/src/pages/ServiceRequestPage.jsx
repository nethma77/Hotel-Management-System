import { useEffect, useState } from "react";

const emptyServiceRequestForm = {
  customer_id: "",
  customer_name: "",
  room_number: "",
  request_type: "",
  description: "",
  status: "Pending",
};

function ServiceRequestPage({ gatewayUrl }) {
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState(emptyServiceRequestForm);
  const [editingRequestId, setEditingRequestId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");

  const isEditing = Boolean(editingRequestId);

  async function loadRequests() {
    try {
      setLoadingRequests(true);
      const response = await fetch(`${gatewayUrl}/service-request/service-requests`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load service requests.");
      }
      setRequests(data);
      setRequestError("");
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, [gatewayUrl]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function resetRequestForm() {
    setFormData(emptyServiceRequestForm);
    setEditingRequestId("");
    setShowCreateForm(false);
  }

  function handleCreateClick() {
    setFormData(emptyServiceRequestForm);
    setEditingRequestId("");
    setShowCreateForm((current) => !current);
    setRequestMessage("");
    setRequestError("");
  }

  function handleEditRequest(request) {
    setFormData({
      customer_id: request.customer_id || "",
      customer_name: request.customer_name || "",
      room_number: String(request.room_number ?? ""),
      request_type: request.request_type || "",
      description: request.description || "",
      status: request.status || "Pending",
    });
    setEditingRequestId(request.id);
    setShowCreateForm(true);
    setRequestMessage("");
    setRequestError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingRequest(true);
    setRequestMessage("");
    setRequestError("");

    const payload = {
      customer_id: formData.customer_id.trim(),
      customer_name: formData.customer_name.trim(),
      room_number: Number(formData.room_number),
      request_type: formData.request_type.trim(),
      description: formData.description.trim(),
      status: formData.status.trim(),
    };

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${gatewayUrl}/service-request/service-requests/${editingRequestId}`
      : `${gatewayUrl}/service-request/service-requests`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Service request failed.");
      }
      setRequestMessage(
        isEditing
          ? "Service request updated successfully."
          : "Service request created successfully.",
      );
      resetRequestForm();
      await loadRequests();
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setSavingRequest(false);
    }
  }

  async function handleDeleteRequest(requestId) {
    const confirmed = window.confirm("Delete this service request?");
    if (!confirmed) return;

    setRequestMessage("");
    setRequestError("");

    try {
      const response = await fetch(`${gatewayUrl}/service-request/service-requests/${requestId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not delete service request.");
      }
      if (editingRequestId === requestId) {
        resetRequestForm();
      }
      setRequestMessage("Service request deleted successfully.");
      await loadRequests();
    } catch (error) {
      setRequestError(error.message);
    }
  }

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Service Request Service</p>
          <h3>Manage Service Requests</h3>
        </div>
        <div className="customer-header-actions">
          <button type="button" className="secondary-button subtle" onClick={loadRequests}>
            Refresh List
          </button>
          <button type="button" className="secondary-button" onClick={handleCreateClick}>
            {showCreateForm && !isEditing ? "Close Create" : "Create Request"}
          </button>
        </div>
      </div>

      {(showCreateForm || isEditing) ? (
        <form className="customer-form expanded" onSubmit={handleSubmit}>
          <h4>{isEditing ? "Update Service Request" : "Create Service Request"}</h4>

          <div className="customer-form-grid">
            <label>
              Customer ID
              <input name="customer_id" value={formData.customer_id} onChange={handleInputChange} required />
            </label>
            <label>
              Customer Name
              <input name="customer_name" value={formData.customer_name} onChange={handleInputChange} required />
            </label>
            <label>
              Room Number
              <input type="number" name="room_number" value={formData.room_number} onChange={handleInputChange} required />
            </label>
            <label>
              Request Type
              <input name="request_type" value={formData.request_type} onChange={handleInputChange} required />
            </label>
            <label>
              Status
              <input name="status" value={formData.status} onChange={handleInputChange} required />
            </label>
          </div>

          <label>
            Description
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" required />
          </label>

          <div className="form-actions">
            <button type="submit" className="secondary-button" disabled={savingRequest}>
              {savingRequest ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button type="button" className="secondary-button subtle" onClick={resetRequestForm}>
              Cancel
            </button>
          </div>

          {requestMessage ? <p className="form-message success">{requestMessage}</p> : null}
          {requestError ? <p className="form-message error">{requestError}</p> : null}
        </form>
      ) : null}

      {!showCreateForm && !isEditing && requestMessage ? (
        <p className="form-message success standalone">{requestMessage}</p>
      ) : null}
      {!showCreateForm && !isEditing && requestError ? (
        <p className="form-message error standalone">{requestError}</p>
      ) : null}

      <div className="customer-list-panel table-panel">
        <h4>Service Requests List</h4>
        {loadingRequests ? <p className="state-message">Loading service requests...</p> : null}
        {!loadingRequests && requests.length === 0 ? (
          <p className="state-message">No service requests found.</p>
        ) : null}

        {requests.length > 0 ? (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer</th>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.request_id}</td>
                    <td>{request.customer_name}</td>
                    <td>{request.room_number}</td>
                    <td>{request.request_type}</td>
                    <td>{request.status}</td>
                    <td>{request.description}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="secondary-button subtle" onClick={() => handleEditRequest(request)}>
                          Edit
                        </button>
                        <button type="button" className="secondary-button danger" onClick={() => handleDeleteRequest(request.id)}>
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

export default ServiceRequestPage;

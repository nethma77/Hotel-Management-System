import { useEffect, useState } from "react";

const emptyCustomerForm = {
  customer_id: "",
  name: "",
  email: "",
  phone: "",
  address: "",
};

function CustomerPage({ gatewayUrl }) {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState(emptyCustomerForm);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerError, setCustomerError] = useState("");

  async function loadCustomers() {
    try {
      setLoadingCustomers(true);
      const response = await fetch(`${gatewayUrl}/customer/customers`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load customers.");
      }
      setCustomers(data);
      setCustomerError("");
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setLoadingCustomers(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [gatewayUrl]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setFormData(emptyCustomerForm);
    setIsEditing(false);
    setShowCreateForm(false);
  }

  function handleEditCustomer(customer) {
    setFormData({
      customer_id: customer.customer_id || "",
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setIsEditing(true);
    setShowCreateForm(true);
    setCustomerMessage("");
    setCustomerError("");
  }

  function handleCreateClick() {
    setFormData(emptyCustomerForm);
    setIsEditing(false);
    setShowCreateForm((current) => !current);
    setCustomerMessage("");
    setCustomerError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingCustomer(true);
    setCustomerMessage("");
    setCustomerError("");

    const payload = {
      customer_id: formData.customer_id.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
    };

    const customerId = formData.customer_id.trim();
    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${gatewayUrl}/customer/customers/${customerId}`
      : `${gatewayUrl}/customer/customers`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Customer request failed.");
      }
      setCustomerMessage(
        isEditing ? "Customer updated successfully." : "Customer created successfully.",
      );
      resetForm();
      await loadCustomers();
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleDeleteCustomer(customerId) {
    const confirmed = window.confirm(`Delete customer ${customerId}?`);
    if (!confirmed) return;

    setCustomerMessage("");
    setCustomerError("");

    try {
      const response = await fetch(`${gatewayUrl}/customer/customers/${customerId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not delete customer.");
      }
      if (formData.customer_id === customerId) {
        resetForm();
      }
      setCustomerMessage("Customer deleted successfully.");
      await loadCustomers();
    } catch (error) {
      setCustomerError(error.message);
    }
  }

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Customer Service</p>
          <h3>Manage Customers</h3>
        </div>
        <div className="customer-header-actions">
          <button type="button" className="secondary-button subtle" onClick={loadCustomers}>
            Refresh List
          </button>
          <button type="button" className="secondary-button" onClick={handleCreateClick}>
            {showCreateForm && !isEditing ? "Close Create" : "Create Customer"}
          </button>
        </div>
      </div>

      {(showCreateForm || isEditing) ? (
        <form className="customer-form expanded" onSubmit={handleSubmit}>
          <h4>{isEditing ? "Update Customer" : "Create Customer"}</h4>

          <div className="customer-form-grid">
            <label>
              Customer ID
              <input
                name="customer_id"
                value={formData.customer_id}
                onChange={handleInputChange}
                disabled={isEditing}
                required
              />
            </label>
            <label>
              Name
              <input name="name" value={formData.name} onChange={handleInputChange} required />
            </label>
            <label>
              Email
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
            </label>
            <label>
              Phone
              <input name="phone" value={formData.phone} onChange={handleInputChange} />
            </label>
          </div>

          <label>
            Address
            <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3" />
          </label>

          <div className="form-actions">
            <button type="submit" className="secondary-button" disabled={savingCustomer}>
              {savingCustomer ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button type="button" className="secondary-button subtle" onClick={resetForm}>
              Cancel
            </button>
          </div>

          {customerMessage ? <p className="form-message success">{customerMessage}</p> : null}
          {customerError ? <p className="form-message error">{customerError}</p> : null}
        </form>
      ) : null}

      {!showCreateForm && !isEditing && customerMessage ? (
        <p className="form-message success standalone">{customerMessage}</p>
      ) : null}
      {!showCreateForm && !isEditing && customerError ? (
        <p className="form-message error standalone">{customerError}</p>
      ) : null}

      <div className="customer-list-panel table-panel">
        <h4>Customers List</h4>
        {loadingCustomers ? <p className="state-message">Loading customers...</p> : null}
        {!loadingCustomers && customers.length === 0 ? (
          <p className="state-message">No customers found.</p>
        ) : null}

        {customers.length > 0 ? (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id || customer.customer_id}>
                    <td>{customer.customer_id}</td>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone || "-"}</td>
                    <td>{customer.address || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="secondary-button subtle" onClick={() => handleEditCustomer(customer)}>
                          Edit
                        </button>
                        <button type="button" className="secondary-button danger" onClick={() => handleDeleteCustomer(customer.customer_id)}>
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

export default CustomerPage;

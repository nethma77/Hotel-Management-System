import { useEffect, useState } from "react";

const emptyReviewForm = {
  user_id: "",
  rating: "",
  comment: "",
};

function ReviewPage({ gatewayUrl }) {
  const [reviews, setReviews] = useState([]);
  const [formData, setFormData] = useState(emptyReviewForm);
  const [editingReviewId, setEditingReviewId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  const isEditing = Boolean(editingReviewId);

  async function loadReviews() {
    try {
      setLoadingReviews(true);
      const response = await fetch(`${gatewayUrl}/review/reviews`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load reviews.");
      }
      setReviews(data);
      setReviewError("");
    } catch (error) {
      setReviewError(error.message);
    } finally {
      setLoadingReviews(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [gatewayUrl]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function resetReviewForm() {
    setFormData(emptyReviewForm);
    setEditingReviewId("");
    setShowCreateForm(false);
  }

  function handleCreateClick() {
    setFormData(emptyReviewForm);
    setEditingReviewId("");
    setShowCreateForm((current) => !current);
    setReviewMessage("");
    setReviewError("");
  }

  function handleEditReview(review) {
    setFormData({
      user_id: review.user_id || "",
      rating: String(review.rating ?? ""),
      comment: review.comment || "",
    });
    setEditingReviewId(review._id);
    setShowCreateForm(true);
    setReviewMessage("");
    setReviewError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingReview(true);
    setReviewMessage("");
    setReviewError("");

    const payload = {
      user_id: formData.user_id.trim(),
      rating: Number(formData.rating),
      comment: formData.comment.trim(),
    };

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${gatewayUrl}/review/reviews/${editingReviewId}`
      : `${gatewayUrl}/review/reviews`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Review request failed.");
      }
      setReviewMessage(isEditing ? "Review updated successfully." : "Review created successfully.");
      resetReviewForm();
      await loadReviews();
    } catch (error) {
      setReviewError(error.message);
    } finally {
      setSavingReview(false);
    }
  }

  async function handleDeleteReview(reviewId) {
    const confirmed = window.confirm("Delete this review?");
    if (!confirmed) return;

    setReviewMessage("");
    setReviewError("");

    try {
      const response = await fetch(`${gatewayUrl}/review/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not delete review.");
      }
      if (editingReviewId === reviewId) {
        resetReviewForm();
      }
      setReviewMessage("Review deleted successfully.");
      await loadReviews();
    } catch (error) {
      setReviewError(error.message);
    }
  }

  return (
    <section className="customer-panel">
      <div className="customer-panel-header">
        <div>
          <p className="section-label">Review Service</p>
          <h3>Manage Reviews</h3>
        </div>
        <div className="customer-header-actions">
          <button type="button" className="secondary-button subtle" onClick={loadReviews}>
            Refresh List
          </button>
          <button type="button" className="secondary-button" onClick={handleCreateClick}>
            {showCreateForm && !isEditing ? "Close Create" : "Create Review"}
          </button>
        </div>
      </div>

      {(showCreateForm || isEditing) ? (
        <form className="customer-form expanded" onSubmit={handleSubmit}>
          <h4>{isEditing ? "Update Review" : "Create Review"}</h4>

          <div className="customer-form-grid">
            <label>
              User ID
              <input name="user_id" value={formData.user_id} onChange={handleInputChange} required />
            </label>
            <label>
              Rating
              <input type="number" min="1" max="5" name="rating" value={formData.rating} onChange={handleInputChange} required />
            </label>
          </div>

          <label>
            Comment
            <textarea name="comment" value={formData.comment} onChange={handleInputChange} rows="3" required />
          </label>

          <div className="form-actions">
            <button type="submit" className="secondary-button" disabled={savingReview}>
              {savingReview ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button type="button" className="secondary-button subtle" onClick={resetReviewForm}>
              Cancel
            </button>
          </div>

          {reviewMessage ? <p className="form-message success">{reviewMessage}</p> : null}
          {reviewError ? <p className="form-message error">{reviewError}</p> : null}
        </form>
      ) : null}

      {!showCreateForm && !isEditing && reviewMessage ? (
        <p className="form-message success standalone">{reviewMessage}</p>
      ) : null}
      {!showCreateForm && !isEditing && reviewError ? (
        <p className="form-message error standalone">{reviewError}</p>
      ) : null}

      <div className="customer-list-panel table-panel">
        <h4>Reviews List</h4>
        {loadingReviews ? <p className="state-message">Loading reviews...</p> : null}
        {!loadingReviews && reviews.length === 0 ? <p className="state-message">No reviews found.</p> : null}

        {reviews.length > 0 ? (
          <div className="table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td>{review.user_id}</td>
                    <td>{review.rating}</td>
                    <td>{review.comment}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="secondary-button subtle" onClick={() => handleEditReview(review)}>
                          Edit
                        </button>
                        <button type="button" className="secondary-button danger" onClick={() => handleDeleteReview(review._id)}>
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

export default ReviewPage;

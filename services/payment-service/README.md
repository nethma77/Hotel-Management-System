## Payment Service (Hotel Management System)

This microservice handles payment creation and payment status for bookings.

### Tech Stack
- Backend: Python + FastAPI
- Database: MongoDB

### Configuration
1. Ensure MongoDB is running.
2. Update the environment variables in `.env`:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `PAYMENT_SERVICE_PORT` (optional; if you use it in your run command)

> Note: `.env` is ignored by git (see `.gitignore`).

### Install Dependencies
From this folder (`services/payment-service`):
```bash
pip install -r requirements.txt
```

### Run the Service
```bash
python -m uvicorn main:app --reload --port 8003
```

### Swagger / OpenAPI
- Swagger UI: `http://127.0.0.1:8003/docs`
- Health check (service): `http://127.0.0.1:8003/`
- Mongo connection is logged on startup (connected or failed).

### Endpoints (use in Postman)
Base URL: `http://127.0.0.1:8003`

1. `GET /payments/health/check`
2. `POST /payments`
   - Body: `booking_id`, `customer_id`, `amount`, `currency` (optional), `method` (optional)
3. `GET /payments/{payment_id}`
4. `GET /payments/booking/{booking_id}`
5. `PATCH /payments/{payment_id}/status`
   - Body: `status` (PENDING|SUCCESS|FAILED|REFUNDED), optional `transaction_ref`
6. `POST /payments/{payment_id}/refund`
   - Body: optional `reason`

### Example Postman Headers
- `Content-Type: application/json`

### Example `POST /payments` body
```json
{
  "booking_id": "BOOK-1001",
  "customer_id": "CUS-2001",
  "amount": 35000.0,
  "currency": "LKR",
  "method": "CARD"
}
```


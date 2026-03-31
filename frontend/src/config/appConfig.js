export const gatewayBaseUrl =
  import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8000";

export const serviceMeta = {
  dashboard: {
    label: "Dashboard",
    description: "System overview and current service health.",
  },
  booking: {
    label: "Booking Service",
    description: "Handles reservations and booking workflows.",
  },
  payment: {
    label: "Payment Service",
    description: "Processes transactions and payment activities.",
  },
  review: {
    label: "Review Service",
    description: "Manages hotel reviews and guest feedback.",
  },
  "service-request": {
    label: "Service Request Service",
    description: "Tracks guest requests and fulfillment updates.",
  },
  customer: {
    label: "Customer Service",
    description: "Stores and serves customer information.",
  },
  room: {
    label: "Room Service",
    description: "Maintains room availability and room records.",
  },
};

export const servicePages = {
  booking: {
    title: "Booking Service",
    summary: "Manage reservations, booking records, and booking updates.",
    endpoints: [
      "GET /booking/booking/bookings",
      "POST /booking/booking/bookings",
      "GET /booking/booking/bookings/{booking_id}",
      "PUT /booking/booking/bookings/{booking_id}",
      "DELETE /booking/booking/bookings/{user_id}",
    ],
  },
  payment: {
    title: "Payment Service",
    summary: "Track payment creation, status updates, and refund operations.",
    endpoints: [
      "POST /payment/payments",
      "GET /payment/payments/booking/{booking_id}",
      "GET /payment/payments/{payment_id}",
      "PATCH /payment/payments/{payment_id}/status",
      "POST /payment/payments/{payment_id}/refund",
      "GET /payment/payments/health/check",
    ],
  },
  review: {
    title: "Review Service",
    summary: "Handle guest reviews, updates, and deletion of feedback items.",
    endpoints: [
      "GET /review/reviews",
      "POST /review/reviews",
      "GET /review/reviews/{review_id}",
      "PUT /review/reviews/{review_id}",
      "DELETE /review/reviews/{review_id}",
    ],
  },
  customer: {
    title: "Customer Service",
    summary: "Maintain customer records and perform full CRUD operations.",
    endpoints: [
      "GET /customer/customers",
      "POST /customer/customers",
      "GET /customer/customers/{customer_id}",
      "PUT /customer/customers/{customer_id}",
      "DELETE /customer/customers/{customer_id}",
    ],
  },
  room: {
    title: "Room Service",
    summary: "Manage room inventory, availability, and room detail updates.",
    endpoints: [
      "GET /room/rooms",
      "POST /room/rooms",
      "PATCH /room/rooms/{room_number}",
      "GET /room/rooms/check/{room_number}",
      "DELETE /room/rooms/{room_number}",
    ],
  },
  "service-request": {
    title: "Service Request Service",
    summary: "Monitor and manage guest service requests across rooms.",
    endpoints: [
      "GET /service-request/service-requests",
      "POST /service-request/service-requests",
      "GET /service-request/service-requests/{request_id}",
      "PUT /service-request/service-requests/{request_id}",
      "DELETE /service-request/service-requests/{request_id}",
    ],
  },
};

export const sectionPaths = {
  dashboard: "/dashboard",
  customer: "/customers",
  booking: "/bookings",
  payment: "/payments",
  room: "/rooms",
  review: "/reviews",
  "service-request": "/service-requests",
};

export const fallbackServices = Object.entries(serviceMeta)
  .filter(([key]) => key !== "dashboard")
  .map(([key, value]) => ({
    name: key,
    label: value.label,
    description: value.description,
    url: "Unavailable",
    status: "offline",
    status_code: null,
  }));

export function formatServiceName(name) {
  return serviceMeta[name]?.label
    || name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
}

export function getSectionFromPath(pathname) {
  if (pathname === "/" || pathname === "/dashboard") {
    return "dashboard";
  }
  if (pathname.startsWith("/payments/checkout/")) {
    return "payment-checkout";
  }
  return (
    Object.entries(sectionPaths).find(([, path]) => pathname === path)?.[0]
    || "dashboard"
  );
}

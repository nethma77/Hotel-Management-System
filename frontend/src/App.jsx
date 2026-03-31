import { useMemo, useState } from 'react'

const DEFAULT_API_BASE = 'http://localhost:8000'

const steps = [
  { id: 'guest', label: 'Guest', title: 'Guest profile', blurb: 'Create a guest profile for the stay.' },
  { id: 'room', label: 'Room', title: 'Choose room', blurb: 'Load rooms, inspect availability, and select one room.' },
  { id: 'booking', label: 'Booking', title: 'Confirm booking', blurb: 'Use the selected guest and room to create the booking.' },
  { id: 'payment', label: 'Payment', title: 'Pay for stay', blurb: 'Create a payment for the current booking.' },
  { id: 'service', label: 'Service', title: 'During-stay requests', blurb: 'Simulate housekeeping or guest support requests.' },
  { id: 'review', label: 'Review', title: 'Post-stay review', blurb: 'Capture the guest review at the end of the journey.' },
]

const endpointGuide = [
  '/customer/customers',
  '/room/rooms',
  '/room/rooms/check/{room_number}',
  '/booking/booking/bookings',
  '/payment/payments',
  '/service-request/service-requests',
  '/review/reviews',
]

const initialState = {
  guest: {
    customer_id: 'CUS-001',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '0771234567',
    address: 'Colombo',
  },
  stay: {
    room_number: '101',
    check_in: '2026-04-10',
    check_out: '2026-04-12',
    total_price: '25000',
  },
  payment: {
    booking_id: 'BOOK-001',
    customer_id: 'CUS-001',
    amount: '25000',
    currency: 'LKR',
    method: 'CASH',
  },
  service: {
    request_type: 'Housekeeping',
    description: 'Need fresh towels',
    status: 'Pending',
  },
  review: {
    rating: '5',
    comment: 'Great stay',
  },
}

function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
  const [currentStep, setCurrentStep] = useState('guest')
  const [forms, setForms] = useState(initialState)
  const [status, setStatus] = useState({})
  const [results, setResults] = useState({})
  const [context, setContext] = useState({
    selectedRoom: null,
    guest: null,
    booking: null,
    payment: null,
    serviceRequest: null,
    review: null,
  })

  const activeStep = useMemo(
    () => steps.find((step) => step.id === currentStep) || steps[0],
    [currentStep],
  )

  const updateForm = (section, field, value) => {
    setForms((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
  }

  const setSectionStatus = (key, nextStatus) => {
    setStatus((current) => ({ ...current, [key]: nextStatus }))
  }

  const setSectionResult = (key, data) => {
    setResults((current) => ({ ...current, [key]: data }))
  }

  const request = async (key, path, options = {}) => {
    setSectionStatus(key, { type: 'loading', message: 'Request in progress...' })

    try {
      const response = await fetch(`${apiBase}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      })

      const text = await response.text()
      let data

      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }

      if (!response.ok) {
        throw new Error(
          typeof data === 'string'
            ? data
            : data?.detail || data?.message || `Request failed with ${response.status}`,
        )
      }

      setSectionResult(key, data)
      setSectionStatus(key, { type: 'success', message: `Success: ${response.status}` })
      return data
    } catch (error) {
      setSectionStatus(key, {
        type: 'error',
        message: error.message || 'Something went wrong.',
      })
      throw error
    }
  }

  const goNext = () => {
    const index = steps.findIndex((step) => step.id === currentStep)
    if (index < steps.length - 1) {
      setCurrentStep(steps[index + 1].id)
    }
  }

  const handleCreateGuest = async (event) => {
    event.preventDefault()
    const guest = await request('guestCreate', '/customer/customers', {
      method: 'POST',
      body: JSON.stringify(forms.guest),
    })

    setContext((current) => ({
      ...current,
      guest: {
        customer_id: guest.customer_id || forms.guest.customer_id,
        name: forms.guest.name,
        email: forms.guest.email,
      },
    }))
    setForms((current) => ({
      ...current,
      payment: {
        ...current.payment,
        customer_id: guest.customer_id || forms.guest.customer_id,
      },
    }))
    setCurrentStep('room')
  }

  const handleLoadRooms = async () => {
    const rooms = await request('roomList', '/room/rooms')
    const firstAvailable = Array.isArray(rooms)
      ? rooms.find((room) => room.is_available)
      : null

    if (firstAvailable?.room_number) {
      setForms((current) => ({
        ...current,
        stay: {
          ...current.stay,
          room_number: String(firstAvailable.room_number),
          total_price:
            current.stay.total_price || String(firstAvailable.price || current.stay.total_price),
        },
      }))
    }
  }

  const handleCheckRoom = async () => {
    const roomNumber = forms.stay.room_number
    const availability = await request(
      'roomCheck',
      `/room/rooms/check/${encodeURIComponent(roomNumber)}`,
    )

    setContext((current) => ({
      ...current,
      selectedRoom: {
        room_number: roomNumber,
        is_available: availability?.is_available,
      },
    }))
  }

  const handleSelectRoom = (room) => {
    setContext((current) => ({
      ...current,
      selectedRoom: room,
    }))

    setForms((current) => ({
      ...current,
      stay: {
        ...current.stay,
        room_number: String(room.room_number),
        total_price: String(room.price ?? current.stay.total_price),
      },
    }))
  }

  const handleCreateBooking = async (event) => {
    event.preventDefault()

    const bookingResult = await request('bookingCreate', '/booking/booking/bookings', {
      method: 'POST',
      body: JSON.stringify({
        user_id: forms.guest.customer_id,
        room_id: forms.stay.room_number,
        check_in: forms.stay.check_in,
        check_out: forms.stay.check_out,
        total_price: Number(forms.stay.total_price),
      }),
    })

    const booking = bookingResult?.booking || null

    setContext((current) => ({
      ...current,
      booking,
    }))
    setForms((current) => ({
      ...current,
      payment: {
        ...current.payment,
        booking_id: booking?._id || current.payment.booking_id,
        customer_id: forms.guest.customer_id,
        amount: current.payment.amount || current.stay.total_price,
      },
    }))
    setCurrentStep('payment')
  }

  const handleCreatePayment = async (event) => {
    event.preventDefault()

    const payment = await request('paymentCreate', '/payment/payments', {
      method: 'POST',
      body: JSON.stringify({
        ...forms.payment,
        amount: Number(forms.payment.amount),
      }),
    })

    setContext((current) => ({
      ...current,
      payment,
    }))
    setCurrentStep('service')
  }

  const handleCreateServiceRequest = async (event) => {
    event.preventDefault()

    const serviceRequest = await request('serviceRequestCreate', '/service-request/service-requests', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: forms.guest.customer_id,
        customer_name: forms.guest.name,
        room_number: Number(forms.stay.room_number),
        request_type: forms.service.request_type,
        description: forms.service.description,
        status: forms.service.status,
      }),
    })

    setContext((current) => ({
      ...current,
      serviceRequest,
    }))
    setCurrentStep('review')
  }

  const handleCreateReview = async (event) => {
    event.preventDefault()

    const review = await request('reviewCreate', '/review/reviews', {
      method: 'POST',
      body: JSON.stringify({
        user_id: forms.guest.customer_id,
        rating: Number(forms.review.rating),
        comment: forms.review.comment,
      }),
    })

    setContext((current) => ({
      ...current,
      review,
    }))
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Hotel management frontend</p>
          <h1>Real app-style guest journey</h1>
          <p className="hero-copy">
            This version behaves more like an actual product flow. It carries the guest,
            room, booking, payment, and stay context forward while still using the current
            backend contract through the API gateway.
          </p>
        </div>

        <div className="gateway-card">
          <label htmlFor="apiBase">API gateway</label>
          <input
            id="apiBase"
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
            placeholder="http://localhost:8000"
          />
          <div className="mini-list">
            {endpointGuide.map((item) => (
              <code key={item}>{item}</code>
            ))}
          </div>
        </div>
      </header>

      <section className="journey-layout">
        <aside className="sidebar">
          <div className="sidebar-card">
            <h2>Journey</h2>
            <div className="step-list">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep
                const isDone = steps.findIndex((entry) => entry.id === currentStep) > index
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`step-button ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <span className="step-number">0{index + 1}</span>
                    <span>
                      <strong>{step.title}</strong>
                      <small>{step.blurb}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sidebar-card">
            <h2>Live trip context</h2>
            <SummaryRow label="Guest" value={context.guest?.customer_id || 'Not created'} />
            <SummaryRow
              label="Room"
              value={context.selectedRoom?.room_number || forms.stay.room_number}
            />
            <SummaryRow label="Booking" value={context.booking?._id || 'Not created'} />
            <SummaryRow label="Payment" value={context.payment?.payment_id || 'Not created'} />
            <SummaryRow
              label="Service request"
              value={context.serviceRequest?.request_id || 'Not created'}
            />
            <SummaryRow label="Review" value={context.review?.id || 'Not created'} />
          </div>
        </aside>

        <main className="content-panel">
          <section className="feature-card">
            <div className="feature-head">
              <div>
                <p className="card-eyebrow">{activeStep.label}</p>
                <h2>{activeStep.title}</h2>
                <p>{activeStep.blurb}</p>
              </div>
              <div className="feature-actions">
                <button type="button" className="secondary" onClick={goNext}>
                  Skip to next
                </button>
              </div>
            </div>

            {currentStep === 'guest' && (
              <div className="feature-body">
                <form className="form-grid" onSubmit={handleCreateGuest}>
                  <Input
                    label="Customer ID"
                    value={forms.guest.customer_id}
                    onChange={(value) => updateForm('guest', 'customer_id', value)}
                  />
                  <Input
                    label="Full name"
                    value={forms.guest.name}
                    onChange={(value) => updateForm('guest', 'name', value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={forms.guest.email}
                    onChange={(value) => updateForm('guest', 'email', value)}
                  />
                  <Input
                    label="Phone"
                    value={forms.guest.phone}
                    onChange={(value) => updateForm('guest', 'phone', value)}
                  />
                  <Input
                    label="Address"
                    value={forms.guest.address}
                    onChange={(value) => updateForm('guest', 'address', value)}
                  />
                  <div className="actions">
                    <button type="submit">Create guest profile</button>
                  </div>
                </form>

                <StatusBar status={status.guestCreate} />
                <ResultPanel title="Guest response" data={results.guestCreate} />
              </div>
            )}

            {currentStep === 'room' && (
              <div className="feature-body">
                <div className="toolbar">
                  <button type="button" onClick={handleLoadRooms}>
                    Load rooms
                  </button>
                  <button type="button" className="secondary" onClick={handleCheckRoom}>
                    Check selected room
                  </button>
                </div>

                <form className="form-grid room-form" onSubmit={(event) => event.preventDefault()}>
                  <Input
                    label="Room number"
                    value={forms.stay.room_number}
                    onChange={(value) => updateForm('stay', 'room_number', value)}
                  />
                  <Input
                    label="Check in"
                    type="date"
                    value={forms.stay.check_in}
                    onChange={(value) => updateForm('stay', 'check_in', value)}
                  />
                  <Input
                    label="Check out"
                    type="date"
                    value={forms.stay.check_out}
                    onChange={(value) => updateForm('stay', 'check_out', value)}
                  />
                  <Input
                    label="Estimated total"
                    type="number"
                    value={forms.stay.total_price}
                    onChange={(value) => updateForm('stay', 'total_price', value)}
                  />
                </form>

                <StatusBar status={status.roomList || status.roomCheck} />

                <div className="room-grid">
                  {(Array.isArray(results.roomList) ? results.roomList : []).map((room) => (
                    <article
                      key={`${room.room_number}-${room._id || 'room'}`}
                      className={`room-card ${
                        String(room.room_number) === String(forms.stay.room_number) ? 'selected' : ''
                      }`}
                    >
                      <div>
                        <h3>Room {room.room_number}</h3>
                        <p>{room.room_type || 'Standard room'}</p>
                      </div>
                      <div className="room-meta">
                        <span>LKR {room.price ?? 'N/A'}</span>
                        <span className={room.is_available ? 'ok' : 'bad'}>
                          {room.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <button type="button" onClick={() => handleSelectRoom(room)}>
                        Use this room
                      </button>
                    </article>
                  ))}
                </div>

                <ResultPanel title="Room response" data={results.roomCheck || results.roomList} />
              </div>
            )}

            {currentStep === 'booking' && (
              <div className="feature-body">
                <div className="checkout-banner">
                  <InfoBadge label="Guest ID" value={forms.guest.customer_id} />
                  <InfoBadge label="Room" value={forms.stay.room_number} />
                  <InfoBadge label="Dates" value={`${forms.stay.check_in} to ${forms.stay.check_out}`} />
                  <InfoBadge label="Amount" value={`LKR ${forms.stay.total_price}`} />
                </div>

                <form className="form-grid" onSubmit={handleCreateBooking}>
                  <Input
                    label="Guest ID"
                    value={forms.guest.customer_id}
                    onChange={(value) => updateForm('guest', 'customer_id', value)}
                  />
                  <Input
                    label="Room ID"
                    value={forms.stay.room_number}
                    onChange={(value) => updateForm('stay', 'room_number', value)}
                  />
                  <Input
                    label="Check in"
                    type="date"
                    value={forms.stay.check_in}
                    onChange={(value) => updateForm('stay', 'check_in', value)}
                  />
                  <Input
                    label="Check out"
                    type="date"
                    value={forms.stay.check_out}
                    onChange={(value) => updateForm('stay', 'check_out', value)}
                  />
                  <Input
                    label="Total"
                    type="number"
                    value={forms.stay.total_price}
                    onChange={(value) => updateForm('stay', 'total_price', value)}
                  />
                  <div className="actions">
                    <button type="submit">Create booking</button>
                  </div>
                </form>

                <StatusBar status={status.bookingCreate} />
                <ResultPanel title="Booking response" data={results.bookingCreate} />
              </div>
            )}

            {currentStep === 'payment' && (
              <div className="feature-body">
                <div className="checkout-banner">
                  <InfoBadge label="Booking ID" value={forms.payment.booking_id} />
                  <InfoBadge label="Customer ID" value={forms.payment.customer_id} />
                  <InfoBadge label="Method" value={forms.payment.method} />
                </div>

                <form className="form-grid" onSubmit={handleCreatePayment}>
                  <Input
                    label="Booking ID"
                    value={forms.payment.booking_id}
                    onChange={(value) => updateForm('payment', 'booking_id', value)}
                  />
                  <Input
                    label="Customer ID"
                    value={forms.payment.customer_id}
                    onChange={(value) => updateForm('payment', 'customer_id', value)}
                  />
                  <Input
                    label="Amount"
                    type="number"
                    value={forms.payment.amount}
                    onChange={(value) => updateForm('payment', 'amount', value)}
                  />
                  <Input
                    label="Currency"
                    value={forms.payment.currency}
                    onChange={(value) => updateForm('payment', 'currency', value)}
                  />
                  <Select
                    label="Method"
                    value={forms.payment.method}
                    options={['CASH', 'BANK_TRANSFER', 'CARD']}
                    onChange={(value) => updateForm('payment', 'method', value)}
                  />
                  <div className="actions">
                    <button type="submit">Create payment</button>
                  </div>
                </form>

                <StatusBar status={status.paymentCreate} />
                <ResultPanel title="Payment response" data={results.paymentCreate} />
              </div>
            )}

            {currentStep === 'service' && (
              <div className="feature-body">
                <div className="checkout-banner">
                  <InfoBadge label="Guest" value={forms.guest.name} />
                  <InfoBadge label="Room" value={forms.stay.room_number} />
                  <InfoBadge label="Status" value={forms.service.status} />
                </div>

                <form className="form-grid" onSubmit={handleCreateServiceRequest}>
                  <Input
                    label="Request type"
                    value={forms.service.request_type}
                    onChange={(value) => updateForm('service', 'request_type', value)}
                  />
                  <Input
                    label="Status"
                    value={forms.service.status}
                    onChange={(value) => updateForm('service', 'status', value)}
                  />
                  <TextArea
                    label="Description"
                    value={forms.service.description}
                    onChange={(value) => updateForm('service', 'description', value)}
                  />
                  <div className="actions">
                    <button type="submit">Create service request</button>
                  </div>
                </form>

                <StatusBar status={status.serviceRequestCreate} />
                <ResultPanel title="Service request response" data={results.serviceRequestCreate} />
              </div>
            )}

            {currentStep === 'review' && (
              <div className="feature-body">
                <div className="checkout-banner">
                  <InfoBadge label="Guest ID" value={forms.guest.customer_id} />
                  <InfoBadge label="Booking" value={context.booking?._id || 'Current booking'} />
                  <InfoBadge label="Payment" value={context.payment?.status || 'Pending'} />
                </div>

                <form className="form-grid" onSubmit={handleCreateReview}>
                  <Input
                    label="Rating"
                    type="number"
                    value={forms.review.rating}
                    onChange={(value) => updateForm('review', 'rating', value)}
                  />
                  <TextArea
                    label="Review"
                    value={forms.review.comment}
                    onChange={(value) => updateForm('review', 'comment', value)}
                  />
                  <div className="actions">
                    <button type="submit">Submit review</button>
                  </div>
                </form>

                <StatusBar status={status.reviewCreate} />
                <ResultPanel title="Review response" data={results.reviewCreate} />
              </div>
            )}
          </section>
        </main>
      </section>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function InfoBadge({ label, value }) {
  return (
    <div className="info-badge">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Input({ label, type = 'text', value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="field field-full">
      <span>{label}</span>
      <textarea rows="4" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function StatusBar({ status }) {
  if (!status) {
    return null
  }

  return <div className={`status ${status.type}`}>{status.message}</div>
}

function ResultPanel({ title, data }) {
  return (
    <div className="result-panel">
      <div className="result-header">
        <strong>{title}</strong>
      </div>
      <pre>{data ? JSON.stringify(data, null, 2) : 'No response yet.'}</pre>
    </div>
  )
}

export default App

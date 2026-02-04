const express = require("express");
const { connect, StringCodec } = require("nats");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

const PORT = 3001;

let nc;
const sc = StringCodec();

// in-memory booking store
const bookings = new Map();

async function start() {
  nc = await connect({ servers: "nats://localhost:4222" });

  console.log(
    JSON.stringify({
      service: "booking-service",
      status: "connected-to-nats"
    })
  );

  // -------------------------------
  // EVENT LISTENERS 
  // -------------------------------

  // pricing completed
  (async () => {
    const sub = nc.subscribe("pricing.calculated");
    for await (const msg of sub) {
      const e = JSON.parse(sc.decode(msg.data));
      const b = bookings.get(e.bookingId);
      if (!b) continue;

      b.status = "PRICING_COMPLETED";
      b.basePrice = e.payload.basePrice;
      b.r1Applied = e.payload.r1Applied;

      console.log(
        JSON.stringify({
          service: "booking-service",
          event: "PRICING_COMPLETED",
          bookingId: e.bookingId,
          sagaId: e.sagaId
        })
      );
    }
  })();

  // discount reserved
  (async () => {
    const sub = nc.subscribe("discount.reserved");
    for await (const msg of sub) {
      const e = JSON.parse(sc.decode(msg.data));
      const b = bookings.get(e.bookingId);
      if (!b) continue;

      b.status = "DISCOUNT_RESERVED";

      console.log(
        JSON.stringify({
          service: "booking-service",
          event: "DISCOUNT_RESERVED",
          bookingId: e.bookingId,
          sagaId: e.sagaId
        })
      );
    }
  })();

  // payment completed
  (async () => {
    const sub = nc.subscribe("payment.completed");
    for await (const msg of sub) {
      const e = JSON.parse(sc.decode(msg.data));
      const b = bookings.get(e.bookingId);
      if (!b) continue;

      b.status = "PAYMENT_COMPLETED";

      console.log(
        JSON.stringify({
          service: "booking-service",
          event: "PAYMENT_COMPLETED",
          bookingId: e.bookingId,
          sagaId: e.sagaId
        })
      );
    }
  })();

  // booking confirmed
  (async () => {
    const sub = nc.subscribe("booking.confirmed");
    for await (const msg of sub) {
      const e = JSON.parse(sc.decode(msg.data));
      const b = bookings.get(e.bookingId);
      if (!b) continue;

      b.status = "BOOKING_CONFIRMED";
      b.referenceId = e.payload.referenceId;

      console.log(
        JSON.stringify({
          service: "booking-service",
          event: "BOOKING_CONFIRMED",
          bookingId: e.bookingId,
          sagaId: e.sagaId
        })
      );
    }
  })();

  // booking failed
  (async () => {
    const sub = nc.subscribe("booking.failed");
    for await (const msg of sub) {
      const e = JSON.parse(sc.decode(msg.data));
      const b = bookings.get(e.bookingId);
      if (!b) continue;

      b.status = "BOOKING_FAILED";
      b.error = e.reason;

      console.log(
        JSON.stringify({
          service: "booking-service",
          event: "BOOKING_FAILED",
          bookingId: e.bookingId,
          sagaId: e.sagaId,
          reason: e.reason
        })
      );
    }
  })();

  // -------------------------------
  // HTTP APIs
  // -------------------------------

  app.post("/bookings", async (req, res) => {
    const { name, gender, dob, services } = req.body;

    const bookingId = uuidv4();
    const sagaId = uuidv4();

    const booking = {
      bookingId,
      sagaId,
      name,
      gender,
      dob,
      services,
      status: "BOOKING_CREATED"
    };

    bookings.set(bookingId, booking);

    const event = {
      type: "BookingRequested",
      bookingId,
      sagaId,
      payload: booking
    };

    nc.publish("booking.requested", sc.encode(JSON.stringify(event)));

    console.log(
      JSON.stringify({
        service: "booking-service",
        event: "BookingRequested",
        bookingId,
        sagaId
      })
    );

    res.json({ bookingId, sagaId });
  });

  app.get("/bookings/:id", (req, res) => {
    const booking = bookings.get(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(booking);
  });

  app.listen(PORT, () => {
    console.log(
      JSON.stringify({
        service: "booking-service",
        status: "listening",
        port: PORT
      })
    );
  });
}

start();

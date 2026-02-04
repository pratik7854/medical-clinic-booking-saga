const { connect, StringCodec } = require("nats");

const sc = StringCodec();

// ----- CONFIG -----
const DAILY_LIMIT = 1;   // K = 1 for demo

// ----- In-memory quota store (for demo only) -----
let quota = {
  date: getTodayIST(),
  used: 0
};

// track which booking reserved quota
const reservations = new Map();

function getTodayIST() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return ist.toISOString().slice(0, 10);
}

function resetIfNewDay() {
  const today = getTodayIST();

  if (quota.date !== today) {
    quota = {
      date: today,
      used: 0
    };
  }
}

async function start() {
  const nc = await connect({ servers: "nats://localhost:4222" });

  console.log(
    JSON.stringify({
      service: "discount-service",
      status: "connected-to-nats"
    })
  );

  // ---- Listen pricing result ----
  const sub = nc.subscribe("pricing.calculated");

  (async () => {
    for await (const msg of sub) {
      const event = JSON.parse(sc.decode(msg.data));

      const { bookingId, sagaId, payload } = event;

      resetIfNewDay();

      // if R1 not applied → no quota needed
      if (!payload.r1Applied) {
        const outEvent = {
          type: "DiscountReserved",
          bookingId,
          sagaId,
          payload: {
            ...payload,
            discountApplied: false
          }
        };

        nc.publish(
          "discount.reserved",
          sc.encode(JSON.stringify(outEvent))
        );

        console.log(
          JSON.stringify({
            service: "discount-service",
            event: "DiscountSkipped",
            bookingId,
            sagaId
          })
        );

        continue;
      }

      // ---- R1 applied → check quota ----
      if (quota.used >= DAILY_LIMIT) {

        const failEvent = {
          type: "BookingFailed",
          bookingId,
          sagaId,
          reason: "Daily discount quota reached. Please try again tomorrow."
        };

        nc.publish(
          "booking.failed",
          sc.encode(JSON.stringify(failEvent))
        );

        console.log(
          JSON.stringify({
            service: "discount-service",
            event: "QuotaExceeded",
            bookingId,
            sagaId
          })
        );

        continue;
      }

      // ---- reserve quota ----
      quota.used++;
      reservations.set(bookingId, true);

      const outEvent = {
        type: "DiscountReserved",
        bookingId,
        sagaId,
        payload: {
          ...payload,
          discountApplied: true
        }
      };

      nc.publish(
        "discount.reserved",
        sc.encode(JSON.stringify(outEvent))
      );

      console.log(
        JSON.stringify({
          service: "discount-service",
          event: "DiscountReserved",
          bookingId,
          sagaId,
          used: quota.used
        })
      );
    }
  })();

  // ---- Compensation listener ----
  const failSub = nc.subscribe("booking.failed");

  (async () => {
    for await (const msg of failSub) {
      const event = JSON.parse(sc.decode(msg.data));

      const { bookingId, sagaId } = event;

      if (reservations.has(bookingId)) {
        reservations.delete(bookingId);
        quota.used--;

        if (quota.used < 0) quota.used = 0;

        console.log(
          JSON.stringify({
            service: "discount-service",
            event: "CompensationQuotaReleased",
            bookingId,
            sagaId,
            used: quota.used
          })
        );
      }
    }
  })();
}

start();

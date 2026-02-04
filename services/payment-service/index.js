const { connect, StringCodec } = require("nats");

const sc = StringCodec();

// for demo – set true when you want to force failure
const FAIL_PAYMENT = process.env.FAIL_PAYMENT === "true";

async function start() {
  const nc = await connect({ servers: "nats://localhost:4222" });

  console.log(
    JSON.stringify({
      service: "payment-service",
      status: "connected-to-nats"
    })
  );

  const sub = nc.subscribe("discount.reserved");

  for await (const msg of sub) {
    const event = JSON.parse(sc.decode(msg.data));

    const { bookingId, sagaId, payload } = event;

    console.log(
      JSON.stringify({
        service: "payment-service",
        event: "PaymentStarted",
        bookingId,
        sagaId
      })
    );

    // simulate delay
    await new Promise(r => setTimeout(r, 800));

    // simulate failure
    if (FAIL_PAYMENT) {
      const failEvent = {
        type: "BookingFailed",
        bookingId,
        sagaId,
        reason: "Payment service failed"
      };

      nc.publish(
        "booking.failed",
        sc.encode(JSON.stringify(failEvent))
      );

      console.log(
        JSON.stringify({
          service: "payment-service",
          event: "PaymentFailed",
          bookingId,
          sagaId
        })
      );

      continue;
    }

    // success
    const outEvent = {
      type: "PaymentCompleted",
      bookingId,
      sagaId,
      payload
    };

    nc.publish(
      "payment.completed",
      sc.encode(JSON.stringify(outEvent))
    );

    console.log(
      JSON.stringify({
        service: "payment-service",
        event: "PaymentCompleted",
        bookingId,
        sagaId
      })
    );
  }
}

start();

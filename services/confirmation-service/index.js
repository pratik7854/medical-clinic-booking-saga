const { connect, StringCodec } = require("nats");
const { v4: uuidv4 } = require("uuid");

const sc = StringCodec();

async function start() {
  const nc = await connect({ servers: "nats://localhost:4222" });

  console.log(
    JSON.stringify({
      service: "confirmation-service",
      status: "connected-to-nats"
    })
  );

  const sub = nc.subscribe("payment.completed");

  for await (const msg of sub) {
    const event = JSON.parse(sc.decode(msg.data));

    const { bookingId, sagaId, payload } = event;

    const referenceId = "REF-" + uuidv4().slice(0, 8);

    const outEvent = {
      type: "BookingConfirmed",
      bookingId,
      sagaId,
      payload: {
        ...payload,
        referenceId
      }
    };

    nc.publish(
      "booking.confirmed",
      sc.encode(JSON.stringify(outEvent))
    );

    console.log(
      JSON.stringify({
        service: "confirmation-service",
        event: "BookingConfirmed",
        bookingId,
        sagaId,
        referenceId
      })
    );
  }
}

start();

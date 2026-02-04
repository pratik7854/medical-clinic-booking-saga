const { connect, StringCodec } = require("nats");

const sc = StringCodec();

const SERVICE_CATALOG = {
  1: { name: "Blood Test", price: 400 },
  2: { name: "X-Ray", price: 500 },
  3: { name: "ECG", price: 300 }
};

function isTodayBirthday(dob) {
  const today = new Date();
  const d = new Date(dob);

  return (
    today.getDate() === d.getDate() &&
    today.getMonth() === d.getMonth()
  );
}

async function start() {
  const nc = await connect({ servers: "nats://localhost:4222" });

  console.log(
    JSON.stringify({
      service: "pricing-service",
      status: "connected-to-nats"
    })
  );

  const sub = nc.subscribe("booking.requested");

  for await (const msg of sub) {
    const event = JSON.parse(sc.decode(msg.data));

    const { bookingId, sagaId, payload } = event;

    let basePrice = 0;

    for (const s of payload.services) {
      if (SERVICE_CATALOG[s]) {
        basePrice += SERVICE_CATALOG[s].price;
      }
    }

    const femaleBirthday =
      payload.gender.toLowerCase() === "female" &&
      isTodayBirthday(payload.dob);

    const highValue = basePrice > 1000;

    const r1Applied = femaleBirthday || highValue;

    const pricingEvent = {
      type: "PricingCalculated",
      bookingId,
      sagaId,
      payload: {
        ...payload,
        basePrice,
        r1Applied
      }
    };

    nc.publish(
      "pricing.calculated",
      sc.encode(JSON.stringify(pricingEvent))
    );

    console.log(
      JSON.stringify({
        service: "pricing-service",
        event: "PricingCalculated",
        bookingId,
        sagaId,
        basePrice,
        r1Applied
      })
    );
  }
}

start();


const axios = require("axios");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
  const name = await ask("Enter name: ");
  const gender = await ask("Enter gender (male/female): ");
  const dob = await ask("Enter date of birth (YYYY-MM-DD): ");

  console.log("\nAvailable services:");
  console.log("1. Blood Test - 400");
  console.log("2. X-Ray - 500");
  console.log("3. ECG - 300");

  const servicesInput = await ask(
    "Select services (comma separated, example: 1,3): "
  );

  const services = servicesInput
    .split(",")
    .map(s => parseInt(s.trim()));

  console.log("\nSubmitting booking request...\n");

  const createRes = await axios.post(
    "http://localhost:3001/bookings",
    {
      name,
      gender,
      dob,
      services
    }
  );

  const bookingId = createRes.data.bookingId;

  console.log("Booking created. ID:", bookingId);
  console.log("Watching status...\n");

  let lastStatus = null;

  const timer = setInterval(async () => {
    try {
      const res = await axios.get(
        `http://localhost:3001/bookings/${bookingId}`
      );

      const b = res.data;

      if (b.status !== lastStatus) {
        console.log("STATUS →", b.status);
        lastStatus = b.status;
      }

      if (
        b.status === "BOOKING_CONFIRMED" ||
        b.status === "BOOKING_FAILED"
      ) {
        clearInterval(timer);

        console.log("\nFinal Result\n----------------");

        if (b.status === "BOOKING_CONFIRMED") {
          console.log("Booking confirmed");
          console.log("Reference ID:", b.referenceId);
          console.log("Base price:", b.basePrice);
        } else {
          console.log("Booking failed");
          console.log("Reason:", b.error);
        }

        rl.close();
      }

    } catch (err) {
      console.log("Error while checking status");
    }
  }, 800);
}

main();

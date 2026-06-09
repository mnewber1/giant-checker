const nodemailer = require("nodemailer");

const TARGET_URL =
  "https://www.georgiaaquarium.org/experience-tickets/?experienceId=938&prodSeasonIds=171819";
const TARGET_DATE = "10/17/2026";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function checkAvailability() {
  console.log(`[${new Date().toISOString()}] Starting check...`);

  const res = await fetch(TARGET_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
  });

  const html = await res.text();

  // Method 1: check experienceDates variable (swim-specific available dates)
  const datesMatch = html.match(/experienceDates\s*=\s*\("([^"]+)"\)/);
  if (datesMatch) {
    const dates = datesMatch[1].split(",");
    const isAvailable = dates.includes(TARGET_DATE);
    console.log(`experienceDates list found. Oct 17 available: ${isAvailable}`);
    console.log(`Available dates: ${dates.join(", ")}`);
    return isAvailable;
  }

  // Method 2: fallback — check traffic-data JSON for zonecount > 0
  const trafficMatch = html.match(/class="traffic-data"[^>]*>(\{.*?\})<\/div>/s);
  if (trafficMatch) {
    const trafficData = JSON.parse(trafficMatch[1]);
    const oct17 = trafficData.dates?.["2026-10-17"];
    if (oct17) {
      const available = oct17.zonecount > 0;
      console.log(`traffic-data found. Oct 17 zonecount: ${oct17.zonecount}, available: ${available}`);
      return available;
    }
  }

  throw new Error("Could not find availability data in page HTML");
}

async function sendEmail(available) {
  if (!available) {
    console.log("October 17 is NOT available. No email sent.");
    return;
  }

  console.log("October 17 IS available! Sending notification email...");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_USER,
    to: NOTIFY_EMAIL,
    subject: "🐋 Georgia Aquarium Oct 17 Swim Spot is OPEN!",
    html: `
      <h2>A spot opened up!</h2>
      <p>October 17 is now showing as available for the
      <strong>Journey with Gentle Giants – Swim</strong> experience.</p>
      <p><a href="${TARGET_URL}">Book it now →</a></p>
      <p><small>Checked at ${new Date().toISOString()}</small></p>
    `,
  });

  console.log(`Email sent to ${NOTIFY_EMAIL}`);
}

(async () => {
  try {
    const available = true;
    await sendEmail(available);
    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err.message);
    process.exit(1);
  }
})();

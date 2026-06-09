const { chromium } = require("playwright");
const nodemailer = require("nodemailer");

// ── Config ────────────────────────────────────────────────────────────────────
const TARGET_URL =
  "https://www.georgiaaquarium.org/experience-tickets/?experienceId=938&prodSeasonIds=171819";
const TARGET_MONTH = "October 2026";
const TARGET_DAY = "17";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL; // your address
const SMTP_USER = process.env.SMTP_USER;       // Gmail address used to send
const SMTP_PASS = process.env.SMTP_PASS;       // Gmail app password
// ─────────────────────────────────────────────────────────────────────────────

async function checkAvailability() {
  console.log(`[${new Date().toISOString()}] Starting check...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: load the page
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });

    // Step 2: click "Buy Now" on the experience-only (right) card
    // The right card says "Experience tickets only." — find its Buy Now link
    const buyNowBtn = page.locator(
      'text="Experience tickets only."'
    ).locator("..").locator('a:has-text("Buy Now")');
    await buyNowBtn.waitFor({ timeout: 15000 });
    await buyNowBtn.click();
    console.log("Clicked Buy Now on experience-only card");

    // Step 3: wait for "Things to Know" page, then click Continue To Tickets
    const continueBtn = page.locator('button:has-text("Continue To Tickets"), a:has-text("Continue To Tickets")');
    await continueBtn.waitFor({ timeout: 15000 });
    await continueBtn.click();
    console.log("Clicked Continue To Tickets");

    // Step 4: wait for calendar to appear
    await page.waitForSelector("text=Select Date", { timeout: 15000 });
    console.log("Calendar loaded");

    // Step 5: advance calendar until we see the target month
    let attempts = 0;
    while (attempts < 24) {
      // read current month label
      const monthLabel = await page.locator("text=" + TARGET_MONTH).count();
      if (monthLabel > 0) {
        console.log(`Found ${TARGET_MONTH}`);
        break;
      }
      // click the right arrow (next month)
      await page.locator('button[aria-label="Next month"], button:has-text("›"), svg[data-icon="chevron-right"]').first().click();
      await page.waitForTimeout(600);
      attempts++;
    }

    if (attempts >= 24) {
      throw new Error(`Could not navigate to ${TARGET_MONTH} after 24 attempts`);
    }

    // Step 6: find the cell for day 17 and check if it's available
    // Available days are clickable; sold-out days have a diagonal slash overlay
    // The calendar renders each day as a button or div with the day number text.
    // Sold-out cells typically carry a disabled attribute or a specific CSS class.
    const dayCells = page.locator(`[role="gridcell"], td, .day-cell, button`).filter({ hasText: new RegExp(`^${TARGET_DAY}$`) });
    const cellCount = await dayCells.count();
    console.log(`Found ${cellCount} element(s) matching day "${TARGET_DAY}"`);

    let isAvailable = false;

    for (let i = 0; i < cellCount; i++) {
      const cell = dayCells.nth(i);
      const isDisabled =
        (await cell.getAttribute("disabled")) !== null ||
        (await cell.getAttribute("aria-disabled")) === "true";
      const classAttr = (await cell.getAttribute("class")) || "";
      // grayed-out sold-out cells typically have classes like "disabled", "unavailable", "sold-out"
      const hasDisabledClass = /disabled|unavailable|sold.?out|strikethrough/i.test(classAttr);

      if (!isDisabled && !hasDisabledClass) {
        isAvailable = true;
        console.log(`Day ${TARGET_DAY} appears AVAILABLE (cell ${i})`);
        break;
      } else {
        console.log(`Day ${TARGET_DAY} cell ${i} is disabled. class="${classAttr}" disabled=${isDisabled}`);
      }
    }

    await browser.close();
    return isAvailable;

  } catch (err) {
    await browser.close();
    throw err;
  }
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
    const available = await checkAvailability();
    await sendEmail(available);
    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err.message);
    process.exit(1);
  }
})();

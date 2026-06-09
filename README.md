# Georgia Aquarium Availability Checker

Monitors the **Journey with Gentle Giants – Swim** experience for an open slot on **October 17, 2026** and emails you the moment one appears.

---

## Setup (5 minutes)

### 1. Create a GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `aquarium-checker` (private is fine)
3. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "init"
   git remote add origin https://github.com/YOUR_USERNAME/aquarium-checker.git
   git push -u origin main
   ```

---

### 2. Create a Gmail App Password

GitHub Actions needs to send email on your behalf. Do **not** use your real Gmail password — use an App Password instead:

1. Go to your Google Account → **Security** → **2-Step Verification** (must be enabled)
2. Scroll down to **App passwords**
3. Create one named "Aquarium Checker"
4. Copy the 16-character password it gives you

---

### 3. Add GitHub Secrets

In your repo on GitHub: **Settings → Secrets and variables → Actions → New repository secret**

Add these three:

| Secret name    | Value                                      |
|----------------|--------------------------------------------|
| `NOTIFY_EMAIL` | The email address to send alerts TO        |
| `SMTP_USER`    | Your Gmail address (used to send)          |
| `SMTP_PASS`    | The 16-char App Password from step 2       |

---

### 4. Enable Actions

Go to your repo → **Actions** tab → click **"I understand my workflows, go ahead and enable them"** if prompted.

The workflow will now run automatically every hour. You can also trigger it manually any time from the Actions tab by clicking **"Run workflow"**.

---

## How it works

1. Opens the aquarium ticket page in a headless browser
2. Clicks **Buy Now** on the experience-only swim card
3. Clicks **Continue To Tickets**
4. Advances the calendar to **October 2026**
5. Checks if the **17th** is clickable (not grayed out)
6. If available → sends you an email immediately
7. If not → logs it and exits silently

---

## Customizing

To check a different date, open `check.js` and change:
```js
const TARGET_DAY = "17";
```

To change the check frequency, edit `.github/workflows/check.yml`:
```yaml
- cron: "0 * * * *"   # every hour at :00
- cron: "*/15 * * * *" # every 15 min
- cron: "0 */2 * * *"  # every 2 hours
```

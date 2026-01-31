# Security Dashboard — New User Walkthrough

## 1) Access the app

- Open http://localhost:5173
- If you see a login screen or home page, the frontend is running.

## 2) Create an account

1. Click **Register**.
2. Enter a **username**, optional **email**, and **password**.
3. Submit the form and wait for the success message.

## 3) Sign in

1. Click **Sign in**.
2. Use **username or email** plus your password.
3. You should be redirected to **Dashboard** after login.

## 4) Add assets

1. Go to **Assets**.
2. Choose **Email** or **Domain**.
3. Enter a value and click **Add**.
4. Verify the asset appears in the list.

## 5) Run a scan

1. Go to **Scans**.
2. Select one or more assets.
3. Click **Start Scan**.
4. Check **My Scans** for the new scan.

## 6) View scan details and report

1. From **My Scans**, click **View** on a scan.
2. Review findings and severity.
3. Click **Download PDF** for a report.

## 7) Admin (if you are an admin)

1. Go to **Admin**.
2. Promote or demote users using the buttons.

## 8) Troubleshooting quick checks

- Backend health: http://localhost:8000/health should return {"status":"ok"}.
- Frontend should load without 404s on /login and /dashboard.
- If a page is blank, hard refresh (Ctrl+Shift+R).

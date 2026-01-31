from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

def build_scan_pdf(scan, findings):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 40, "Security Posture Scan Report")
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 60, f"Scan ID: {scan.id}")
    c.drawString(40, height - 75, f"Status: {scan.status}")
    c.drawString(40, height - 90, f"Score: {scan.score}")
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(40, height - 110, "Scope: This report contains public-only checks (DNS, public web endpoints, TLS, HIBP). No intrusive or authenticated scans were performed.")

    y = height - 120
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y, "Findings:")
    y -= 20
    c.setFont("Helvetica", 10)
    for f in findings:
        if y < 80:
            c.showPage()
            y = height - 80
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, f"[{f.severity.upper()}] {f.title}")
        y -= 14
        c.setFont("Helvetica", 9)
        evidence = str(f.evidence)
        rec = f.recommendation
        c.drawString(60, y, f"Evidence: {evidence}")
        y -= 12
        c.drawString(60, y, f"Recommendation: {rec}")
        y -= 18
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
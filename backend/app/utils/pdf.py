import textwrap
from datetime import timezone as _utc_tz
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO


def _localise(dt, tz_name: str):
    """Convert a naive UTC datetime to a timezone-aware one in tz_name."""
    if dt is None:
        return None
    try:
        from zoneinfo import ZoneInfo
        aware = dt.replace(tzinfo=_utc_tz.utc)
        return aware.astimezone(ZoneInfo(tz_name))
    except Exception:
        return dt.replace(tzinfo=_utc_tz.utc)

SEVERITY_DEDUCTIONS = {"critical": 25, "high": 15, "medium": 7, "low": 3}
SEVERITY_ORDER      = {"critical": 0, "high": 1, "medium": 2, "low": 3}
TYPE_LABELS         = {"email": "Email", "domain": "Domain", "url": "URL", "ipv4": "IP"}


def _compute_asset_score(findings):
    score = 100
    for f in findings:
        sev      = getattr(f, "severity", None)
        evidence = getattr(f, "evidence", {}) or {}
        if isinstance(evidence, dict) and evidence.get("scoring_impact") == "none":
            continue
        score -= SEVERITY_DEDUCTIONS.get(sev or "", 0)
    return max(0, score)


def _wrap(text, max_chars=88):
    return textwrap.wrap(str(text), max_chars) or [""]


def _draw_wrapped(c, x, y, text, font, size, max_chars=85, lh=11, height=792):
    c.setFont(font, size)
    for line in _wrap(text, max_chars):
        if y < 70:
            c.showPage()
            y = height - 60
            c.setFont(font, size)
        c.drawString(x, y, line)
        y -= lh
    return y


def _new_page_if_needed(c, y, needed, height):
    if y < needed:
        c.showPage()
        return height - 60
    return y


def build_scan_pdf(scan, findings, assets=None, user_tz: str = None):
    buffer  = BytesIO()
    c       = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    assets  = assets or []

    # ── lookup helpers ────────────────────────────────────────────────────
    asset_map = {a.id: a for a in assets}

    # group findings by asset_id, sorted by severity inside each group
    findings_by_asset: dict = {}
    for f in findings:
        aid = getattr(f, "asset_id", None)
        findings_by_asset.setdefault(aid, []).append(f)
    for aid in findings_by_asset:
        findings_by_asset[aid].sort(
            key=lambda f: SEVERITY_ORDER.get(getattr(f, "severity", "low"), 3)
        )

    # ordered list of asset IDs (scan order first, then any extras from findings)
    all_asset_ids = list(scan.asset_ids or [])
    for aid in findings_by_asset:
        if aid and aid not in all_asset_ids:
            all_asset_ids.append(aid)

    # ── PAGE 1: Header ────────────────────────────────────────────────────
    y = height - 45
    c.setFont("Helvetica-Bold", 17)
    c.drawString(40, y, "Security Posture Scan Report")
    y -= 22
    c.setLineWidth(0.5)
    c.line(40, y, width - 40, y)
    y -= 16

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Scan ID:   {scan.id}")
    y -= 14
    c.drawString(40, y, f"Status:    {scan.status}")
    y -= 14

    c.setFont("Helvetica-Bold", 11)
    score_txt = f"Overall Score:  {scan.score}/100" if scan.score is not None else "Overall Score:  N/A"
    c.drawString(40, y, score_txt)
    y -= 14

    if getattr(scan, "completed_at", None):
        c.setFont("Helvetica", 10)
        if user_tz:
            local_dt = _localise(scan.completed_at, user_tz)
            tz_label = local_dt.strftime("%Z") if local_dt.tzinfo else "UTC"
            ts_str = local_dt.strftime(f"%d %b %Y  %H:%M {tz_label}")
        else:
            ts_str = scan.completed_at.strftime("%d %b %Y  %H:%M UTC")
        c.drawString(40, y, f"Completed: {ts_str}")
        y -= 14

    y -= 4
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(
        40, y,
        "Scope: Public-only checks (DNS, TLS, web headers, HIBP).  "
        "No intrusive or authenticated scans were performed."
    )
    y -= 20
    c.line(40, y, width - 40, y)
    y -= 16

    # ── Asset summary table ───────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, "Asset Summary")
    y -= 14

    # column header
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50,  y, "Asset")
    c.drawString(330, y, "Score")
    c.drawString(385, y, "Crit")
    c.drawString(420, y, "High")
    c.drawString(455, y, "Med")
    c.drawString(490, y, "Low")
    y -= 4
    c.line(50, y, width - 40, y)
    y -= 11

    for aid in all_asset_ids:
        y = _new_page_if_needed(c, y, 70, height)
        asset  = asset_map.get(aid)
        atype  = TYPE_LABELS.get(getattr(asset, "type", ""), getattr(asset, "type", "")) if asset else ""
        aval   = getattr(asset, "value", aid) if asset else aid
        label  = f"{atype}: {aval}" if atype else aval

        afinds = findings_by_asset.get(aid, [])
        ascore = _compute_asset_score(afinds)
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for f in afinds:
            sev = getattr(f, "severity", "")
            if sev in counts:
                counts[sev] += 1

        disp = label if len(label) <= 48 else label[:45] + "…"
        c.setFont("Helvetica", 9)
        c.drawString(50,  y, disp)
        c.drawString(330, y, f"{ascore}/100")
        c.drawString(385, y, str(counts["critical"]))
        c.drawString(420, y, str(counts["high"]))
        c.drawString(455, y, str(counts["medium"]))
        c.drawString(490, y, str(counts["low"]))
        y -= 13

    y -= 6
    c.line(40, y, width - 40, y)
    y -= 20

    # ── Per-asset findings ────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 12)
    y = _new_page_if_needed(c, y, 60, height)
    c.drawString(40, y, "Findings by Asset")
    y -= 18

    sev_colors = {
        "CRITICAL": (0.78, 0.10, 0.10),
        "HIGH":     (0.88, 0.38, 0.00),
        "MEDIUM":   (0.82, 0.65, 0.00),
        "LOW":      (0.40, 0.40, 0.40),
    }

    for idx, aid in enumerate(all_asset_ids, 1):
        asset  = asset_map.get(aid)
        atype  = TYPE_LABELS.get(getattr(asset, "type", ""), getattr(asset, "type", "")) if asset else ""
        aval   = getattr(asset, "value", aid) if asset else aid
        label  = f"{atype}: {aval}" if atype else aval

        afinds = findings_by_asset.get(aid, [])
        ascore = _compute_asset_score(afinds)

        y = _new_page_if_needed(c, y, 80, height)

        # coloured asset section header bar
        c.setFillColorRGB(0.11, 0.22, 0.50)
        c.rect(40, y - 4, width - 80, 16, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(46, y, f"{idx}.  {label}")
        c.drawString(width - 110, y, f"Score: {ascore}/100")
        c.setFillColorRGB(0, 0, 0)
        y -= 20

        if not afinds:
            c.setFont("Helvetica-Oblique", 9)
            c.drawString(56, y, "No issues found for this asset.")
            y -= 20
            continue

        for f in afinds:
            y = _new_page_if_needed(c, y, 80, height)

            sev   = (getattr(f, "severity", "") or "").upper()
            title = getattr(f, "title", "")
            evidence = getattr(f, "evidence", {}) or {}
            rec      = getattr(f, "recommendation", "")

            # severity badge
            rgb = sev_colors.get(sev, (0.4, 0.4, 0.4))
            c.setFillColorRGB(*rgb)
            c.rect(56, y - 3, 50, 12, fill=1, stroke=0)
            c.setFillColorRGB(1, 1, 1)
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(81, y, sev)
            c.setFillColorRGB(0, 0, 0)

            # title
            c.setFont("Helvetica-Bold", 10)
            c.drawString(114, y, title)
            y -= 14

            # evidence (skip internal keys)
            if isinstance(evidence, dict):
                ev_str = ",  ".join(
                    f"{k}: {v}" for k, v in evidence.items()
                    if k not in ("scoring_impact",)
                )
            else:
                ev_str = str(evidence)

            c.setFont("Helvetica-Bold", 8)
            c.drawString(64, y, "Evidence:")
            y = _draw_wrapped(c, 122, y, ev_str or "—", "Helvetica", 8,
                              max_chars=78, lh=11, height=height)

            y = _new_page_if_needed(c, y, 50, height)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(64, y, "Recommendation:")
            y = _draw_wrapped(c, 162, y, rec or "—", "Helvetica", 8,
                              max_chars=73, lh=11, height=height)
            y -= 8          # gap between findings

        y -= 8              # gap between asset sections

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()

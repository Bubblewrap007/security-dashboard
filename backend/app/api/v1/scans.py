from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from ...services.scanner import score_from_findings
from ...models.scan import ScanBase
from ...repositories.scans import ScanRepository
from ...repositories.findings import FindingRepository
from ...tasks.scan_worker import perform_scan
from ...core.security import decode_access_token
from rq import Queue
from redis import Redis
import os
import asyncio

router = APIRouter(prefix="/api/v1/scans", tags=["scans"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

async def get_current_user_id(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return str(payload.get("sub"))

from ...repositories.audit import AuditRepository

@router.post("", status_code=201)
async def start_scan(payload: ScanBase, user_id: str = Depends(get_current_user_id)):
    scan_repo = ScanRepository()
    scan = await scan_repo.create(user_id, payload)
    # audit: scan created/queued
    await AuditRepository().create_event(actor_id=user_id, action="start_scan", target_type="scan", target_id=scan.id, details={"asset_ids": scan.asset_ids})
    # enqueue job to worker using run_in_executor to avoid blocking the async event loop
    try:
        import warnings
        scan_id_to_enqueue = scan.id

        def _enqueue():
            r = Redis.from_url(REDIS_URL, socket_connect_timeout=5, socket_timeout=5)
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", message=".*resolve_connection.*", category=DeprecationWarning)
                q = Queue(connection=r)
                q.enqueue("app.tasks.scan_worker.perform_scan", scan_id_to_enqueue)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _enqueue)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Redis unavailable, running scan in-process: %s", str(e))
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, perform_scan, scan.id)
    return {"scan_id": scan.id, "status": scan.status}

# NOTE: specific routes (no path parameters) must be defined BEFORE parameterized routes
# like /{scan_id}, otherwise they will be shadowed and never matched.

@router.get("")
async def list_scans(user_id: str = Depends(get_current_user_id)):
    scan_repo = ScanRepository()
    scans = await scan_repo.list_by_user(user_id)
    return [s.model_dump() for s in scans]

@router.get("/email-breach-usage")
async def get_email_breach_usage(user_id: str = Depends(get_current_user_id)):
    """Return the user's current daily email breach usage and limit."""
    from ...repositories.users import UserRepository
    user_repo = UserRepository()
    usage_count, usage_date = await user_repo.get_email_breach_usage(user_id)
    limit = int(os.getenv("HIBP_DAILY_LIMIT", "2"))
    today = usage_date
    return {"count": usage_count, "limit": limit, "date": today}

@router.get("/{scan_id}")
async def get_scan(scan_id: str, user_id: str = Depends(get_current_user_id)):
    scan_repo = ScanRepository()
    scan = await scan_repo.get(scan_id)
    from ...repositories.users import UserRepository
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    # allow owner only (superuser checks are not used in tests)
    if str(scan.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    # return normalized dict with 'id'
    return scan.model_dump()

@router.get("/{scan_id}/findings")
async def get_findings(scan_id: str, user_id: str = Depends(get_current_user_id)):
    fr = FindingRepository()
    findings = await fr.list_by_scan(scan_id)
    return [f.model_dump() for f in findings]

@router.get("/{scan_id}/report")
async def get_report(scan_id: str, user_id: str = Depends(get_current_user_id)):
    # Return a simple PDF report
    import logging
    from ...utils.pdf import build_scan_pdf
    scan_repo = ScanRepository()
    try:
        scan = await scan_repo.get(scan_id)
        if not scan:
            logging.error(f"Scan not found: {scan_id}")
            raise HTTPException(status_code=404, detail="Scan not found")
        fr = FindingRepository()
        findings = await fr.list_by_scan(scan_id)
        if not findings:
            logging.warning(f"No findings for scan {scan_id}")
        pdf_bytes = build_scan_pdf(scan, findings)
        headers = {"Content-Disposition": f"attachment; filename=scan-{scan_id}.pdf"}
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        logging.exception(f"Error generating PDF for scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")

@router.post("/{scan_id}/report-encrypted")
async def get_report_encrypted(scan_id: str, request: Request, user_id: str = Depends(get_current_user_id)):
    """Return an encrypted PDF report using a user-supplied password."""
    from ...utils.pdf import build_scan_pdf
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import os

    body = await request.json()
    password = body.get("password")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    scan_repo = ScanRepository()
    scan = await scan_repo.get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if str(scan.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    fr = FindingRepository()
    findings = await fr.list_by_scan(scan_id)
    pdf_bytes = build_scan_pdf(scan, findings)

    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=200_000,
    )
    key = kdf.derive(password.encode("utf-8"))
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, pdf_bytes, None)
    payload = b"SDENC1" + salt + nonce + ciphertext

    headers = {"Content-Disposition": f"attachment; filename=scan-{scan_id}.pdf.enc"}
    return Response(content=payload, media_type="application/octet-stream", headers=headers)

@router.delete("/{scan_id}")
async def delete_scan(scan_id: str, user_id: str = Depends(get_current_user_id)):
    scan_repo = ScanRepository()
    scan = await scan_repo.get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if str(scan.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    fr = FindingRepository()
    await fr.delete_by_scan(scan_id)
    ok = await scan_repo.delete(scan_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete scan")
    return {"status": "deleted"}

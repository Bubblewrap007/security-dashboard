from ..repositories.scans import ScanRepository
from ..repositories.assets import AssetRepository
from ..repositories.findings import FindingRepository
from ..db.client import init_db
from ..services.scanner import (
    check_email_hibp, check_spf, check_dmarc, check_dkim, check_security_headers, check_tls_cert,
    check_ipv4_connectivity, check_ipv4_ports,
    check_url_accessibility, check_url_security_headers, check_url_ssl_cert,
    score_from_findings
)
from datetime import datetime
import asyncio
import os

async def _perform_scan_async(scan_id: str):
    init_db(os.getenv("MONGO_URI", "mongodb://mongo:27017/mydb"))
    scan_repo = ScanRepository()
    asset_repo = AssetRepository()
    findings_repo = FindingRepository()

    scan = await scan_repo.get(scan_id)
    if not scan:
        return
    await scan_repo.update_status(scan_id, "running", started_at=datetime.utcnow())
    all_findings = []
    # iterate assets
    assets_for_demo = []
    for aid in scan.asset_ids:
        asset = await asset_repo.get(aid)
        if not asset:
            continue
        assets_for_demo.append({"id": asset.id, "type": asset.type, "value": asset.value})
        if asset.type == "email":
            all_findings += check_email_hibp(scan_id, aid, asset.value)
        elif asset.type == "domain":
            # run domain checks
            all_findings += check_spf(scan_id, aid, asset.value)
            all_findings += check_dmarc(scan_id, aid, asset.value)
            all_findings += check_dkim(scan_id, aid, asset.value)
            all_findings += check_security_headers(scan_id, aid, asset.value)
            all_findings += check_tls_cert(scan_id, aid, asset.value)
        elif asset.type == "ipv4":
            # run IPv4 checks
            all_findings += check_ipv4_connectivity(scan_id, aid, asset.value)
            all_findings += check_ipv4_ports(scan_id, aid, asset.value)
        elif asset.type == "url":
            # run URL checks
            all_findings += check_url_accessibility(scan_id, aid, asset.value)
            all_findings += check_url_security_headers(scan_id, aid, asset.value)
            all_findings += check_url_ssl_cert(scan_id, aid, asset.value)

    # persist findings
    if all_findings:
        await findings_repo.delete_by_scan(scan_id)
        await findings_repo.create_many(all_findings)
    score, counts = score_from_findings(all_findings)
    await scan_repo.set_results(scan_id, score, counts, completed_at=datetime.utcnow())
    # audit completion
    try:
        from ..repositories.audit import AuditRepository
        await AuditRepository().create_event(actor_id=scan.user_id, action="complete_scan", target_type="scan", target_id=scan.id, details={"score": score, "counts": counts})
    except Exception:
        # avoid failing the job if auditing fails
        pass
    return

# RQ executes sync callables, so expose a sync wrapper that runs the async worker
def perform_scan(scan_id: str):
    asyncio.run(_perform_scan_async(scan_id))
    return


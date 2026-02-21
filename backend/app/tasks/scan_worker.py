from ..repositories.scans import ScanRepository
from ..repositories.assets import AssetRepository
from ..repositories.findings import FindingRepository
from ..db.client import init_db
from ..services.scanner import (
    check_email_hibp, check_spf, check_dmarc, check_dkim, check_security_headers, check_tls_cert,
    check_ipv4_connectivity, check_ipv4_ports,
    check_url_accessibility, check_url_security_headers, check_url_ssl_cert,
    score_from_findings, build_finding
)
from ..repositories.users import UserRepository
from datetime import datetime
import asyncio
import os

_STEPS_PER_TYPE = {"email": 1, "domain": 5, "ipv4": 2, "url": 3}

async def _perform_scan_async(scan_id: str):
    import logging
    logger = logging.getLogger(__name__)
    init_db(os.getenv("MONGO_URI", "mongodb://mongo:27017/mydb"))
    scan_repo = ScanRepository()
    asset_repo = AssetRepository()
    findings_repo = FindingRepository()
    user_repo = UserRepository()

    scan = await scan_repo.get(scan_id)
    if not scan:
        return
    try:
        await scan_repo.update_status(scan_id, "running", started_at=datetime.utcnow())

        # Calculate total steps so we can report accurate progress
        assets_loaded = []
        for aid in scan.asset_ids:
            asset = await asset_repo.get(aid)
            if asset:
                assets_loaded.append(asset)
        total_steps = sum(_STEPS_PER_TYPE.get(a.type, 1) for a in assets_loaded)
        completed_steps = 0

        async def _tick():
            nonlocal completed_steps
            completed_steps += 1
            pct = int(completed_steps / total_steps * 100) if total_steps else 100
            await scan_repo.update_progress(scan_id, min(pct, 99))  # hold at 99 until fully done

        all_findings = []
        for asset in assets_loaded:
            aid = asset.id
            if asset.type == "email":
                hibp_key = os.getenv("HIBP_API_KEY")
                limit = int(os.getenv("HIBP_DAILY_LIMIT", "2"))
                if hibp_key and limit > 0:
                    count = await user_repo.increment_email_breach_usage(scan.user_id)
                    if count > limit:
                        await _tick()
                        continue
                all_findings += check_email_hibp(scan_id, aid, asset.value)
                await _tick()
            elif asset.type == "domain":
                all_findings += check_spf(scan_id, aid, asset.value);        await _tick()
                all_findings += check_dmarc(scan_id, aid, asset.value);       await _tick()
                all_findings += check_dkim(scan_id, aid, asset.value);        await _tick()
                all_findings += check_security_headers(scan_id, aid, asset.value); await _tick()
                all_findings += check_tls_cert(scan_id, aid, asset.value);    await _tick()
            elif asset.type == "ipv4":
                all_findings += check_ipv4_connectivity(scan_id, aid, asset.value); await _tick()
                all_findings += check_ipv4_ports(scan_id, aid, asset.value);         await _tick()
            elif asset.type == "url":
                all_findings += check_url_accessibility(scan_id, aid, asset.value);       await _tick()
                all_findings += check_url_security_headers(scan_id, aid, asset.value);    await _tick()
                all_findings += check_url_ssl_cert(scan_id, aid, asset.value);            await _tick()

        if all_findings:
            await findings_repo.delete_by_scan(scan_id)
            await findings_repo.create_many(all_findings)

        # Group scans: average per-asset scores so each asset's issues are weighted equally.
        # A clean asset (score 100) should not be dragged down by another asset's findings.
        if len(assets_loaded) > 1:
            from collections import defaultdict
            findings_by_asset = defaultdict(list)
            for f in all_findings:
                findings_by_asset[f['asset_id']].append(f)
            per_asset_scores = []
            counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            for asset in assets_loaded:
                asset_score, asset_counts = score_from_findings(findings_by_asset[asset.id])
                per_asset_scores.append(asset_score)
                for k in counts:
                    counts[k] += asset_counts[k]
            score = round(sum(per_asset_scores) / len(per_asset_scores)) if per_asset_scores else 100
        else:
            score, counts = score_from_findings(all_findings)

        await scan_repo.set_results(scan_id, score, counts, completed_at=datetime.utcnow())
        await scan_repo.update_progress(scan_id, 100)
        try:
            from ..repositories.audit import AuditRepository
            await AuditRepository().create_event(actor_id=scan.user_id, action="complete_scan", target_type="scan", target_id=scan.id, details={"score": score, "counts": counts})
        except Exception:
            pass
    except Exception as e:
        logger.exception("Scan %s failed with unhandled error: %s", scan_id, e)
        try:
            await scan_repo.update_status(scan_id, "failed")
        except Exception:
            pass

# RQ executes sync callables, so expose a sync wrapper that runs the async worker
def perform_scan(scan_id: str):
    asyncio.run(_perform_scan_async(scan_id))
    return


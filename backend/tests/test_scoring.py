from app.services.scanner import score_from_findings


def test_score_basic():
    findings = [
        {"severity": "critical"},
        {"severity": "high"},
        {"severity": "medium"},
        {"severity": "low"},
    ]
    score, counts = score_from_findings(findings)
    assert score == 100 - 25 - 15 - 7 - 3
    assert counts == {"critical": 1, "high": 1, "medium": 1, "low": 1}

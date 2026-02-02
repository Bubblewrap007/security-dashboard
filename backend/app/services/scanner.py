import dns.resolver
import requests
import ssl
import socket
from datetime import datetime, timedelta
from typing import List, Dict
import os

HIBP_API_KEY = os.getenv("HIBP_API_KEY", None)

# Common ports to scan for IPv4 assets
COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 5900, 8080, 8443]

# Severity mapping
SEVERITY_DEDUCTIONS = {
    "critical": 25,
    "high": 15,
    "medium": 7,
    "low": 3,
}


def build_finding(scan_id: str, asset_id: str, check_id: str, severity: str, title: str, evidence: dict, recommendation: str):
    return {
        "scan_id": scan_id,
        "asset_id": asset_id,
        "check_id": check_id,
        "severity": severity,
        "title": title,
        "evidence": evidence,
        "recommendation": recommendation,
        "created_at": datetime.utcnow()
    }


def build_demo_findings(scan_id: str, assets: List[Dict]) -> List[Dict]:
    demo = []
    for asset in assets:
        asset_id = str(asset.get("id") or asset.get("_id"))
        asset_type = asset.get("type")
        asset_value = asset.get("value")
        if asset_type == "email":
            demo.append(build_finding(
                scan_id,
                asset_id,
                "demo:email_breach",
                "high",
                "Email appears in public breach (demo)",
                {"email": asset_value, "note": "Demo data to show how findings appear"},
                "Reset passwords and enable MFA for accounts tied to this email."
            ))
        elif asset_type == "domain":
            demo.append(build_finding(
                scan_id,
                asset_id,
                "demo:dmarc_missing",
                "medium",
                "DMARC policy missing (demo)",
                {"domain": asset_value, "note": "Demo data to show how findings appear"},
                "Add a DMARC policy to reduce spoofing risk."
            ))
            demo.append(build_finding(
                scan_id,
                asset_id,
                "demo:hsts_missing",
                "low",
                "HSTS header missing (demo)",
                {"domain": asset_value},
                "Enable HSTS to force secure connections."
            ))
    return demo


# Email checks

def check_email_hibp(scan_id: str, asset_id: str, email: str) -> List[Dict]:
    findings = []
    if not HIBP_API_KEY:
        findings.append(build_finding(scan_id, asset_id, "hibp:apikey_missing", "low", "HIBP API key missing", {"note": "HIBP API key not provided; email breach lookup was skipped"}, "Provide a HIBP API key in environment for breach checks"))
        return findings
    # call HIBP breachedaccount endpoint
    headers = {"hibp-api-key": HIBP_API_KEY, "user-agent": "security-dashboard"}
    url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"
    params = {"truncateResponse": "true"}
    r = requests.get(url, headers=headers, params=params, timeout=10)
    if r.status_code == 200:
        data = r.json()
        findings.append(build_finding(scan_id, asset_id, "hibp:breach_found", "high", "Email found in breach feeds", {"breaches_count": len(data)}, "This email has been seen in public breaches; consider password resets and monitoring"))
    elif r.status_code == 404:
        # no breach found
        pass
    else:
        findings.append(build_finding(scan_id, asset_id, "hibp:error", "low", "HIBP lookup error", {"status_code": r.status_code}, "Check HIBP API key and rate limits"))
    return findings


# DNS checks

def has_mx_records(domain: str) -> bool:
    try:
        answers = dns.resolver.resolve(domain, "MX")
        return len(list(answers)) > 0
    except Exception:
        return False

def check_spf(scan_id: str, asset_id: str, domain: str) -> List[Dict]:
    findings = []
    mx_exists = has_mx_records(domain)
    try:
        answers = dns.resolver.resolve(domain, "TXT")
        texts = [b"".join(r.strings).decode() for r in answers]
        spf_records = [t for t in texts if t.startswith("v=spf1")]
        if not spf_records:
            if mx_exists:
                findings.append(build_finding(scan_id, asset_id, "spf:missing", "high", "SPF record missing", {"txt_records": texts}, "Publish an SPF TXT record specifying authorized mail sources"))
            else:
                findings.append(build_finding(scan_id, asset_id, "spf:missing", "low", "SPF record missing", {"txt_records": texts, "note": "No MX records detected. If this domain does not send email, this is informational.", "scoring_impact": "none"}, "If you send email from this domain, publish an SPF TXT record specifying authorized mail sources"))
        else:
            # basic check for all
            pass
    except Exception as e:
        findings.append(build_finding(scan_id, asset_id, "spf:error", "low", "SPF lookup failed", {"error": str(e), "note": "DNS lookup failed. If this domain does not send email, this is informational.", "scoring_impact": "none"}, "Ensure DNS is resolvable and public records are available"))
    return findings


def check_dmarc(scan_id: str, asset_id: str, domain: str) -> List[Dict]:
    findings = []
    mx_exists = has_mx_records(domain)
    try:
        name = f"_dmarc.{domain}"
        answers = dns.resolver.resolve(name, "TXT")
        texts = [b"".join(r.strings).decode() for r in answers]
        dmarc = [t for t in texts if t.lower().startswith("v=dmarc")]
        if not dmarc:
            if mx_exists:
                findings.append(build_finding(scan_id, asset_id, "dmarc:missing", "high", "DMARC record missing", {"txt_records": texts}, "Publish a DMARC policy in DNS to help reduce email spoofing"))
            else:
                findings.append(build_finding(scan_id, asset_id, "dmarc:missing", "low", "DMARC record missing", {"txt_records": texts, "note": "No MX records detected. If this domain does not send email, this is informational.", "scoring_impact": "none"}, "If you send email from this domain, publish a DMARC policy in DNS to help reduce spoofing"))
        else:
            # check policy
            record = dmarc[0]
            if "p=none" in record.lower():
                findings.append(build_finding(scan_id, asset_id, "dmarc:policy_none", "medium", "DMARC policy set to none", {"record": record}, "Consider enforcing DMARC policy to quarantine or reject (p=quarantine|reject) after testing"))
    except Exception as e:
        findings.append(build_finding(scan_id, asset_id, "dmarc:error", "low", "DMARC lookup failed", {"error": str(e), "note": "DNS lookup failed. If this domain does not send email, this is informational.", "scoring_impact": "none"}, "Ensure DNS is resolvable and public records are available"))
    return findings


def check_dkim(scan_id: str, asset_id: str, domain: str) -> List[Dict]:
    findings = []
    mx_exists = has_mx_records(domain)
    try:
        # check for any _domainkey records
        name = f"default._domainkey.{domain}"
        try:
            answers = dns.resolver.resolve(name, "TXT")
            texts = [b"".join(r.strings).decode() for r in answers]
            findings.append(build_finding(scan_id, asset_id, "dkim:found", "low", "DKIM record present (default selector)", {"txt": texts}, "Verify DKIM is correctly configured and aligned with sending services"))
        except Exception:
            # try wildcard: query just _domainkey
            answers = dns.resolver.resolve(f"_domainkey.{domain}", "CNAME")
            # if exists, we won't mark missing here; many domains use selectors
            pass
    except Exception as e:
        note = "DNS lookup failed. If this domain does not send email, this is informational."
        if mx_exists:
            note = "DNS lookup failed. If you send email from this domain, verify DKIM selectors with your provider."
        findings.append(build_finding(scan_id, asset_id, "dkim:error", "low", "DKIM lookup failed", {"error": str(e), "note": note, "scoring_impact": "none"}, "Ensure DNS is resolvable and public records are available"))
    return findings


# Web headers and TLS

def check_security_headers(scan_id: str, asset_id: str, domain: str) -> List[Dict]:
    findings = []
    url = f"https://{domain}"
    try:
        # Allow redirects since external hosts may redirect
        r = requests.get(url, timeout=10, allow_redirects=True, verify=True)
        headers = {k.lower(): v for k, v in r.headers.items()}
        
        # If we got redirected, add informational finding
        if r.history:
            findings.append(build_finding(scan_id, asset_id, "headers:redirects", "low", "Domain redirects (may be hosted externally)", {"redirect_chain": len(r.history), "final_url": r.url}, "This is normal for domains hosted on Netlify, Squarespace, or Google Workspace"))
        
        # HSTS
        if "strict-transport-security" not in headers:
            findings.append(build_finding(scan_id, asset_id, "headers:hsts_missing", "medium", "HSTS header missing", {"note": "Not critical for externally hosted domains"}, "Enable HSTS to ensure browsers only use HTTPS"))
        # CSP
        if "content-security-policy" not in headers:
            findings.append(build_finding(scan_id, asset_id, "headers:csp_missing", "medium", "CSP header missing", {"note": "Contact your hosting provider if needed"}, "Add a Content-Security-Policy appropriate to your site"))
        # X-Frame-Options
        if "x-frame-options" not in headers:
            findings.append(build_finding(scan_id, asset_id, "headers:xfo_missing", "low", "X-Frame-Options missing", {}, "Consider setting X-Frame-Options to DENY or SAMEORIGIN"))
        # X-Content-Type-Options
        if "x-content-type-options" not in headers:
            findings.append(build_finding(scan_id, asset_id, "headers:nosniff_missing", "low", "X-Content-Type-Options missing", {}, "Set X-Content-Type-Options to nosniff to prevent MIME-type sniffing"))
        # Referrer-Policy
        if "referrer-policy" not in headers:
            findings.append(build_finding(scan_id, asset_id, "headers:referrer_missing", "low", "Referrer-Policy missing", {}, "Set a Referrer-Policy, e.g., no-referrer or strict-origin-when-cross-origin"))
    except requests.exceptions.SSLError as e:
        # For externally hosted domains, SSL might be handled by the host
        findings.append(build_finding(scan_id, asset_id, "tls:ssl_error", "high", "TLS/SSL error or external hosting detected", {"error": str(e)}, "If hosted externally (Netlify, Squarespace, etc.), SSL is likely handled by the provider. Verify with your host."))
    except requests.exceptions.ConnectionError as e:
        findings.append(build_finding(scan_id, asset_id, "headers:connection_error", "medium", "Could not connect to domain", {"error": str(e)}, "Verify the domain is configured and accessible"))
    except Exception as e:
        findings.append(build_finding(scan_id, asset_id, "headers:error", "low", "Security headers check failed", {"error": str(e)}, "Check network reachability and site availability"))
    return findings


def check_tls_cert(scan_id: str, asset_id: str, domain: str) -> List[Dict]:
    findings = []
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(5.0)
            s.connect((domain, 443))
            cert = s.getpeercert()
            # cert not None
            not_after = cert.get('notAfter')
            if not not_after:
                findings.append(build_finding(scan_id, asset_id, "tls:missing_expiry", "high", "Certificate expiry not found", {"cert": cert}, "Ensure certificate has a valid expiry date"))
            else:
                expire_dt = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                days_left = (expire_dt - datetime.utcnow()).days
                if days_left < 0:
                    findings.append(build_finding(scan_id, asset_id, "tls:expired", "critical", "TLS certificate expired", {"not_after": not_after}, "Renew the TLS certificate immediately"))
                elif days_left < 30:
                    findings.append(build_finding(scan_id, asset_id, "tls:expiring_soon", "high", "TLS certificate expiring soon", {"days_left": days_left, "not_after": not_after}, "Renew TLS certificate before expiry"))
                else:
                    # Certificate is valid - add informational finding
                    findings.append(build_finding(scan_id, asset_id, "tls:valid", "low", "TLS certificate valid", {"days_left": days_left, "not_after": not_after}, "Certificate is valid and will expire in " + str(days_left) + " days"))
    except ssl.SSLError as e:
        # Check if it's a common external hosting scenario
        error_msg = str(e)
        if "certificate verify failed" in error_msg or "CERTIFICATE_VERIFY_FAILED" in error_msg:
            findings.append(build_finding(scan_id, asset_id, "tls:cert_verify_error", "high", "Certificate verification failed", {"error": error_msg}, "This may indicate an externally hosted domain (Netlify, Squarespace, etc.). Verify with your hosting provider."))
        else:
            findings.append(build_finding(scan_id, asset_id, "tls:ssl_error", "high", "TLS/SSL error", {"error": error_msg}, "Ensure TLS is properly configured and certificates are valid"))
    except socket.timeout:
        findings.append(build_finding(scan_id, asset_id, "tls:timeout", "medium", "TLS certificate check timed out", {}, "Connection timed out. The domain may not be properly configured or may be down."))
    except socket.error as e:
        findings.append(build_finding(scan_id, asset_id, "tls:connection_error", "medium", "Could not connect for TLS check", {"error": str(e)}, "Verify the domain is accessible on port 443"))
    except Exception as e:
        findings.append(build_finding(scan_id, asset_id, "tls:error", "low", "TLS certificate check failed", {"error": str(e)}, "Ensure domain is reachable and supports TLS"))
    return findings


def score_from_findings(findings: List[Dict]) -> tuple[int, dict]:
    score = 100
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        sev = f.get('severity')
        if sev in SEVERITY_DEDUCTIONS:
            counts[sev] += 1
            evidence = f.get("evidence", {}) or {}
            if evidence.get("scoring_impact") != "none":
                score -= SEVERITY_DEDUCTIONS[sev]
    if score < 0:
        score = 0
    return score, counts


# IPv4 checks

def check_ipv4_connectivity(scan_id: str, asset_id: str, ip: str) -> List[Dict]:
    """Check if IP is reachable via ICMP ping"""
    findings = []
    import platform
    import subprocess
    
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    try:
        result = subprocess.run(['ping', param, '1', ip], capture_output=True, timeout=5)
        if result.returncode != 0:
            findings.append(build_finding(
                scan_id, asset_id, "ipv4:unreachable", "medium", 
                "IP address unreachable", 
                {"ip": ip, "note": "Could not reach host via ping"}, 
                "Verify the IP address is correct and the host is online"
            ))
    except Exception as e:
        findings.append(build_finding(
            scan_id, asset_id, "ipv4:connectivity_error", "low", 
            "Connectivity check failed", 
            {"ip": ip, "error": str(e)}, 
            "Check network connectivity and permissions"
        ))
    return findings


def check_ipv4_ports(scan_id: str, asset_id: str, ip: str) -> List[Dict]:
    """Scan common ports on IPv4 address"""
    findings = []
    open_ports = []
    risky_ports = {
        21: ("FTP", "critical", "FTP is unencrypted; consider SFTP/FTPS"),
        23: ("Telnet", "critical", "Telnet is insecure; use SSH instead"),
        25: ("SMTP", "medium", "Ensure SMTP is properly secured and not an open relay"),
        110: ("POP3", "medium", "Consider using encrypted alternatives (POP3S)"),
        143: ("IMAP", "medium", "Consider using encrypted alternatives (IMAPS)"),
        445: ("SMB", "high", "SMB should not be exposed to internet; restrict access"),
        3306: ("MySQL", "high", "Database port exposed; restrict to internal networks only"),
        3389: ("RDP", "critical", "RDP exposed to internet is high-risk; use VPN or disable"),
        5432: ("PostgreSQL", "high", "Database port exposed; restrict to internal networks only"),
        5900: ("VNC", "critical", "VNC exposed is high-risk; use encrypted tunnel"),
    }
    
    for port in COMMON_PORTS:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((ip, port))
            sock.close()
            
            if result == 0:
                open_ports.append(port)
                if port in risky_ports:
                    service_name, severity, recommendation = risky_ports[port]
                    findings.append(build_finding(
                        scan_id, asset_id, f"ipv4:risky_port_{port}", severity,
                        f"Risky service exposed: {service_name} (port {port})",
                        {"ip": ip, "port": port, "service": service_name},
                        recommendation
                    ))
        except Exception:
            pass
    
    # Report summary of open ports
    if open_ports:
        safe_ports = [p for p in open_ports if p not in risky_ports]
        if safe_ports:
            findings.append(build_finding(
                scan_id, asset_id, "ipv4:open_ports", "low",
                f"Open ports detected: {', '.join(map(str, safe_ports))}",
                {"ip": ip, "open_ports": safe_ports},
                "Review open ports and ensure only necessary services are exposed"
            ))
    
    return findings


# URL checks

def check_url_accessibility(scan_id: str, asset_id: str, url: str) -> List[Dict]:
    """Check if URL is accessible and returns valid response"""
    findings = []
    try:
        r = requests.get(url, timeout=10, allow_redirects=True)
        if r.status_code >= 500:
            findings.append(build_finding(
                scan_id, asset_id, "url:server_error", "high",
                f"Server error: HTTP {r.status_code}",
                {"url": url, "status_code": r.status_code},
                "Investigate server errors and ensure site is functioning properly"
            ))
        elif r.status_code >= 400:
            findings.append(build_finding(
                scan_id, asset_id, "url:client_error", "medium",
                f"Client error: HTTP {r.status_code}",
                {"url": url, "status_code": r.status_code},
                "Verify URL is correct and accessible"
            ))
        # Check for HTTP on HTTPS-capable site
        if url.startswith('http://'):
            https_url = url.replace('http://', 'https://')
            try:
                https_r = requests.get(https_url, timeout=5)
                if https_r.status_code < 400:
                    findings.append(build_finding(
                        scan_id, asset_id, "url:http_when_https_available", "high",
                        "Using HTTP when HTTPS is available",
                        {"url": url, "https_url": https_url},
                        "Always use HTTPS to encrypt traffic"
                    ))
            except:
                pass
    except requests.exceptions.SSLError as e:
        findings.append(build_finding(
            scan_id, asset_id, "url:ssl_error", "critical",
            "TLS/SSL error",
            {"url": url, "error": str(e)},
            "Fix SSL certificate issues; invalid certificates expose users to attacks"
        ))
    except requests.exceptions.Timeout:
        findings.append(build_finding(
            scan_id, asset_id, "url:timeout", "medium",
            "Request timed out",
            {"url": url},
            "Check server performance and network connectivity"
        ))
    except Exception as e:
        findings.append(build_finding(
            scan_id, asset_id, "url:error", "low",
            "URL accessibility check failed",
            {"url": url, "error": str(e)},
            "Verify URL is correct and server is reachable"
        ))
    return findings


def check_url_security_headers(scan_id: str, asset_id: str, url: str) -> List[Dict]:
    """Check security headers for URL (similar to domain check)"""
    findings = []
    try:
        r = requests.get(url, timeout=10)
        headers = {k.lower(): v for k, v in r.headers.items()}
        
        # HSTS
        if url.startswith('https://') and "strict-transport-security" not in headers:
            findings.append(build_finding(
                scan_id, asset_id, "url:hsts_missing", "medium",
                "HSTS header missing",
                {"url": url},
                "Enable HSTS to ensure browsers only use HTTPS"
            ))
        # CSP
        if "content-security-policy" not in headers:
            findings.append(build_finding(
                scan_id, asset_id, "url:csp_missing", "medium",
                "CSP header missing",
                {"url": url},
                "Add Content-Security-Policy to mitigate XSS attacks"
            ))
        # X-Frame-Options
        if "x-frame-options" not in headers:
            findings.append(build_finding(
                scan_id, asset_id, "url:xfo_missing", "low",
                "X-Frame-Options missing",
                {"url": url},
                "Set X-Frame-Options to prevent clickjacking"
            ))
        # X-Content-Type-Options
        if "x-content-type-options" not in headers:
            findings.append(build_finding(
                scan_id, asset_id, "url:nosniff_missing", "low",
                "X-Content-Type-Options missing",
                {"url": url},
                "Set X-Content-Type-Options: nosniff"
            ))
    except requests.exceptions.SSLError as e:
        # Already caught in accessibility check
        pass
    except Exception as e:
        findings.append(build_finding(
            scan_id, asset_id, "url:headers_error", "low",
            "Security headers check failed",
            {"url": url, "error": str(e)},
            "Check network reachability"
        ))
    return findings


def check_url_ssl_cert(scan_id: str, asset_id: str, url: str) -> List[Dict]:
    """Check SSL certificate for HTTPS URLs"""
    findings = []
    if not url.startswith('https://'):
        return findings
    
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname
        
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(5.0)
            s.connect((hostname, 443))
            cert = s.getpeercert()
            
            not_after = cert.get('notAfter')
            if not not_after:
                findings.append(build_finding(
                    scan_id, asset_id, "url:missing_expiry", "high",
                    "Certificate expiry not found",
                    {"url": url},
                    "Ensure certificate has valid expiry date"
                ))
            else:
                expire_dt = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                days_left = (expire_dt - datetime.utcnow()).days
                if days_left < 0:
                    findings.append(build_finding(
                        scan_id, asset_id, "url:cert_expired", "critical",
                        "SSL certificate expired",
                        {"url": url, "not_after": not_after},
                        "Renew SSL certificate immediately"
                    ))
                elif days_left < 30:
                    findings.append(build_finding(
                        scan_id, asset_id, "url:cert_expiring", "high",
                        "SSL certificate expiring soon",
                        {"url": url, "days_left": days_left},
                        "Renew certificate before expiry"
                    ))
    except Exception as e:
        findings.append(build_finding(
            scan_id, asset_id, "url:ssl_check_error", "low",
            "SSL certificate check failed",
            {"url": url, "error": str(e)},
            "Ensure SSL is properly configured"
        ))
    return findings


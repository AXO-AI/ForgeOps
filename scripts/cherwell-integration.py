#!/usr/bin/env python3
"""
cherwell-integration.py - Cherwell / ServiceNow change request integration.

Auto-detects the ITSM platform from environment variables:
  - CHERWELL_URL  -> Cherwell mode
  - SERVICENOW_URL -> ServiceNow mode

Subcommands:
  create-cr   Create a change request
  update-cr   Update an existing change request

Uses only urllib (no third-party dependencies).
Exits 0 gracefully if neither platform is configured.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error


# ------------------------------------------------------------------
# Platform detection
# ------------------------------------------------------------------

PLATFORM_CHERWELL = "cherwell"
PLATFORM_SERVICENOW = "servicenow"


def detect_platform():
    """Return (platform, base_url, auth_header) or None if not configured."""
    cherwell_url = os.environ.get("CHERWELL_URL", "").strip()
    cherwell_token = os.environ.get("CHERWELL_TOKEN", "").strip()
    servicenow_url = os.environ.get("SERVICENOW_URL", "").strip()
    servicenow_token = os.environ.get("SERVICENOW_TOKEN", "").strip()

    if cherwell_url and cherwell_token:
        return PLATFORM_CHERWELL, cherwell_url, f"Bearer {cherwell_token}"
    if servicenow_url and servicenow_token:
        return PLATFORM_SERVICENOW, servicenow_url, f"Bearer {servicenow_token}"
    return None


# ------------------------------------------------------------------
# HTTP helper
# ------------------------------------------------------------------

def api_request(base_url, path, auth_header, method="GET", data=None):
    """Send an HTTP request and return the parsed JSON response."""
    url = base_url.rstrip("/") + path
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read().decode("utf-8")
            if resp_body:
                return json.loads(resp_body)
            return {}
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"[FAIL] API error {exc.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"[FAIL] Could not reach ITSM platform: {exc.reason}", file=sys.stderr)
        sys.exit(1)


# ------------------------------------------------------------------
# Cherwell API paths
# ------------------------------------------------------------------

def cherwell_create_cr(base_url, auth_header, args):
    """Create a change request in Cherwell."""
    payload = {
        "busObId": args.busob_id or os.environ.get("CHERWELL_BUSOB_ID", ""),
        "fields": [
            {"name": "ShortDescription", "value": args.summary, "dirty": True},
            {"name": "Description", "value": args.description, "dirty": True},
            {"name": "Priority", "value": args.priority, "dirty": True},
            {"name": "ChangeType", "value": args.change_type, "dirty": True},
        ],
    }
    result = api_request(base_url, "/api/V1/savebusinessobject", auth_header, method="POST", data=payload)
    cr_id = result.get("busObPublicId", result.get("busObRecId", "UNKNOWN"))
    print(f"[PASS] Created Cherwell CR: {cr_id}")
    _write_output("cr_id", cr_id)
    return cr_id


def cherwell_update_cr(base_url, auth_header, args):
    """Update a change request in Cherwell."""
    payload = {
        "busObId": args.busob_id or os.environ.get("CHERWELL_BUSOB_ID", ""),
        "busObPublicId": args.cr_id,
        "fields": [
            {"name": "Status", "value": args.status, "dirty": True},
        ],
    }
    if args.comment:
        payload["fields"].append({"name": "Comments", "value": args.comment, "dirty": True})

    api_request(base_url, "/api/V1/savebusinessobject", auth_header, method="POST", data=payload)
    print(f"[PASS] Updated Cherwell CR {args.cr_id} to status '{args.status}'")


# ------------------------------------------------------------------
# ServiceNow API paths
# ------------------------------------------------------------------

def servicenow_create_cr(base_url, auth_header, args):
    """Create a change request in ServiceNow."""
    payload = {
        "short_description": args.summary,
        "description": args.description,
        "priority": args.priority,
        "type": args.change_type,
    }
    result = api_request(
        base_url,
        "/api/now/table/change_request",
        auth_header,
        method="POST",
        data=payload,
    )
    cr_number = result.get("result", {}).get("number", "UNKNOWN")
    cr_sys_id = result.get("result", {}).get("sys_id", "")
    print(f"[PASS] Created ServiceNow CR: {cr_number}")
    _write_output("cr_id", cr_number)
    _write_output("cr_sys_id", cr_sys_id)
    return cr_number


def servicenow_update_cr(base_url, auth_header, args):
    """Update a change request in ServiceNow."""
    payload = {"state": args.status}
    if args.comment:
        payload["work_notes"] = args.comment

    api_request(
        base_url,
        f"/api/now/table/change_request/{args.cr_id}",
        auth_header,
        method="PATCH",
        data=payload,
    )
    print(f"[PASS] Updated ServiceNow CR {args.cr_id} to state '{args.status}'")


# ------------------------------------------------------------------
# Utility
# ------------------------------------------------------------------

def _write_output(key, value):
    """Write a key=value pair to GITHUB_OUTPUT if available."""
    gh_output = os.environ.get("GITHUB_OUTPUT", "")
    if gh_output:
        with open(gh_output, "a") as f:
            f.write(f"{key}={value}\n")


# ------------------------------------------------------------------
# Subcommand dispatch
# ------------------------------------------------------------------

def cmd_create_cr(platform_info, args):
    platform, base_url, auth_header = platform_info
    if platform == PLATFORM_CHERWELL:
        return cherwell_create_cr(base_url, auth_header, args)
    else:
        return servicenow_create_cr(base_url, auth_header, args)


def cmd_update_cr(platform_info, args):
    platform, base_url, auth_header = platform_info
    if platform == PLATFORM_CHERWELL:
        return cherwell_update_cr(base_url, auth_header, args)
    else:
        return servicenow_update_cr(base_url, auth_header, args)


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ForgeOps Cherwell/ServiceNow Integration")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-cr
    p_create = subparsers.add_parser("create-cr", help="Create a change request")
    p_create.add_argument("--summary", required=True, help="Short description")
    p_create.add_argument("--description", default="", help="Full description")
    p_create.add_argument("--priority", default="3", help="Priority (default: 3)")
    p_create.add_argument("--change-type", default="Standard", help="Change type")
    p_create.add_argument("--busob-id", default="", help="Cherwell Business Object ID")

    # update-cr
    p_update = subparsers.add_parser("update-cr", help="Update a change request")
    p_update.add_argument("--cr-id", required=True, help="Change request ID")
    p_update.add_argument("--status", required=True, help="New status/state")
    p_update.add_argument("--comment", default="", help="Comment or work note")
    p_update.add_argument("--busob-id", default="", help="Cherwell Business Object ID")

    args = parser.parse_args()

    # Detect platform
    platform_info = detect_platform()
    if platform_info is None:
        print("[SKIP] No ITSM platform configured (set CHERWELL_URL/CHERWELL_TOKEN or SERVICENOW_URL/SERVICENOW_TOKEN)")
        sys.exit(0)

    platform, base_url, _ = platform_info
    print(f"[INFO] Detected ITSM platform: {platform} ({base_url})")

    if args.command == "create-cr":
        cmd_create_cr(platform_info, args)
    elif args.command == "update-cr":
        cmd_update_cr(platform_info, args)


if __name__ == "__main__":
    main()

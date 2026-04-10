#!/usr/bin/env python3
"""
cherwell-integration.py — ITSM integration for ForgeOps pipelines.

Auto-detects:
  CHERWELL_URL → Cherwell (OAuth2 client_credentials)
  SERVICENOW_URL → ServiceNow (Basic auth)
  Neither → gracefully skip

Subcommands:
  create-cr  Create a Change Request
  update-cr  Update a Change Request status

Uses only urllib (no pip dependencies).
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse


def detect_itsm():
    """Detect which ITSM is configured."""
    if os.environ.get("CHERWELL_URL"):
        return "cherwell"
    elif os.environ.get("SERVICENOW_URL"):
        return "servicenow"
    return None


# ── Cherwell ──

def cherwell_get_token(url, client_id, client_secret):
    """Obtain an OAuth2 access token using client_credentials grant."""
    token_url = f"{url.rstrip('/')}/CherwellAPI/token"
    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }).encode("utf-8")

    req = urllib.request.Request(
        token_url, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))["access_token"]
    except Exception as e:
        print(f"Cherwell OAuth error: {e}", file=sys.stderr)
        return None


def cherwell_request(url, token, path, method="GET", data=None):
    """Make an authenticated Cherwell API request."""
    full_url = f"{url.rstrip('/')}/CherwellAPI/api/V1/{path.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(full_url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status == 204:
                return {}
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"Cherwell API error ({e.code}): {error_body}", file=sys.stderr)
        return None


def set_field_value(fields, field_name, value):
    """Set a field value in the template fields list."""
    for field in fields:
        if field.get("displayName", "").lower() == field_name.lower() or \
           field.get("name", "").lower() == field_name.lower():
            field["dirty"] = True
            field["value"] = value
            return True
    return False


# ── ServiceNow ──

def servicenow_request(url, user, password, path, method="GET", data=None):
    """Make an authenticated ServiceNow API request."""
    full_url = f"{url.rstrip('/')}/api/now/{path.lstrip('/')}"
    auth = base64.b64encode(f"{user}:{password}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(full_url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"ServiceNow API error ({e.code}): {error_body}", file=sys.stderr)
        return None


# ── Subcommand: create-cr ──

def cmd_create_cr(args):
    """Create a Change Request in Cherwell or ServiceNow."""
    itsm = detect_itsm()

    if not itsm and (not args.url or args.url == ""):
        print("⏭️ ITSM not configured — skipping CR creation")
        sys.exit(0)

    url = args.url or os.environ.get("CHERWELL_URL") or os.environ.get("SERVICENOW_URL", "")

    if not url:
        print("⏭️ ITSM not configured — skipping CR creation")
        sys.exit(0)

    # Detect based on URL or env
    if itsm == "servicenow" or "servicenow" in url.lower() or "service-now" in url.lower():
        # ServiceNow
        user = args.client_id or os.environ.get("SERVICENOW_USER", "")
        password = args.client_secret or os.environ.get("SERVICENOW_PASSWORD", "")

        cr_data = {
            "short_description": f"Deploy {args.app} v{args.version} to {args.environment}",
            "description": f"Automated deployment of {args.app} version {args.version} to {args.environment} via ForgeOps pipeline.",
            "type": "Normal",
            "priority": "3",
            "state": "New",
            "requested_by": args.approver,
            "category": "Software",
        }

        result = servicenow_request(url, user, password, "table/change_request", method="POST", data=cr_data)
        if result and "result" in result:
            cr_id = result["result"].get("number", result["result"].get("sys_id", "UNKNOWN"))
            print(cr_id)
            return cr_id
        else:
            print("ERROR", file=sys.stderr)
            return "ERROR"
    else:
        # Cherwell
        token = cherwell_get_token(url, args.client_id, args.client_secret)
        if not token:
            print("ERROR")
            return "ERROR"

        summary = cherwell_request(url, token, "getbusinessobjectsummary/busobname/ChangeRequest")
        if not summary or (isinstance(summary, list) and len(summary) == 0):
            print("ERROR")
            return "ERROR"

        bus_ob_id = summary[0]["busObId"] if isinstance(summary, list) else summary.get("busObId", "")

        template = cherwell_request(url, token, "getbusinessobjecttemplate", method="POST", data={
            "busObId": bus_ob_id,
            "includeRequired": True,
            "includeAll": True,
        })

        if not template:
            print("ERROR")
            return "ERROR"

        fields = template.get("fields", [])
        set_field_value(fields, "Summary", f"Deploy {args.app} v{args.version} to {args.environment}")
        set_field_value(fields, "Description",
                        f"Automated deployment of {args.app} version {args.version} "
                        f"to {args.environment} environment via ForgeOps pipeline.")
        set_field_value(fields, "Type", "Normal")
        set_field_value(fields, "Priority", "3 - Moderate")
        set_field_value(fields, "Status", "New")
        set_field_value(fields, "Requested By", args.approver)

        result = cherwell_request(url, token, "savebusinessobject", method="POST", data={
            "busObId": bus_ob_id,
            "fields": fields,
            "persist": True,
        })

        if result:
            cr_id = result.get("busObPublicId", result.get("busObRecId", "UNKNOWN"))
            print(cr_id)
            return cr_id
        else:
            print("ERROR")
            return "ERROR"


# ── Subcommand: update-cr ──

def cmd_update_cr(args):
    """Update a Change Request status."""
    itsm = detect_itsm()

    if not itsm and (not args.url or args.url == ""):
        print("⏭️ ITSM not configured — skipping CR update")
        sys.exit(0)

    url = args.url or os.environ.get("CHERWELL_URL") or os.environ.get("SERVICENOW_URL", "")

    if not url:
        print("⏭️ ITSM not configured — skipping CR update")
        sys.exit(0)

    if itsm == "servicenow" or "servicenow" in url.lower():
        user = args.client_id or os.environ.get("SERVICENOW_USER", "")
        password = args.client_secret or os.environ.get("SERVICENOW_PASSWORD", "")

        # Map status
        state_map = {"Implemented": "3", "Failed": "4"}
        state = state_map.get(args.status, "3")

        servicenow_request(url, user, password,
                           f"table/change_request?sysparm_query=number={args.cr_id}",
                           method="PATCH", data={"state": state})
        print(f"Change Request {args.cr_id} updated to status: {args.status}")
    else:
        token = cherwell_get_token(url, args.client_id, args.client_secret)
        if not token:
            return

        summary = cherwell_request(url, token, "getbusinessobjectsummary/busobname/ChangeRequest")
        bus_ob_id = summary[0]["busObId"] if isinstance(summary, list) else summary.get("busObId", "")

        result = cherwell_request(url, token, f"getbusinessobject/busobid/{bus_ob_id}/publicid/{args.cr_id}")
        if not result:
            return

        fields = result.get("fields", [])
        set_field_value(fields, "Status", args.status)

        cherwell_request(url, token, "savebusinessobject", method="POST", data={
            "busObId": bus_ob_id,
            "busObRecId": result.get("busObRecId", ""),
            "busObPublicId": args.cr_id,
            "fields": fields,
            "persist": True,
        })
        print(f"Change Request {args.cr_id} updated to status: {args.status}")


# ── CLI ──

def main():
    parser = argparse.ArgumentParser(description="ForgeOps ITSM Integration (Cherwell / ServiceNow)")
    subparsers = parser.add_subparsers(dest="command", required=True)

    cc = subparsers.add_parser("create-cr", help="Create a Change Request")
    cc.add_argument("--url", default="", help="ITSM base URL")
    cc.add_argument("--client-id", default="", help="OAuth2 client ID or ServiceNow user")
    cc.add_argument("--client-secret", default="", help="OAuth2 client secret or ServiceNow password")
    cc.add_argument("--app", required=True, help="Application name")
    cc.add_argument("--version", required=True, help="Application version")
    cc.add_argument("--environment", required=True, help="Target environment")
    cc.add_argument("--approver", required=True, help="Approver name")

    uc = subparsers.add_parser("update-cr", help="Update a Change Request")
    uc.add_argument("--url", default="", help="ITSM base URL")
    uc.add_argument("--client-id", default="", help="OAuth2 client ID or ServiceNow user")
    uc.add_argument("--client-secret", default="", help="OAuth2 client secret or ServiceNow password")
    uc.add_argument("--cr-id", required=True, help="Change Request ID")
    uc.add_argument("--status", required=True, help="New status (Implemented/Failed)")

    args = parser.parse_args()

    if args.command == "create-cr":
        cmd_create_cr(args)
    elif args.command == "update-cr":
        cmd_update_cr(args)


if __name__ == "__main__":
    main()

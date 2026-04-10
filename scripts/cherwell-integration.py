#!/usr/bin/env python3
"""ForgeOps ITSM Integration - auto-detects Cherwell or ServiceNow.
Creates and updates change records. Gracefully skips if no ITSM configured."""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error

def detect_platform():
    if os.environ.get("CHERWELL_BASE_URL") and os.environ.get("CHERWELL_API_KEY"):
        return "cherwell"
    if os.environ.get("SERVICENOW_URL") and os.environ.get("SERVICENOW_TOKEN"):
        return "servicenow"
    return None

def itsm_request(method, url, headers, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 204:
                return {}
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"::error::ITSM API error {e.code}: {body}")
        sys.exit(1)

def cherwell_headers():
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "api-key": os.environ["CHERWELL_API_KEY"],
    }

def servicenow_headers():
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {os.environ['SERVICENOW_TOKEN']}",
    }

def create_cr_cherwell(args):
    base = os.environ["CHERWELL_BASE_URL"].rstrip("/")
    data = {
        "busObId": "change_request",
        "fields": [
            {"name": "ShortDescription", "value": args.summary},
            {"name": "Description", "value": args.description or args.summary},
            {"name": "Type", "value": "Normal"},
            {"name": "Priority", "value": args.priority},
        ]
    }
    result = itsm_request("POST", f"{base}/api/V1/savebusinessobject", cherwell_headers(), data)
    rec_id = result.get("busObRecId", "unknown")
    print(f"Cherwell CR created: {rec_id}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"cr_id={rec_id}\n")

def create_cr_servicenow(args):
    base = os.environ["SERVICENOW_URL"].rstrip("/")
    data = {
        "short_description": args.summary,
        "description": args.description or args.summary,
        "type": "normal",
        "priority": args.priority,
    }
    result = itsm_request("POST", f"{base}/api/now/table/change_request", servicenow_headers(), data)
    number = result.get("result", {}).get("number", "unknown")
    print(f"ServiceNow CR created: {number}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"cr_id={number}\n")

def update_cr_cherwell(args):
    base = os.environ["CHERWELL_BASE_URL"].rstrip("/")
    data = {
        "busObId": "change_request",
        "busObRecId": args.cr_id,
        "fields": [
            {"name": "Status", "value": args.status},
        ]
    }
    if args.close_notes:
        data["fields"].append({"name": "CloseDescription", "value": args.close_notes})
    itsm_request("POST", f"{base}/api/V1/savebusinessobject", cherwell_headers(), data)
    print(f"Cherwell CR {args.cr_id} updated to '{args.status}'")

def update_cr_servicenow(args):
    base = os.environ["SERVICENOW_URL"].rstrip("/")
    data = {"state": args.status}
    if args.close_notes:
        data["close_notes"] = args.close_notes
    itsm_request("PATCH", f"{base}/api/now/table/change_request/{args.cr_id}", servicenow_headers(), data)
    print(f"ServiceNow CR {args.cr_id} updated to '{args.status}'")

def cmd_create_cr(args):
    platform = detect_platform()
    if not platform:
        print("::warning::No ITSM platform configured. Skipping CR creation.")
        sys.exit(0)
    if platform == "cherwell":
        create_cr_cherwell(args)
    else:
        create_cr_servicenow(args)

def cmd_update_cr(args):
    platform = detect_platform()
    if not platform:
        print("::warning::No ITSM platform configured. Skipping CR update.")
        sys.exit(0)
    if platform == "cherwell":
        update_cr_cherwell(args)
    else:
        update_cr_servicenow(args)

def main():
    parser = argparse.ArgumentParser(description="ForgeOps ITSM Integration (Cherwell/ServiceNow)")
    sub = parser.add_subparsers(dest="command", required=True)

    cc = sub.add_parser("create-cr", help="Create a change record")
    cc.add_argument("--summary", required=True)
    cc.add_argument("--description", default="")
    cc.add_argument("--priority", default="3")

    uc = sub.add_parser("update-cr", help="Update a change record")
    uc.add_argument("--cr-id", required=True)
    uc.add_argument("--status", required=True)
    uc.add_argument("--close-notes", default="")

    args = parser.parse_args()
    if args.command == "create-cr":
        cmd_create_cr(args)
    elif args.command == "update-cr":
        cmd_update_cr(args)

if __name__ == "__main__":
    main()

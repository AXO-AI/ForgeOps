#!/usr/bin/env python3
"""ForgeOps Jira Integration - create tickets, transition issues, set fix versions.
Uses only urllib (no external dependencies). Gracefully skips if credentials missing."""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error
import base64

def get_auth_header():
    email = os.environ.get("JIRA_USER_EMAIL", "")
    token = os.environ.get("JIRA_API_TOKEN", "")
    if not email or not token:
        return None
    creds = base64.b64encode(f"{email}:{token}".encode()).decode()
    return f"Basic {creds}"

def get_base_url():
    return os.environ.get("JIRA_BASE_URL", "").rstrip("/")

def jira_request(method, path, data=None):
    base = get_base_url()
    auth = get_auth_header()
    if not base or not auth:
        print("::warning::Jira credentials not configured. Skipping.")
        sys.exit(0)
    url = f"{base}/rest/api/3/{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 204:
                return {}
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"::error::Jira API error {e.code}: {body}")
        sys.exit(1)

def cmd_create_ticket(args):
    data = {
        "fields": {
            "project": {"key": args.project},
            "summary": args.summary,
            "issuetype": {"name": args.issue_type},
            "description": {
                "type": "doc",
                "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": args.description or args.summary}]}]
            }
        }
    }
    if args.labels:
        data["fields"]["labels"] = args.labels.split(",")
    result = jira_request("POST", "issue", data)
    key = result.get("key", "")
    print(f"Created: {key}")
    print(f"URL: {get_base_url()}/browse/{key}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"jira_key={key}\n")

def cmd_transition(args):
    # Get available transitions
    transitions = jira_request("GET", f"issue/{args.issue_key}/transitions")
    target = None
    for t in transitions.get("transitions", []):
        if t["name"].lower() == args.transition_name.lower():
            target = t["id"]
            break
    if not target:
        names = [t["name"] for t in transitions.get("transitions", [])]
        print(f"::warning::Transition '{args.transition_name}' not found. Available: {names}")
        sys.exit(0)
    jira_request("POST", f"issue/{args.issue_key}/transitions", {"transition": {"id": target}})
    print(f"Transitioned {args.issue_key} to '{args.transition_name}'")

def cmd_set_fix_version(args):
    jira_request("PUT", f"issue/{args.issue_key}", {
        "update": {"fixVersions": [{"add": {"name": args.version}}]}
    })
    print(f"Set fix version '{args.version}' on {args.issue_key}")

def main():
    parser = argparse.ArgumentParser(description="ForgeOps Jira Integration")
    sub = parser.add_subparsers(dest="command", required=True)

    ct = sub.add_parser("create-ticket", help="Create a Jira ticket")
    ct.add_argument("--project", required=True)
    ct.add_argument("--summary", required=True)
    ct.add_argument("--issue-type", default="Task")
    ct.add_argument("--description", default="")
    ct.add_argument("--labels", default="")

    tr = sub.add_parser("transition", help="Transition a Jira issue")
    tr.add_argument("--issue-key", required=True)
    tr.add_argument("--transition-name", required=True)

    fv = sub.add_parser("set-fix-version", help="Set fix version on an issue")
    fv.add_argument("--issue-key", required=True)
    fv.add_argument("--version", required=True)

    args = parser.parse_args()
    if args.command == "create-ticket":
        cmd_create_ticket(args)
    elif args.command == "transition":
        cmd_transition(args)
    elif args.command == "set-fix-version":
        cmd_set_fix_version(args)

if __name__ == "__main__":
    main()

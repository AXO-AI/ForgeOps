#!/usr/bin/env python3
"""
jira-integration.py - JIRA integration for ForgeOps CI/CD pipelines.

Subcommands:
  create-ticket     Create a new JIRA ticket
  transition        Transition a ticket to a new status
  set-fix-version   Set the fix version on a ticket

Uses only urllib (no third-party dependencies).
Exits 0 with a skip message when --url is empty or not provided.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
import urllib.parse


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def jira_request(base_url, path, token, method="GET", data=None):
    """Send a request to the JIRA REST API."""
    url = base_url.rstrip("/") + path
    headers = {
        "Authorization": f"Basic {token}",
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
        print(f"[FAIL] JIRA API error {exc.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"[FAIL] Could not reach JIRA: {exc.reason}", file=sys.stderr)
        sys.exit(1)


def extract_ticket_keys(count=50):
    """Extract JIRA ticket keys ([A-Z]+-\\d+) from recent git log."""
    try:
        result = subprocess.run(
            ["git", "log", f"-{count}", "--oneline"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return []
        pattern = re.compile(r"[A-Z]+-\d+")
        keys = pattern.findall(result.stdout)
        # Deduplicate while preserving order
        seen = set()
        unique = []
        for k in keys:
            if k not in seen:
                seen.add(k)
                unique.append(k)
        return unique
    except Exception:
        return []


# ------------------------------------------------------------------
# Subcommands
# ------------------------------------------------------------------

def cmd_create_ticket(args):
    """Create a new JIRA ticket."""
    if not args.url:
        print("[SKIP] JIRA URL not configured -- skipping ticket creation")
        sys.exit(0)

    payload = {
        "fields": {
            "project": {"key": args.project},
            "summary": args.summary,
            "issuetype": {"name": args.issue_type},
        }
    }
    if args.description:
        payload["fields"]["description"] = args.description

    if args.labels:
        payload["fields"]["labels"] = args.labels.split(",")

    result = jira_request(args.url, "/rest/api/2/issue", args.token, method="POST", data=payload)
    ticket_key = result.get("key", "UNKNOWN")
    print(f"[PASS] Created JIRA ticket: {ticket_key}")

    # Write to GITHUB_OUTPUT if available
    gh_output = os.environ.get("GITHUB_OUTPUT", "")
    if gh_output:
        with open(gh_output, "a") as f:
            f.write(f"ticket_key={ticket_key}\n")

    return ticket_key


def cmd_transition(args):
    """Transition a JIRA ticket to a new status."""
    if not args.url:
        print("[SKIP] JIRA URL not configured -- skipping transition")
        sys.exit(0)

    ticket_key = args.ticket
    if not ticket_key:
        # Try to extract from git log
        keys = extract_ticket_keys()
        if not keys:
            print("[SKIP] No JIRA ticket key found in git log")
            sys.exit(0)
        ticket_key = keys[0]
        print(f"[INFO] Auto-detected ticket from git log: {ticket_key}")

    # Get available transitions
    transitions = jira_request(
        args.url,
        f"/rest/api/2/issue/{ticket_key}/transitions",
        args.token,
    )
    target_id = None
    for t in transitions.get("transitions", []):
        if t["name"].lower() == args.status.lower():
            target_id = t["id"]
            break

    if not target_id:
        available = [t["name"] for t in transitions.get("transitions", [])]
        print(f"[FAIL] Transition '{args.status}' not found. Available: {', '.join(available)}")
        sys.exit(1)

    jira_request(
        args.url,
        f"/rest/api/2/issue/{ticket_key}/transitions",
        args.token,
        method="POST",
        data={"transition": {"id": target_id}},
    )
    print(f"[PASS] Transitioned {ticket_key} to '{args.status}'")


def cmd_set_fix_version(args):
    """Set fix version on a JIRA ticket."""
    if not args.url:
        print("[SKIP] JIRA URL not configured -- skipping fix version")
        sys.exit(0)

    ticket_key = args.ticket
    if not ticket_key:
        keys = extract_ticket_keys()
        if not keys:
            print("[SKIP] No JIRA ticket key found in git log")
            sys.exit(0)
        ticket_key = keys[0]
        print(f"[INFO] Auto-detected ticket from git log: {ticket_key}")

    payload = {
        "update": {
            "fixVersions": [{"add": {"name": args.version}}]
        }
    }
    jira_request(
        args.url,
        f"/rest/api/2/issue/{ticket_key}",
        args.token,
        method="PUT",
        data=payload,
    )
    print(f"[PASS] Set fix version '{args.version}' on {ticket_key}")


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ForgeOps JIRA Integration")
    parser.add_argument("--url", default=os.environ.get("JIRA_URL", ""), help="JIRA base URL")
    parser.add_argument("--token", default=os.environ.get("JIRA_TOKEN", ""), help="JIRA API token (base64)")

    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-ticket
    p_create = subparsers.add_parser("create-ticket", help="Create a JIRA ticket")
    p_create.add_argument("--project", required=True, help="JIRA project key")
    p_create.add_argument("--summary", required=True, help="Ticket summary")
    p_create.add_argument("--description", default="", help="Ticket description")
    p_create.add_argument("--issue-type", default="Task", help="Issue type (default: Task)")
    p_create.add_argument("--labels", default="", help="Comma-separated labels")
    p_create.set_defaults(func=cmd_create_ticket)

    # transition
    p_trans = subparsers.add_parser("transition", help="Transition a JIRA ticket")
    p_trans.add_argument("--ticket", default="", help="Ticket key (auto-detect from git if omitted)")
    p_trans.add_argument("--status", required=True, help="Target status name")
    p_trans.set_defaults(func=cmd_transition)

    # set-fix-version
    p_fix = subparsers.add_parser("set-fix-version", help="Set fix version on a ticket")
    p_fix.add_argument("--ticket", default="", help="Ticket key (auto-detect from git if omitted)")
    p_fix.add_argument("--version", required=True, help="Fix version name")
    p_fix.set_defaults(func=cmd_set_fix_version)

    args = parser.parse_args()

    # Global check: if --url is empty, exit gracefully
    if not args.url:
        print("[SKIP] JIRA URL not provided -- skipping JIRA integration")
        sys.exit(0)

    if not args.token:
        print("[FAIL] JIRA token is required when URL is configured")
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()

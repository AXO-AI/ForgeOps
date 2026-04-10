#!/usr/bin/env python3
"""
jira-integration.py — Jira integration for ForgeOps pipelines.

Subcommands:
  create-ticket   Create a Jira issue
  transition      Transition issues found in git commit messages
  set-fix-version Set fix version on issues found in git commits

Uses only urllib (no pip dependencies).
Gracefully skips if Jira is not configured (--url empty or missing).
"""

import argparse
import json
import re
import subprocess
import sys
import urllib.request
import urllib.error


def jira_request(url, token, path, method="GET", data=None):
    """Make an authenticated request to the Jira REST API."""
    full_url = f"{url.rstrip('/')}/rest/api/2/{path.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
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
        print(f"Jira API error ({e.code}): {error_body}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Jira connection error: {e}", file=sys.stderr)
        return None


def extract_jira_keys(commit_range):
    """Extract Jira issue keys (e.g. PROJ-123) from git log messages."""
    try:
        result = subprocess.run(
            ["git", "log", "--pretty=format:%s %b", commit_range],
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError:
        try:
            result = subprocess.run(
                ["git", "log", "-1", "--pretty=format:%s %b"],
                capture_output=True, text=True, check=True,
            )
        except subprocess.CalledProcessError:
            return []

    messages = result.stdout
    keys = re.findall(r"[A-Z]+-\d+", messages)
    seen = set()
    unique = []
    for k in keys:
        if k not in seen:
            seen.add(k)
            unique.append(k)
    return unique


# ── Subcommand: create-ticket ──

def cmd_create_ticket(args):
    """Create a new Jira issue."""
    if not args.url or not args.token:
        print("⏭️ Jira not configured — skipping ticket creation")
        return

    fields = {
        "project": {"key": args.project},
        "issuetype": {"name": args.type},
        "summary": args.summary,
        "description": args.description,
        "priority": {"name": args.priority},
    }

    if args.labels:
        fields["labels"] = [l.strip() for l in args.labels.split(",")]

    result = jira_request(args.url, args.token, "issue", method="POST", data={"fields": fields})
    if result:
        issue_key = result.get("key", "UNKNOWN")
        print(f"Created Jira ticket: {issue_key}")
        return issue_key
    else:
        print("Failed to create Jira ticket", file=sys.stderr)


# ── Subcommand: transition ──

def cmd_transition(args):
    """Transition Jira issues found in git commit messages."""
    if not args.url or not args.token:
        print("⏭️ Jira not configured — skipping transitions")
        return

    keys = extract_jira_keys(args.commit_range)

    if not keys:
        print("No Jira issue keys found in commit messages.")
        return

    print(f"Found Jira keys: {', '.join(keys)}")

    for key in keys:
        transitions = jira_request(args.url, args.token, f"issue/{key}/transitions")
        if not transitions:
            print(f"  {key}: could not fetch transitions")
            continue

        available = transitions.get("transitions", [])

        target = None
        for t in available:
            if t["name"].lower() == args.status.lower():
                target = t
                break

        if target:
            transition_data = {"transition": {"id": target["id"]}}
            jira_request(
                args.url, args.token,
                f"issue/{key}/transitions",
                method="POST", data=transition_data,
            )
            print(f"  {key}: transitioned to '{args.status}'")
        else:
            available_names = [t["name"] for t in available]
            print(f"  {key}: transition '{args.status}' not available (available: {available_names})")

        if args.comment:
            jira_request(
                args.url, args.token,
                f"issue/{key}/comment",
                method="POST", data={"body": args.comment},
            )
            print(f"  {key}: comment added")


# ── Subcommand: set-fix-version ──

def cmd_set_fix_version(args):
    """Set fix version on Jira issues found in git commits."""
    if not args.url or not args.token:
        print("⏭️ Jira not configured — skipping fix version")
        return

    keys = extract_jira_keys(args.commit_range)

    if not keys:
        print("No Jira issue keys found in commit messages.")
        return

    print(f"Setting fix version '{args.version}' on: {', '.join(keys)}")

    project_key = keys[0].split("-")[0]

    # Try to create the version (ignore if exists)
    version_data = {
        "name": args.version,
        "project": project_key,
        "released": False,
    }
    jira_request(args.url, args.token, "version", method="POST", data=version_data)

    for key in keys:
        update_data = {
            "update": {
                "fixVersions": [{"add": {"name": args.version}}]
            }
        }
        result = jira_request(
            args.url, args.token,
            f"issue/{key}",
            method="PUT", data=update_data,
        )
        if result is not None:
            print(f"  {key}: fix version set to '{args.version}'")
        else:
            print(f"  {key}: failed to set fix version")


# ── CLI ──

def main():
    parser = argparse.ArgumentParser(description="ForgeOps Jira Integration")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-ticket
    ct = subparsers.add_parser("create-ticket", help="Create a Jira ticket")
    ct.add_argument("--url", default="", help="Jira base URL")
    ct.add_argument("--token", default="", help="Jira API token")
    ct.add_argument("--project", default="", help="Jira project key")
    ct.add_argument("--type", default="Bug", help="Issue type (Bug, Task, Story)")
    ct.add_argument("--summary", default="", help="Issue summary")
    ct.add_argument("--description", default="", help="Issue description")
    ct.add_argument("--priority", default="Medium", help="Priority")
    ct.add_argument("--labels", default="", help="Comma-separated labels")

    # transition
    tr = subparsers.add_parser("transition", help="Transition issues from git commits")
    tr.add_argument("--url", default="", help="Jira base URL")
    tr.add_argument("--token", default="", help="Jira API token")
    tr.add_argument("--commit-range", required=True, help="Git commit range")
    tr.add_argument("--status", required=True, help="Target transition name")
    tr.add_argument("--comment", default="", help="Comment to add")

    # set-fix-version
    fv = subparsers.add_parser("set-fix-version", help="Set fix version on issues")
    fv.add_argument("--url", default="", help="Jira base URL")
    fv.add_argument("--token", default="", help="Jira API token")
    fv.add_argument("--commit-range", required=True, help="Git commit range")
    fv.add_argument("--version", required=True, help="Fix version name")

    args = parser.parse_args()

    if args.command == "create-ticket":
        cmd_create_ticket(args)
    elif args.command == "transition":
        cmd_transition(args)
    elif args.command == "set-fix-version":
        cmd_set_fix_version(args)


if __name__ == "__main__":
    main()

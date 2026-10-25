#!/usr/bin/env python3
"""
Cubic Dev AI — Intelligent Pull Request & Code Review Agent for Lucky Store / RetailOS.
Provides automated code review, security analysis, architectural policy enforcement,
and actionable diff suggestions, mirroring cubic.dev and CodeRabbit behavior.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Auto-load repo-level .env.local if present
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
env_local = REPO_ROOT / ".env.local"

try:
    from dotenv import load_dotenv
    if env_local.is_file():
        load_dotenv(env_local)
except ImportError:
    if env_local.is_file():
        for line in env_local.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip("'\"")
                if k not in os.environ:
                    os.environ[k] = v

try:
    import requests
except ImportError:
    requests = None


# Severity classifications mirroring Cubic Dev
class Severity:
    P0_BLOCKER = "P0-BLOCKER"  # Security leaks, fatal crashes, data loss, RLS holes
    P1_HIGH = "P1-HIGH"        # Logic bugs, broken mutations, unhandled rejections
    P2_MED = "P2-MED"          # Perf pitfalls, brand color violations, hardcoded paths
    P3_NIT = "P3-NIT"          # Style, naming, non-blocking improvements


@dataclass
class Finding:
    severity: str
    file: str
    line: int | None
    rule: str
    message: str
    snippet: str | None = None
    suggestion: str | None = None


@dataclass
class FileDiff:
    filename: str
    old_path: str
    new_path: str
    hunks: list[str] = field(default_factory=list)
    added_lines: list[tuple[int, str]] = field(default_factory=list)
    raw_diff: str = ""


# --- Static Rule Engine ---
class StaticAnalyzer:
    """Fast deterministic lint and policy checks over diff hunks."""

    # Brand color policy
    OLD_BLACK = re.compile(r"#1a1a1a", re.IGNORECASE)
    OLD_GOLD = re.compile(r"#f5c518", re.IGNORECASE)
    LUCKY_BLACK = "#0B0B0D"
    LUCKY_GOLD = "#f0c444"

    # User environment leaks
    USER_PATH_PATTERN = re.compile(r"/Users/[a-zA-Z0-9._-]+")

    # Credential leak detection signatures
    credential_signatures = [
        (re.compile(r"(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\s*[:=]\s*['\"][a-zA-Z0-9_\-]{20,}['\"]", re.I), "Potential hardcoded API token/secret"),
        (re.compile(r"sbp_[a-zA-Z0-9]{30,}", re.I), "Exposed Supabase service/access token"),
        (re.compile(r"AKIA[0-9A-Z]{16}", re.I), "Exposed AWS Access Key ID"),
        (re.compile(r"-----BEGIN (?:RSA|EC|OPENSSH|PGP) PRIVATE KEY-----"), "Exposed Private Key block"),
    ]

    # Database RLS rules
    CREATE_TABLE_PATTERN = re.compile(r"create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_.\"]+)", re.I)
    ENABLE_RLS_PATTERN = re.compile(r"alter\s+table\s+([a-zA-Z0-9_.\"]+)\s+enable\s+row\s+level\s+security", re.I)

    @classmethod
    def analyze_file_diff(cls, diff: FileDiff) -> list[Finding]:
        findings: list[Finding] = []

        # Exclude reviewer / static analyzer tool itself from self-referential pattern matches
        if diff.filename.endswith("cubic_reviewer.py") or "scripts/ai" in diff.filename:
            return findings

        # 1. AST syntax check on added/modified Python files
        if diff.filename.endswith(".py") and Path(diff.filename).is_file():
            try:
                content = Path(diff.filename).read_text(encoding="utf-8", errors="ignore")
                ast.parse(content, filename=diff.filename)
            except SyntaxError as e:
                findings.append(Finding(
                    severity=Severity.P0_BLOCKER,
                    file=diff.filename,
                    line=e.lineno,
                    rule="python-syntax-error",
                    message=f"Python syntax error: {e.msg}",
                    snippet=e.text.strip() if e.text else None,
                ))

        # Check line by line in added content
        for line_no, line_content in diff.added_lines:
            # 2. Secret exposure check
            for pattern, desc in cls.credential_signatures:
                if pattern.search(line_content):
                    redacted_snippet = pattern.sub("[REDACTED_SECRET]", line_content.strip()[:120])
                    findings.append(Finding(
                        severity=Severity.P0_BLOCKER,
                        file=diff.filename,
                        line=line_no,
                        rule="security-secret-leak",
                        message=desc,
                        snippet=redacted_snippet,
                        suggestion="Remove raw token and read from process.env or .env.local",
                    ))

            # 3. Hardcoded developer paths
            if cls.USER_PATH_PATTERN.search(line_content):
                findings.append(Finding(
                    severity=Severity.P2_MED,
                    file=diff.filename,
                    line=line_no,
                    rule="portability-hardcoded-path",
                    message="Hardcoded developer machine directory path found (/Users/...)",
                    snippet=line_content.strip(),
                    suggestion="Use relative repo paths or resolve dynamically via Path(__file__).parent",
                ))

            # 4. Brand Color Locking enforcement (Lucky Store AGENTS.md rule)
            if not diff.filename.endswith((".md", ".json", ".lock")):
                if cls.OLD_BLACK.search(line_content):
                    findings.append(Finding(
                        severity=Severity.P2_MED,
                        file=diff.filename,
                        line=line_no,
                        rule="brand-color-lock",
                        message=f"Detected deprecated brand color #1A1A1A. Use brand Deep Night: {cls.LUCKY_BLACK}",
                        snippet=line_content.strip(),
                        suggestion=f"Replace #1A1A1A with {cls.LUCKY_BLACK}",
                    ))
                if cls.OLD_GOLD.search(line_content):
                    findings.append(Finding(
                        severity=Severity.P2_MED,
                        file=diff.filename,
                        line=line_no,
                        rule="brand-color-lock",
                        message=f"Detected deprecated brand color #F5C518. Use brand Saffron Accent: {cls.LUCKY_GOLD}",
                        snippet=line_content.strip(),
                        suggestion=f"Replace #F5C518 with {cls.LUCKY_GOLD}",
                    ))

        # 5. Migration RLS check
        if "migrations" in diff.filename and diff.filename.endswith(".sql"):
            full_diff_text = "\n".join(text for _, text in diff.added_lines)
            created_tables = set(cls.CREATE_TABLE_PATTERN.findall(full_diff_text))
            enabled_rls = set(cls.ENABLE_RLS_PATTERN.findall(full_diff_text))
            for table in created_tables:
                clean_table = table.split(".")[-1].strip('"')
                if not any(clean_table in e for e in enabled_rls):
                    findings.append(Finding(
                        severity=Severity.P0_BLOCKER,
                        file=diff.filename,
                        line=None,
                        rule="security-rls-missing",
                        message=f"Table '{table}' is created without ENABLE ROW LEVEL SECURITY in this migration",
                        suggestion=f"Add: ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;",
                    ))

        return findings


# --- Git Diff Parser ---
def parse_git_diff(raw_diff: str) -> list[FileDiff]:
    files: list[FileDiff] = []
    current_file: FileDiff | None = None
    current_line = 0

    for line in raw_diff.splitlines():
        if line.startswith("diff --git "):
            parts = line.split(" ")
            old_path = parts[2][2:] if len(parts) > 2 else ""
            new_path = parts[3][2:] if len(parts) > 3 else ""
            current_file = FileDiff(filename=new_path or old_path, old_path=old_path, new_path=new_path)
            files.append(current_file)
            current_line = 0
            continue

        if current_file is None:
            continue

        current_file.raw_diff += line + "\n"

        if line.startswith("@@"):
            # Parse line numbers from hunk header e.g. @@ -1,4 +1,6 @@
            m = re.search(r"\+(\d+)", line)
            if m:
                current_line = int(m.group(1))
            current_file.hunks.append(line)
            continue

        if line.startswith("+") and not line.startswith("+++"):
            current_file.added_lines.append((current_line, line[1:]))
            current_line += 1
        elif not line.startswith("-"):
            current_line += 1

    return files


# --- AI Review Engine (OpenRouter / Gemini API) ---
class AICodeReviewer:
    """LLM reviewer mirroring Cubic Dev AI / CodeRabbit."""

    SYSTEM_PROMPT = """You are Cubic Dev AI, an elite automated code reviewer for pull requests.
Review the provided git diff surgically.
Identify only HIGH-SIGNAL findings:
1. P0-BLOCKER: Security leaks, SQL injection, RLS bypass, fatal crashes, data loss, race conditions.
2. P1-HIGH: Real bugs, broken mutations, unhandled promise errors, incorrect schema dependencies.
3. P2-MED: Substantial performance issues, unmemoized hot paths, missing boundary validations.
4. P3-NIT: Non-blocking architectural or style suggestions.

Do NOT comment on minor formatting or self-evident syntax.
Format your output strictly as a JSON object:
{
  "summary": "1-2 sentence high-level summary of the PR diff",
  "risk_score": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "findings": [
    {
      "severity": "P0-BLOCKER" | "P1-HIGH" | "P2-MED" | "P3-NIT",
      "file": "path/to/file",
      "line": 123,
      "rule": "rule-identifier",
      "message": "Clear explanation of the issue and why it matters",
      "suggestion": "Concrete recommendation or code replacement snippet"
    }
  ]
}
"""

    @classmethod
    def review_diff(cls, raw_diff: str) -> dict[str, Any] | None:
        if not requests:
            return None

        # Try OpenRouter first, then Gemini API
        openrouter_key = os.environ.get("OPENROUTER_API_KEY")
        gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

        truncated_diff = raw_diff[:25000]  # Cap to avoid token bloat

        if openrouter_key:
            return cls._query_openrouter(openrouter_key, truncated_diff)
        elif gemini_key:
            return cls._query_gemini(gemini_key, truncated_diff)
        return None

    @classmethod
    def _parse_json_response(cls, text: str) -> dict[str, Any] | None:
        """Robustly parse JSON response from LLM, stripping markdown codeblocks if present."""
        clean_text = text.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.MULTILINE)
            clean_text = re.sub(r"\s*```$", "", clean_text, flags=re.MULTILINE)
        try:
            parsed = json.loads(clean_text)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError as err:
            if os.environ.get("DEBUG_CUBIC"):
                sys.stderr.write(f"[Cubic] Failed to decode LLM response JSON: {err}\nRaw text: {text[:200]}\n")
            return None

    @classmethod
    def _query_openrouter(cls, api_key: str, diff_text: str) -> dict[str, Any] | None:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/fatalmonk/luckystorePOS",
            "X-Title": "Cubic Dev AI Reviewer",
        }
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "system", "content": cls.SYSTEM_PROMPT},
                {"role": "user", "content": f"Please review this git diff:\n\n```diff\n{diff_text}\n```"}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                return cls._parse_json_response(content)
        except Exception as err:
            if os.environ.get("DEBUG_CUBIC"):
                sys.stderr.write(f"[Cubic] OpenRouter request error: {err}\n")
        return None

    @classmethod
    def _query_gemini(cls, api_key: str, diff_text: str) -> dict[str, Any] | None:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }
        prompt = f"{cls.SYSTEM_PROMPT}\n\nReview this git diff:\n\n```diff\n{diff_text}\n```"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
        }
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return cls._parse_json_response(text)
        except Exception as err:
            if os.environ.get("DEBUG_CUBIC"):
                sys.stderr.write(f"[Cubic] Gemini API request error: {err}\n")
        return None


# --- Formatters ---
class TerminalFormatter:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"

    @classmethod
    def print_banner(cls):
        print(f"{cls.BOLD}{cls.MAGENTA}🧊 Cubic Dev AI — Intelligent PR Code Reviewer{cls.RESET}")
        print(f"{cls.CYAN}Reviewing code against Lucky Store security, architecture & quality standards...{cls.RESET}\n")

    @classmethod
    def format_findings(cls, findings: list[Finding], summary: str | None = None, risk: str = "LOW"):
        cls.print_banner()

        if summary:
            print(f"{cls.BOLD}Summary:{cls.RESET} {summary}")
            print(f"{cls.BOLD}Risk Assessment:{cls.RESET} {cls.color_risk(risk)}\n")

        if not findings:
            print(f"{cls.GREEN}✅ No defects or policy violations found. Diff is clean!{cls.RESET}\n")
            return

        print(f"{cls.BOLD}Detected Issues ({len(findings)}):{cls.RESET}")
        print("─" * 70)
        for idx, f in enumerate(findings, 1):
            badge = cls.badge(f.severity)
            loc = f"{f.file}:{f.line}" if f.line else f.file
            print(f"{idx}. {badge} [{cls.BOLD}{f.rule}{cls.RESET}] @ {cls.CYAN}{loc}{cls.RESET}")
            print(f"   {f.message}")
            if f.snippet:
                print(f"   {cls.YELLOW}Line:{cls.RESET} {f.snippet}")
            if f.suggestion:
                print(f"   {cls.GREEN}Suggestion:{cls.RESET} {f.suggestion}")
            print()
        print("─" * 70)

    @classmethod
    def badge(cls, severity: str) -> str:
        if severity == Severity.P0_BLOCKER:
            return f"{cls.RED}🔴 [{severity}]{cls.RESET}"
        elif severity == Severity.P1_HIGH:
            return f"{cls.RED}🟠 [{severity}]{cls.RESET}"
        elif severity == Severity.P2_MED:
            return f"{cls.YELLOW}🟡 [{severity}]{cls.RESET}"
        return f"{cls.BLUE}🔵 [{severity}]{cls.RESET}"

    @classmethod
    def color_risk(cls, risk: str) -> str:
        if risk in ("HIGH", "CRITICAL"):
            return f"{cls.RED}{risk}{cls.RESET}"
        elif risk == "MEDIUM":
            return f"{cls.YELLOW}{risk}{cls.RESET}"
        return f"{cls.GREEN}{risk}{cls.RESET}"


class MarkdownFormatter:
    @classmethod
    def generate_report(cls, findings: list[Finding], summary: str | None = None, risk: str = "LOW") -> str:
        lines = []
        lines.append("## 🧊 Cubic Dev AI — Code Review Report\n")
        if summary:
            lines.append(f"> **Summary**: {summary}\n")
            lines.append(f"**Risk Level**: `{risk}` | **Total Findings**: `{len(findings)}`\n")

        if not findings:
            lines.append("### ✅ Result: All Clear\nNo architectural, security, or defect regressions detected.\n")
            return "\n".join(lines)

        lines.append("| Severity | File | Rule | Finding |")
        lines.append("|:---|:---|:---|:---|")
        for f in findings:
            loc = f"[`{f.file}:{f.line}`]({f.file}#L{f.line})" if f.line else f"`{f.file}`"
            sev_badge = f"**{f.severity}**"
            msg = f.message
            if f.suggestion:
                msg += f"<br>_Fix: {f.suggestion}_"
            lines.append(f"| {sev_badge} | {loc} | `{f.rule}` | {msg} |")

        lines.append("\n---\n*Generated autonomously by `scripts/ai/cubic_reviewer.py`*")
        return "\n".join(lines)


# --- CLI Execution ---
def main():
    parser = argparse.ArgumentParser(description="Cubic Dev AI — Pull Request & Code Review Agent")
    parser.add_argument("--base", default="main", help="Base branch to compare against (default: main)")
    parser.add_argument("--staged", action="store_true", help="Review staged changes only")
    parser.add_argument("--working", action="store_true", help="Review working directory changes")
    parser.add_argument("--pr", type=int, help="Review a specific PR number via gh CLI")
    parser.add_argument("--no-ai", action="store_true", help="Disable LLM evaluation, use static rules only")
    parser.add_argument("--ci", action="store_true", help="Exit with code 1 on P0/P1 blocker issues")
    parser.add_argument("--markdown", action="store_true", help="Output GitHub Markdown format")
    parser.add_argument("--output", type=str, help="Save report to file")
    parser.add_argument("--comment", action="store_true", help="Post review report as GitHub PR comment via gh")
    args = parser.parse_args()

    # 1. Obtain Diff
    if args.pr:
        cmd = ["gh", "pr", "diff", str(args.pr)]
    elif args.staged:
        cmd = ["git", "diff", "--cached"]
    elif args.working:
        cmd = ["git", "diff"]
    else:
        # Check if origin/main or main is available
        base_ref = f"origin/{args.base}" if subprocess.run(["git", "rev-parse", "--verify", f"origin/{args.base}"], capture_output=True).returncode == 0 else args.base
        cmd = ["git", "diff", f"{base_ref}...HEAD"]

    result = subprocess.run(cmd, capture_output=True, text=True)
    raw_diff = result.stdout

    if not raw_diff.strip():
        # Fallback to local unstaged/staged diff if branch diff is empty
        result = subprocess.run(["git", "diff", "HEAD"], capture_output=True, text=True)
        raw_diff = result.stdout

    file_diffs = parse_git_diff(raw_diff)

    # 2. Run Static Rules
    all_findings: list[Finding] = []
    for fdiff in file_diffs:
        all_findings.extend(StaticAnalyzer.analyze_file_diff(fdiff))

    summary = f"Audited {len(file_diffs)} changed files ({len(raw_diff.splitlines())} diff lines)."
    risk_level = "LOW"

    # 3. Run AI Review if enabled and key present
    if not args.no_ai and raw_diff.strip():
        ai_res = AICodeReviewer.review_diff(raw_diff)
        if ai_res and isinstance(ai_res, dict):
            summary = ai_res.get("summary", summary)
            risk_level = ai_res.get("risk_score", "MEDIUM")
            for item in ai_res.get("findings", []):
                all_findings.append(Finding(
                    severity=item.get("severity", Severity.P2_MED),
                    file=item.get("file", "unknown"),
                    line=item.get("line"),
                    rule=item.get("rule", "ai-review"),
                    message=item.get("message", ""),
                    suggestion=item.get("suggestion"),
                ))

    # 4. Format & Display
    if args.markdown:
        report = MarkdownFormatter.generate_report(all_findings, summary=summary, risk=risk_level)
        print(report)
    else:
        TerminalFormatter.format_findings(all_findings, summary=summary, risk=risk_level)
        report = MarkdownFormatter.generate_report(all_findings, summary=summary, risk=risk_level)

    # 5. Output to file
    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"Report saved to {args.output}")

    # 6. Post comment to PR if requested
    if args.comment and (args.pr or os.environ.get("GITHUB_PULL_REQUEST")):
        pr_target = str(args.pr) if args.pr else os.environ.get("GITHUB_PULL_REQUEST")
        comment_cmd = ["gh", "pr", "comment", pr_target, "--body", report]
        subprocess.run(comment_cmd)
        print(f"Posted review comment to PR #{pr_target}")

    # 7. CI Exit Code
    if args.ci:
        blockers = [f for f in all_findings if f.severity in (Severity.P0_BLOCKER, Severity.P1_HIGH)]
        if blockers:
            sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()

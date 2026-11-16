#!/usr/bin/env python3
"""Check that every requirement ID in the PRD, game specs and performance budgets has a row in
docs/TRACEABILITY.md, that the tracker has no unknown IDs, and that a row marked done carries
code, tests and evidence. Exit 1 on any problem. No dependencies."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES = ["docs/PRD.md", "docs/games/tabao-rush.md", "docs/games/peek-poker.md",
           "docs/games/rabakz.md", "docs/PERFORMANCE.md"]
ID_ROW = re.compile(r"^\|\s*\**((?:NFR-[A-Z0-9]+)|(?:[A-Z]{2,4}-\d+))\**\s*\|")
STATUSES = {"not started", "in progress", "partial", "done", "later", "not met"}


def ids_in(path):
    out = []
    for line in (ROOT / path).read_text().splitlines():
        m = ID_ROW.match(line)
        if m:
            out.append(m.group(1))
    return out


def main():
    problems = []
    required = []
    for src in SOURCES:
        found = ids_in(src)
        if not found:
            problems.append(f"{src}: no requirement IDs found")
        required += found
    dupes = {i for i in required if required.count(i) > 1}
    for d in sorted(dupes):
        problems.append(f"duplicate requirement ID across sources: {d}")

    rows = {}
    for line in (ROOT / "docs/TRACEABILITY.md").read_text().splitlines():
        m = ID_ROW.match(line)
        if not m:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if m.group(1) in rows:
            problems.append(f"TRACEABILITY: duplicate row {m.group(1)}")
        rows[m.group(1)] = cells

    for rid in required:
        if rid not in rows:
            problems.append(f"missing from TRACEABILITY: {rid}")
    for rid in rows:
        if rid not in required:
            problems.append(f"TRACEABILITY has unknown ID: {rid}")

    counts = {}
    for rid, cells in rows.items():
        if len(cells) < 8:
            problems.append(f"{rid}: row has {len(cells)} cells, expected 8")
            continue
        status = cells[4].lower()
        counts[status] = counts.get(status, 0) + 1
        if status not in STATUSES:
            problems.append(f"{rid}: unknown status '{cells[4]}'")
        if status == "done":
            for name, cell in (("code", cells[5]), ("tests", cells[6]), ("evidence", cells[7])):
                if not cell or cell == "—":
                    problems.append(f"{rid}: marked done with no {name}")

    print(f"{len(required)} requirements; " + ", ".join(f"{v} {k}" for k, v in sorted(counts.items())))
    if problems:
        print("\n".join("FAIL  " + p for p in problems))
        return 1
    print("trace check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

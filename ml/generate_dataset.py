#!/usr/bin/env python3
"""
Synthetic learner interaction dataset for offline ML experiments
(collaborative filtering, weak-topic prediction, clustering).
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=200)
    parser.add_argument("--topics", type=int, default=12)
    parser.add_argument("--out", type=Path, default=Path(__file__).parent / "data" / "learners_synthetic.csv")
    args = parser.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    topic_ids = [f"topic_{i}" for i in range(args.topics)]
    rng = random.Random(42)
    with args.out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["user_id", "topic_id", "quiz_score", "minutes_spent", "completed"])
        for u in range(args.users):
            for _ in range(rng.randint(3, 8)):
                t = rng.choice(topic_ids)
                score = max(0, min(100, int(rng.gauss(65, 18))))
                minutes = round(rng.uniform(5, 120), 2)
                done = 1 if score >= 60 else 0
                w.writerow([f"user_{u}", t, score, minutes, done])
    meta = {"users": args.users, "topics": topic_ids, "file": str(args.out)}
    (args.out.parent / "dataset_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("Wrote", args.out)


if __name__ == "__main__":
    main()

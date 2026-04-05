#!/usr/bin/env python3
"""Train baseline sklearn models on synthetic CSV from generate_dataset.py."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--csv",
        type=Path,
        default=Path(__file__).parent / "data" / "learners_synthetic.csv",
    )
    args = p.parse_args()
    if not args.csv.exists():
        raise SystemExit(f"Missing {args.csv} — run ml/generate_dataset.py first")
    df = pd.read_csv(args.csv)
    le_u = LabelEncoder().fit(df["user_id"])
    le_t = LabelEncoder().fit(df["topic_id"])
    X = np.column_stack([le_u.transform(df["user_id"]), le_t.transform(df["topic_id"]), df["minutes_spent"]])
    y = df["quiz_score"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    reg = RandomForestRegressor(n_estimators=50, random_state=42)
    reg.fit(X_train, y_train)
    print("RF score R^2 (test):", round(reg.score(X_test, y_test), 4))
    km = KMeans(n_clusters=4, n_init="auto", random_state=42)
    km.fit(X)
    print("KMeans inertia:", round(km.inertia_, 2))


if __name__ == "__main__":
    main()

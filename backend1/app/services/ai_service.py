"""
AI / ML integration: skill classification, collaborative + content-based signals,
weak-topic hints, path optimization stubs using scikit-learn where applicable.
"""

from __future__ import annotations

import logging
import os
import json
import google.generativeai as genai
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from app.config.settings import settings

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer, normalize

from app.models.schemas import (
    LearningPathRead,
    ModuleNode,
    MasteryPoint,
    QuestionItem,
    QuestionOption,
    QuestionType,
    RecommendResponse,
    RecommendationItem,
    ResourceType,
    SkillLevel,
    WeaknessRadar,
)
from app.utils.helper import clamp, generate_id, safe_mean, stable_hash, utc_now

logger = logging.getLogger(__name__)


@dataclass
class TopicCatalogEntry:
    topic_id: str
    title: str
    tags: List[str]
    difficulty: float
    prerequisites: List[str]
    est_hours: float


# In-memory catalog for demo / seed-free runtime
DEFAULT_CATALOG: List[TopicCatalogEntry] = [
    TopicCatalogEntry("py-basics", "Python Basics", ["python", "syntax"], 0.2, [], 8),
    TopicCatalogEntry("ds-arrays", "Data Structures: Arrays", ["python", "dsa"], 0.35, ["py-basics"], 10),
    TopicCatalogEntry("ml-intro", "ML Introduction", ["ml", "math"], 0.45, ["py-basics"], 12),
    TopicCatalogEntry("nlp-101", "NLP Fundamentals", ["nlp", "ml"], 0.55, ["ml-intro"], 14),
    TopicCatalogEntry("dl-cnn", "Deep Learning: CNNs", ["dl", "vision"], 0.7, ["ml-intro"], 20),
]


class AIService:
    """
    Encapsulates recommendation blending, user clustering, and path sequencing.
    Uses lightweight sklearn operations on synthetic feature matrices.
    """

    def __init__(self) -> None:
        self._catalog = {t.topic_id: t for t in DEFAULT_CATALOG}

    def classify_skill_level(self, quiz_scores: List[float], time_per_question_sec: List[float]) -> SkillLevel:
        if not quiz_scores:
            return SkillLevel.beginner
        score = safe_mean(quiz_scores)
        pace = safe_mean(time_per_question_sec) if time_per_question_sec else 60.0
        # Faster + higher score => advanced heuristic
        if score >= 0.75 and pace < 90:
            return SkillLevel.advanced
        if score >= 0.5:
            return SkillLevel.intermediate
        return SkillLevel.beginner

    def cluster_users(self, user_tag_matrix: List[List[str]], n_clusters: int = 3) -> np.ndarray:
        """Cluster learners by tag preferences (collaborative-style cohorts)."""
        if not user_tag_matrix:
            return np.array([])
        mlb = MultiLabelBinarizer()
        X = mlb.fit_transform(user_tag_matrix)
        X = normalize(X, axis=1, norm="l1")
        k = min(n_clusters, max(1, len(user_tag_matrix)))
        model = KMeans(n_clusters=k, n_init="auto", random_state=42)
        return model.fit_predict(X)

    def content_based_scores(
        self,
        user_interests: List[str],
        topic_ids: List[str],
    ) -> Dict[str, float]:
        """Tag overlap similarity between user profile and topics."""
        if not user_interests:
            return {tid: 0.5 for tid in topic_ids}
        mlb = MultiLabelBinarizer()
        rows = [user_interests]
        for tid in topic_ids:
            t = self._catalog.get(tid)
            rows.append(t.tags if t else [])
        mat = mlb.fit_transform(rows)
        user_vec = mat[0:1]
        topic_vecs = mat[1:]
        sims = cosine_similarity(user_vec, topic_vecs)[0]
        return {tid: float(clamp(s)) for tid, s in zip(topic_ids, sims)}

    def collaborative_scores(
        self,
        user_id: str,
        peer_matrix: np.ndarray,
        user_index: int,
    ) -> np.ndarray:
        """
        peer_matrix: shape (n_users, n_topics) with completion or rating weights.
        Returns predicted affinity per topic for user_index.
        """
        if peer_matrix.size == 0:
            return np.array([])
        if user_index < 0 or user_index >= peer_matrix.shape[0]:
            return np.zeros(peer_matrix.shape[1])
        sims = cosine_similarity(peer_matrix[user_index : user_index + 1], peer_matrix)[0]
        # exclude self
        sims[user_index] = 0.0
        if sims.sum() == 0:
            return np.mean(peer_matrix, axis=0)
        weights = sims / (sims.sum() + 1e-9)
        return weights @ peer_matrix

    def weak_topic_prediction(self, topic_scores: Dict[str, float], threshold: float = 0.55) -> List[str]:
        return sorted([k for k, v in topic_scores.items() if v < threshold], key=lambda k: topic_scores[k])

    def build_prerequisite_graph_order(self, topic_ids: List[str]) -> List[str]:
        """Topological sort by prerequisites for known catalog entries."""
        ids = [t for t in topic_ids if t in self._catalog]
        remaining = set(ids)
        ordered: List[str] = []
        while remaining:
            ready = [t for t in remaining if all(p not in remaining or p in ordered for p in self._catalog[t].prerequisites)]
            if not ready:
                # cycle or unknown prereqs — append rest arbitrarily
                ready = [next(iter(remaining))]
            for t in sorted(ready):
                ordered.append(t)
                remaining.discard(t)
        return ordered

    def generate_learning_path(
        self,
        user_id: str,
        goal_summary: str,
        interests: List[str],
        topic_pool: Optional[List[str]] = None,
    ) -> LearningPathRead:
        pool = topic_pool or list(self._catalog.keys())
        ordered = self.build_prerequisite_graph_order(pool)
        cb = self.content_based_scores(interests, ordered)

        modules: List[ModuleNode] = []
        total_hours = 0.0
        for i, tid in enumerate(ordered):
            meta = self._catalog[tid]
            # Boost estimated hours slightly for weaker affinity (adaptive pacing)
            affinity = cb.get(tid, 0.5)
            hours = meta.est_hours * (1.2 - 0.4 * affinity)
            modules.append(
                ModuleNode(
                    topic_id=tid,
                    title=meta.title,
                    estimated_hours=round(hours, 2),
                    prerequisites=list(meta.prerequisites),
                    order_index=i,
                )
            )
            total_hours += hours

        daily = self._daily_roadmap(modules)
        milestones = [f"Complete {m.title}" for m in modules[:: max(1, len(modules) // 4)]]

        path_id = stable_hash(user_id, goal_summary, ",".join(ordered))
        logger.info("Generated learning path", extra={"user_id": user_id, "path_id": path_id})

        return LearningPathRead(
            path_id=path_id,
            user_id=user_id,
            goal_summary=goal_summary,
            modules=modules,
            total_estimated_hours=round(total_hours, 2),
            daily_roadmap=daily,
            milestones=milestones,
            generated_at=utc_now(),
            version=1,
        )

    def regenerate_path(
        self,
        base: LearningPathRead,
        recent_quiz_scores: Optional[List[float]] = None,
    ) -> LearningPathRead:
        scores = recent_quiz_scores or []
        level = self.classify_skill_level(scores, [])
        modules = list(base.modules)
        factor = 0.85 if level == SkillLevel.advanced else 1.0 if level == SkillLevel.intermediate else 1.15
        for m in modules:
            m.estimated_hours = round(m.estimated_hours * factor, 2)
        daily = self._daily_roadmap(modules)
        return LearningPathRead(
            path_id=generate_id("path-"),
            user_id=base.user_id,
            goal_summary=base.goal_summary,
            modules=modules,
            total_estimated_hours=round(sum(m.estimated_hours for m in modules), 2),
            daily_roadmap=daily,
            milestones=base.milestones + ["Adapted after latest assessment"],
            generated_at=utc_now(),
            version=base.version + 1,
        )

    def recommend(
        self,
        user_id: str,
        interests: List[str],
        weak_topics: List[str],
        limit: int = 10,
        topic_focus: Optional[str] = None,
    ) -> RecommendResponse:
        candidates = list(self._catalog.keys())
        if topic_focus and topic_focus in self._catalog:
            candidates = [topic_focus] + [c for c in candidates if c != topic_focus]
        cb = self.content_based_scores(interests, candidates)
        items: List[RecommendationItem] = []
        for tid in candidates:
            meta = self._catalog[tid]
            base = cb.get(tid, 0.5)
            weak_boost = 0.15 if tid in weak_topics else 0.0
            score = clamp(base + weak_boost)
            rtype = ResourceType.video if "dl" in tid or "nlp" in tid else ResourceType.article
            items.append(
                RecommendationItem(
                    resource_id=generate_id("res-"),
                    title=f"{meta.title} — curated {rtype.value}",
                    type=rtype,
                    topic_id=tid,
                    url=f"https://www.youtube.com/results?search_query={meta.title.replace(' ', '+')}",
                    score=score,
                    rationale="Blend of content-based match and weakness focus."
                    if weak_boost
                    else "Content-based match to profile interests.",
                )
            )
        items.sort(key=lambda x: x.score, reverse=True)
        next_topic = weak_topics[0] if weak_topics else (items[0].topic_id if items else None)
        return RecommendResponse(user_id=user_id, items=items[:limit], next_best_topic=next_topic)

    def generate_mcq_questions(
        self,
        topic_ids: List[str],
        n: int,
        include_coding: bool,
    ) -> List[QuestionItem]:
        api_key = settings.gemini_api_key or settings.openai_api_key
        if not api_key:
            return self._mock_generate_mcq_questions(topic_ids, n, include_coding)
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        topics_str = ", ".join(self._catalog.get(tid, TopicCatalogEntry(tid, tid, [], 0.5, [], 0)).title for tid in topic_ids)
        
        prompt = f"""
        Generate exactly {n} multiple choice technical questions to assess a user's skills on the following topics: {topics_str}.
        Ensure there is a mix of simple conceptual questions and complex, tricky problem-solving scenarios.
        {f'Ensure at least one question is a coding-style question with a code snippet in the prompt.' if include_coding else ''}
        
        Return ONLY valid JSON matching this exact structure:
        [
            {{
                "topic_id": "{topic_ids[0]}",
                "type": "mcq",
                "prompt": "The question text. Be clear.",
                "options": [
                    {{"id": "a", "text": "The CORRECT answer"}},
                    {{"id": "b", "text": "Plausible distractor"}},
                    {{"id": "c", "text": "Another distractor"}},
                    {{"id": "d", "text": "Off-topic distractor"}}
                ],
                "difficulty": 0.6,
                "starter_code": null
            }}
        ]
        Crucial requirement: The first option (id='a') MUST be the correct answer.
        """
        
        try:
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            
            out: List[QuestionItem] = []
            for item in data:
                opts = []
                for op in item.get("options", []):
                    opts.append(QuestionOption(id=op.get("id", "a"), text=op.get("text", "")))
                    
                qt = QuestionType.coding if item.get("type") == "coding" else QuestionType.mcq
                out.append(QuestionItem(
                    question_id=generate_id("q-"),
                    topic_id=item.get("topic_id", topic_ids[0]),
                    type=qt,
                    prompt=item.get("prompt", ""),
                    options=opts,
                    difficulty=float(item.get("difficulty", 0.5)),
                    starter_code=item.get("starter_code")
                ))
            return out[:n]
        except Exception as e:
            logger.error(f"Generate questions AI error: {e}")
            return self._mock_generate_mcq_questions(topic_ids, n, include_coding)

    def _mock_generate_mcq_questions(
        self,
        topic_ids: List[str],
        n: int,
        include_coding: bool,
    ) -> List[QuestionItem]:
        out: List[QuestionItem] = []
        per_topic = max(1, n // max(1, len(topic_ids)))
        for tid in topic_ids:
            meta = self._catalog.get(tid)
            title = meta.title if meta else tid
            for i in range(per_topic):
                if len(out) >= n:
                    break
                qid = generate_id("q-")
                opts = [
                    QuestionOption(id="a", text=f"Correct concept for {title}"),
                    QuestionOption(id="b", text="Plausible distractor"),
                    QuestionOption(id="c", text="Another distractor"),
                    QuestionOption(id="d", text="Off-topic option"),
                ]
                out.append(
                    QuestionItem(
                        question_id=qid,
                        topic_id=tid,
                        type=QuestionType.mcq,
                        prompt=f"Which statement best describes {title}?",
                        options=opts,
                        difficulty=meta.difficulty if meta else 0.5,
                    )
                )
            if include_coding and len(out) < n:
                out.append(
                    QuestionItem(
                        question_id=generate_id("q-"),
                        topic_id=tid,
                        type=QuestionType.coding,
                        prompt=f"Implement a small function related to {title}.",
                        options=None,
                        difficulty=0.6,
                        starter_code="def solve():\n    pass\n",
                    )
                )
        return out[:n]

    def score_answer(self, question: QuestionItem, selected_option_id: Optional[str], code: Optional[str]) -> float:
        if question.type == QuestionType.mcq:
            return 1.0 if selected_option_id == "a" else 0.0
        if question.type == QuestionType.coding:
            return 1.0 if code and "def " in code and "return" in code else 0.3
        return 0.0

    def mastery_and_weakness(self, topic_scores: Dict[str, float]) -> Tuple[List[MasteryPoint], List[WeaknessRadar]]:
        mastery = [MasteryPoint(topic_id=k, mastery=v) for k, v in topic_scores.items()]
        weakness = [WeaknessRadar(topic_id=k, weakness_score=1.0 - v) for k, v in topic_scores.items()]
        mastery.sort(key=lambda x: x.mastery, reverse=True)
        weakness.sort(key=lambda x: x.weakness_score, reverse=True)
        return mastery, weakness

    def _daily_roadmap(self, modules: List[ModuleNode], hours_per_day: float = 2.0) -> List[Dict[str, object]]:
        """Split module hours into calendar days with a simple per-day budget."""
        roadmap: List[Dict[str, object]] = []
        if not modules or hours_per_day <= 0:
            return roadmap
        day = 1
        remaining_today = hours_per_day
        day_topics: List[str] = []
        planned_today = 0.0

        def flush_day() -> None:
            nonlocal day, day_topics, planned_today, remaining_today
            if not day_topics and planned_today <= 0:
                return
            roadmap.append(
                {
                    "day": day,
                    "topics": list(dict.fromkeys(day_topics)),
                    "planned_hours": round(planned_today, 2),
                }
            )
            day += 1
            day_topics = []
            planned_today = 0.0
            remaining_today = hours_per_day

        for m in modules:
            hours_left = m.estimated_hours
            while hours_left > 1e-6:
                chunk = min(remaining_today, hours_left)
                day_topics.append(m.topic_id)
                planned_today += chunk
                remaining_today -= chunk
                hours_left -= chunk
                if remaining_today <= 1e-6:
                    flush_day()
        flush_day()
        return roadmap

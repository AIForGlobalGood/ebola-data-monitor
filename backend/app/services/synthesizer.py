import json
from dataclasses import dataclass, field

from app.config import get_settings
from app.models import Article
from app.schemas import CitedFinding
from app.services.entities import locations_from_json
from app.services.text_utils import clean_html


@dataclass
class SynthesisResult:
    summary: str
    key_findings: list[str]
    recommendations: list[str]
    findings: list[CitedFinding] = field(default_factory=list)
    provider: str = "mock"


def _format_articles(articles: list[Article]) -> str:
    blocks = []
    for article in articles:
        summary = clean_html(article.summary, max_length=600) or "No summary available."
        blocks.append(
            "\n".join(
                [
                    f"[Article ID: {article.id}]",
                    f"Title: {article.title}",
                    f"Source: {article.source.name if article.source else 'Unknown'}",
                    f"Category: {article.category} | Severity: {getattr(article, 'severity', 'unknown')}",
                    f"Published: {article.published_at.isoformat() if article.published_at else 'unknown'}",
                    f"URL: {article.url}",
                    f"Summary: {summary}",
                ]
            )
        )
    return "\n\n---\n\n".join(blocks)


def _build_prompt(query: str | None, focus: str, articles: list[Article]) -> str:
    context = _format_articles(articles)
    user_query = query or "Provide a situational awareness briefing on current Ebola-related developments."

    return f"""You are an analyst supporting a global health foundation's emergency response team.
Your task is PUBLIC INFORMATION synthesis for situational awareness and decision support.
This is NOT a biosafety or laboratory use case — you are summarizing openly published news and alerts.

Focus area: {focus}
Analyst request: {user_query}

Use ONLY the articles below. Be factual, flag uncertainty, and separate confirmed facts from speculation.
Structure your response as JSON with keys:
- summary (2-4 paragraph executive overview)
- findings (array of objects, each with: text, article_ids [integers from Article ID labels], confidence one of confirmed|likely|unverified)
- recommendations (array of 3-5 actionable strings for program staff)

Articles:
{context}
"""


def _mock_synthesis(query: str | None, articles: list[Article]) -> SynthesisResult:
    top = sorted(articles, key=lambda a: a.relevance_score, reverse=True)[:6]
    regions = sorted({loc for a in top for loc in locations_from_json(a.locations)})
    categories = sorted({a.category for a in top})

    findings: list[CitedFinding] = []
    for article in top[:5]:
        summary = clean_html(article.summary, max_length=180) or article.title
        confidence = "confirmed" if article.severity in {"critical", "high"} else "likely"
        findings.append(
            CitedFinding(
                text=f"{summary} ({article.source.name if article.source else 'source'})",
                article_ids=[article.id],
                confidence=confidence,
            )
        )

    if len(top) > 5:
        findings.append(
            CitedFinding(
                text=f"{len(articles) - 5} additional articles indexed across {', '.join(categories) or 'multiple categories'}.",
                article_ids=[a.id for a in top[5:10]],
                confidence="likely",
            )
        )

    summary = (
        (
            f"Situational digest synthesizing {len(articles)} public articles"
            + (f' for "{query}"' if query else "")
            + f". Priority signal: {top[0].title}."
        )
        if top
        else "No articles available."
    )
    if regions:
        summary += f" Geographic focus: {', '.join(regions[:4])}."

    recommendations = [
        "Review critical and high-severity alerts on the Control Tower dashboard",
        "Cross-check outbreak signals against WHO and ReliefWeb primary sources",
        "Configure LLM_PROVIDER for richer narrative synthesis when API access is available",
    ]

    return SynthesisResult(
        summary=summary,
        key_findings=[f.text for f in findings],
        recommendations=recommendations,
        findings=findings,
        provider="mock",
    )


def _parse_llm_payload(payload: dict, articles: list[Article]) -> SynthesisResult:
    valid_ids = {a.id for a in articles}
    findings: list[CitedFinding] = []
    for item in payload.get("findings", []):
        if not isinstance(item, dict):
            continue
        article_ids = [int(i) for i in item.get("article_ids", []) if int(i) in valid_ids]
        findings.append(
            CitedFinding(
                text=str(item.get("text", "")),
                article_ids=article_ids,
                confidence=str(item.get("confidence", "likely")),
            )
        )

    if not findings and payload.get("key_findings"):
        legacy = payload.get("key_findings", [])
        for idx, text in enumerate(legacy):
            article = articles[idx] if idx < len(articles) else None
            findings.append(
                CitedFinding(
                    text=str(text),
                    article_ids=[article.id] if article else [],
                    confidence="likely",
                )
            )

    return SynthesisResult(
        summary=str(payload.get("summary", "")),
        key_findings=[f.text for f in findings],
        recommendations=[str(r) for r in payload.get("recommendations", [])],
        findings=findings,
        provider="openai",
    )


async def _openai_synthesis(prompt: str, articles: list[Article]) -> SynthesisResult:
    from openai import AsyncOpenAI

    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You synthesize public health news for emergency response teams. "
                    "Respond with valid JSON only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    payload = json.loads(response.choices[0].message.content or "{}")
    result = _parse_llm_payload(payload, articles)
    result.provider = "openai"
    return result


async def _anthropic_synthesis(prompt: str, articles: list[Article]) -> SynthesisResult:
    from anthropic import AsyncAnthropic

    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2500,
        system="You synthesize public health news for emergency response teams. Respond with valid JSON only.",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    text = response.content[0].text if response.content else "{}"
    payload = json.loads(text)
    result = _parse_llm_payload(payload, articles)
    result.provider = "anthropic"
    return result


async def synthesize_briefing(
    query: str | None,
    focus: str,
    articles: list[Article],
) -> SynthesisResult:
    if not articles:
        return SynthesisResult(
            summary="No articles available to synthesize. Fetch sources or broaden your search first.",
            key_findings=["Zero articles matched the request"],
            recommendations=["Run ingestion from the Sources panel", "Add or activate RSS feeds"],
            findings=[
                CitedFinding(text="Zero articles matched the request", article_ids=[], confidence="unverified")
            ],
            provider="mock",
        )

    settings = get_settings()
    prompt = _build_prompt(query, focus, articles)

    if settings.llm_provider == "openai" and settings.openai_api_key:
        try:
            return await _openai_synthesis(prompt, articles)
        except Exception:  # noqa: BLE001
            pass

    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        try:
            return await _anthropic_synthesis(prompt, articles)
        except Exception:  # noqa: BLE001
            pass

    return _mock_synthesis(query, articles)

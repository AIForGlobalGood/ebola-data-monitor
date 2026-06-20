import json
from dataclasses import dataclass

from app.config import get_settings
from app.models import Article


@dataclass
class SynthesisResult:
    summary: str
    key_findings: list[str]
    recommendations: list[str]
    provider: str


def _format_articles(articles: list[Article]) -> str:
    blocks = []
    for article in articles:
        blocks.append(
            "\n".join(
                [
                    f"Title: {article.title}",
                    f"Source: {article.source.name if article.source else 'Unknown'}",
                    f"Category: {article.category}",
                    f"Region: {article.region or 'unknown'}",
                    f"Published: {article.published_at.isoformat() if article.published_at else 'unknown'}",
                    f"URL: {article.url}",
                    f"Summary: {article.summary or 'No summary available.'}",
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

Use ONLY the articles below. Be factual, cite source titles inline, flag uncertainty, and separate
confirmed facts from speculation. Structure your response as JSON with keys:
- summary (2-4 paragraph executive overview)
- key_findings (array of 5-8 bullet strings)
- recommendations (array of 3-5 actionable strings for program staff)

Articles:
{context}
"""


def _mock_synthesis(query: str | None, articles: list[Article]) -> SynthesisResult:
    titles = [a.title for a in articles[:5]]
    regions = sorted({a.region for a in articles if a.region})
    categories = sorted({a.category for a in articles})

    summary = (
        f"Monitoring digest covering {len(articles)} public sources"
        + (f" for query: \"{query}\"" if query else "")
        + ". "
        + "Top signals include: "
        + "; ".join(titles[:3])
        + ("." if titles else " No articles matched.")
        + " Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for live LLM synthesis."
    )

    findings = [
        f"{len(articles)} articles ingested from active feeds",
        f"Categories represented: {', '.join(categories) or 'none'}",
        f"Regions represented: {', '.join(regions) or 'none'}",
        "Highest-relevance items prioritized for review",
        "Live synthesis available once an LLM provider is configured",
    ]

    recommendations = [
        "Review top-ranked outbreak and vaccine category articles",
        "Run fetch to refresh feeds before generating a live briefing",
        "Set LLM_PROVIDER=openai or anthropic with API credentials for full synthesis",
    ]

    return SynthesisResult(
        summary=summary,
        key_findings=findings,
        recommendations=recommendations,
        provider="mock",
    )


async def _openai_synthesis(prompt: str) -> SynthesisResult:
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
    return SynthesisResult(
        summary=payload.get("summary", ""),
        key_findings=payload.get("key_findings", []),
        recommendations=payload.get("recommendations", []),
        provider="openai",
    )


async def _anthropic_synthesis(prompt: str) -> SynthesisResult:
    from anthropic import AsyncAnthropic

    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2000,
        system="You synthesize public health news for emergency response teams. Respond with valid JSON only.",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    text = response.content[0].text if response.content else "{}"
    payload = json.loads(text)
    return SynthesisResult(
        summary=payload.get("summary", ""),
        key_findings=payload.get("key_findings", []),
        recommendations=payload.get("recommendations", []),
        provider="anthropic",
    )


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
            provider="mock",
        )

    settings = get_settings()
    prompt = _build_prompt(query, focus, articles)

    if settings.llm_provider == "openai" and settings.openai_api_key:
        try:
            return await _openai_synthesis(prompt)
        except Exception:  # noqa: BLE001
            pass

    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        try:
            return await _anthropic_synthesis(prompt)
        except Exception:  # noqa: BLE001
            pass

    return _mock_synthesis(query, articles)

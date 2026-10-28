"""Stage 2 [CONTROLLER]: Semantic Text Chunker."""

from typing import Dict, Any, List


def chunk_text(doc_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Split normalized document text into indexed semantic chunks."""
    body = doc_payload.get("body", "")
    paragraphs = [p.strip() for p in body.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [body]
    return [
        {
            "chunk_id": f"{doc_payload['doc_id']}#c{idx}",
            "content": para,
            "score": round(0.95 - (idx * 0.05), 2),
        }
        for idx, para in enumerate(paragraphs)
    ]

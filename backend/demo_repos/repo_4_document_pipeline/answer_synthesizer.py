"""Stage 4 [STORAGE_ADAPTER]: Grounded Answer Synthesizer."""

from typing import Dict, Any, List


def synthesize_response(retrieved_chunks: List[Dict[str, Any]], query: str) -> Dict[str, Any]:
    """Combine verified context chunks into a grounded response packet."""
    combined_context = " | ".join([c["content"] for c in retrieved_chunks])
    return {
        "status": "SYNTHESIZED",
        "query": query,
        "chunk_count": len(retrieved_chunks),
        "grounded_context": combined_context,
        "citations": [c["chunk_id"] for c in retrieved_chunks],
    }

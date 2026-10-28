"""Stage 3 [CORE_SERVICE]: Vector Index Retriever (Contains Breaking v2 SDK Schema Bug)."""

from typing import Dict, Any, List


def query_vector_index_v2(chunks: List[Dict[str, Any]], query: str) -> Dict[str, Any]:
    """Simulates v2 Vector SDK returning {'results': [{'chunk_id': ..., 'content': ..., 'score': ...}]}."""
    return {
        "version": "2.0",
        "query": query,
        "results": chunks,
    }


def retrieve_context(chunks: List[Dict[str, Any]], query: str, min_score: float = 0.80) -> List[Dict[str, Any]]:
    """Retrieve matching chunks from vector index.

    BUG (DEPRECATED V1 SCHEMA): Attempts to access v1 `response['matches']` and `item['text']`
    instead of v2 `response['results']` and `item['content']`, causing KeyError crash!
    """
    response = query_vector_index_v2(chunks, query)
    # BROKEN IN V2 SDK: 'matches' was renamed to 'results', and 'text' was renamed to 'content'
    raw_matches = response["matches"]
    return [
        {"chunk_id": item["chunk_id"], "content": item["text"], "score": item["score"]}
        for item in raw_matches
        if item["score"] >= min_score
    ]

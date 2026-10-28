"""Stage 1 [ENTRYPOINT]: Document Ingestion & Metadata Normalization."""

from typing import Dict, Any
from chunk_processor import chunk_text
from vector_retriever import retrieve_context
from answer_synthesizer import synthesize_response


def ingest_document(raw_doc: Dict[str, Any], query: str) -> Dict[str, Any]:
    """Entrypoint: Normalize document payload and execute the 4-stage knowledge pipeline."""
    normalized = {
        "doc_id": raw_doc.get("doc_id", "DOC-2026-01"),
        "title": raw_doc.get("title", "Architecture Specification"),
        "body": raw_doc.get("body", "").strip(),
    }
    chunks = chunk_text(normalized)
    retrieved = retrieve_context(chunks, query=query)
    return synthesize_response(retrieved, query=query)

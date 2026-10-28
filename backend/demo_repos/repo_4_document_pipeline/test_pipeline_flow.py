"""Pytest suite for the 4-stage Modular Document & Knowledge Pipeline."""

import pytest
from ingest_loader import ingest_document
from chunk_processor import chunk_text
from vector_retriever import retrieve_context


def test_chunk_processor_splits_paragraphs():
    chunks = chunk_text({"doc_id": "D1", "body": "First section.\nSecond section."})
    assert len(chunks) == 2
    assert chunks[0]["chunk_id"] == "D1#c0"
    assert chunks[0]["content"] == "First section."


def test_vector_retriever_v2_schema_contract():
    sample_chunks = [
        {"chunk_id": "D1#c0", "content": "Nebius Token Factory runs Nemotron 3.", "score": 0.95},
        {"chunk_id": "D1#c1", "content": "Unrelated low-score footer.", "score": 0.50},
    ]
    results = retrieve_context(sample_chunks, query="Nemotron 3", min_score=0.80)
    assert len(results) == 1
    assert results[0]["content"] == "Nebius Token Factory runs Nemotron 3."


def test_end_to_end_document_pipeline():
    doc = {
        "doc_id": "SPEC-100",
        "title": "PatchForge Spec",
        "body": "Tier 1 uses Nemotron Nano.\nTier 3 uses Nemotron Ultra.",
    }
    output = ingest_document(doc, query="How does PatchForge route models?")
    assert output["status"] == "SYNTHESIZED"
    assert output["chunk_count"] == 2
    assert "SPEC-100#c0" in output["citations"]

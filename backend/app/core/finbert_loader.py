"""Lazy-loaded FinBERT for scoring a single live headline (used by
POST /predictions/live). Separate from utils/finbert.py (which is used by
the offline notebooks) so the API doesn't import notebook-only code, but
the logic and fallback behavior is identical."""
import os
from functools import lru_cache

INDIAN_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml_models", "finbert_indian"
)


def _has_real_weights(path):
    if not os.path.exists(path):
        return False
    return any(os.path.exists(os.path.join(path, f))
               for f in ["pytorch_model.bin", "model.safetensors"])


@lru_cache(maxsize=1)
def _load():
    from transformers import BertTokenizer, BertForSequenceClassification

    if _has_real_weights(INDIAN_MODEL_PATH):
        tokenizer = BertTokenizer.from_pretrained(INDIAN_MODEL_PATH)
        model = BertForSequenceClassification.from_pretrained(INDIAN_MODEL_PATH)
    else:
        tokenizer = BertTokenizer.from_pretrained("ProsusAI/finbert")
        model = BertForSequenceClassification.from_pretrained("ProsusAI/finbert")

    model.eval()
    return tokenizer, model


def score_headline(text: str):
    import torch
    from torch.nn.functional import softmax

    tokenizer, model = _load()
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256, padding=True)

    with torch.no_grad():
        outputs = model(**inputs)

    probs = softmax(outputs.logits, dim=1)
    labels = ["positive", "negative", "neutral"]
    pos, neg = probs[0][0].item(), probs[0][1].item()
    top = torch.argmax(probs, dim=1).item()

    return {
        "label": labels[top],
        "score": round(probs[0][top].item(), 4),
        "compound": round(pos - neg, 4),
    }

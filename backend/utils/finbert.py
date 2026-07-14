from transformers import BertTokenizer, BertForSequenceClassification
from torch.nn.functional import softmax
import torch
import os

# Load fine-tuned Indian FinBERT if real weight files exist, otherwise fall
# back to the base ProsusAI/finbert model. Fine-tuning is intentionally out
# of scope for this rebuild — this only checks for actual model weights
# (not just the folder/config/tokenizer, which can exist without weights).
INDIAN_MODEL_PATH = "../ml_models/finbert_indian"


def _has_real_weights(path):
    if not os.path.exists(path):
        return False
    weight_files = ["pytorch_model.bin", "model.safetensors"]
    return any(os.path.exists(os.path.join(path, f)) for f in weight_files)


if _has_real_weights(INDIAN_MODEL_PATH):
    print("Loading fine-tuned Indian FinBERT...")
    tokenizer = BertTokenizer.from_pretrained(INDIAN_MODEL_PATH)
    model = BertForSequenceClassification.from_pretrained(INDIAN_MODEL_PATH)
else:
    print("Fine-tuned weights not found — loading base FinBERT (ProsusAI/finbert)...")
    tokenizer = BertTokenizer.from_pretrained("ProsusAI/finbert")
    model = BertForSequenceClassification.from_pretrained("ProsusAI/finbert")

model.eval()
print("FinBERT ready.")

LABELS = ["positive", "negative", "neutral"]


def score_sentiment(text):
    """Scores a single headline.
    Returns label, confidence score, and compound score (-1 to +1).
    compound = positive probability minus negative probability
    """
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding=True
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probs = softmax(outputs.logits, dim=1)
    pos = probs[0][0].item()
    neg = probs[0][1].item()
    top = torch.argmax(probs, dim=1).item()
    label = LABELS[top]
    score = round(probs[0][top].item(), 4)
    compound = round(pos - neg, 4)

    return label, score, compound


def score_batch(texts, batch_size=32):
    """Scores a list of texts in batches.
    Batch size 32 is good for CPU. Reduce to 16 if you get memory errors.
    Returns list of (label, score, compound) tuples.
    """
    results = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        inputs = tokenizer(
            batch,
            return_tensors="pt",
            truncation=True,
            max_length=256,
            padding=True
        )

        with torch.no_grad():
            outputs = model(**inputs)

        probs = softmax(outputs.logits, dim=1)

        for j in range(len(batch)):
            pos = probs[j][0].item()
            neg = probs[j][1].item()
            top = torch.argmax(probs[j]).item()
            label = LABELS[top]
            score = round(probs[j][top].item(), 4)
            compound = round(pos - neg, 4)
            results.append((label, score, compound))

        print(f"  Scored {min(i + batch_size, len(texts)):,} / {len(texts):,}")

    return results

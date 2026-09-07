import time
from typing import Type, TypeVar

from google import genai
from google.genai import errors as genai_errors
from pydantic import BaseModel

from app.config import GEMINI_API_KEY, MODEL_NAME

T = TypeVar("T", bound=BaseModel)

RETRYABLE_CODES = {429, 503}
MAX_RETRIES = 3
BASE_DELAY_SECONDS = 2.0


def generate_structured(prompt: str, response_model: Type[T]) -> T:
    """One Gemini structured-output call, with retry/backoff on transient
    429 (quota/rate limit) and 503 (overloaded) errors. Any other error,
    or exhausting retries, raises to the caller.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to backend/.env before calling Gemini."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": response_model,
                },
            )
            return response_model.model_validate_json(response.text)
        except genai_errors.APIError as e:
            last_error = e
            if e.code not in RETRYABLE_CODES or attempt == MAX_RETRIES:
                raise
            time.sleep(BASE_DELAY_SECONDS * (2**attempt))

    raise last_error  # unreachable, satisfies type checkers

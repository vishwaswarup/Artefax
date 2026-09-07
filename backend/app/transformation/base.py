from typing import Protocol, Type

from pydantic import BaseModel

from app.intelligence.gemini_client import generate_structured
from app.schemas.artifacts import OutputType
from app.schemas.brief import ContentBrief


class Transformer(Protocol):
    output_type: OutputType
    response_model: Type[BaseModel]

    def build_prompt(self, brief: ContentBrief) -> str: ...

    def generate(self, brief: ContentBrief) -> BaseModel: ...


class BaseTransformer:
    """Shared Gemini structured-output call. Subclasses only define a
    prompt template and a response_model — the actual API call and
    validation path is identical for every output type.
    """

    output_type: OutputType
    response_model: Type[BaseModel]

    def build_prompt(self, brief: ContentBrief) -> str:
        raise NotImplementedError

    def generate(self, brief: ContentBrief) -> BaseModel:
        return generate_structured(self.build_prompt(brief), self.response_model)


TRANSFORMER_REGISTRY: dict[OutputType, BaseTransformer] = {}


def register_transformer(transformer: BaseTransformer) -> None:
    TRANSFORMER_REGISTRY[transformer.output_type] = transformer


def get_transformer(output_type: OutputType) -> BaseTransformer:
    return TRANSFORMER_REGISTRY[output_type]

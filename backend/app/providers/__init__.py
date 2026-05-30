from app.providers.base import Provider, ProviderHealth, MangaResult, MangaDetail, ChapterResult
from app.providers.mangadex import MangaDexProvider
from app.providers.omegascans import OmegaScansProvider
from app.providers.mangakatana import MangaKatanaProvider
from app.providers.asurascans import AsuraScansProvider

# Registry: provider_id → provider instance
_REGISTRY: dict[str, Provider] = {
    p.id: p()
    for p in [MangaDexProvider, OmegaScansProvider, MangaKatanaProvider, AsuraScansProvider]
}


def get_provider(provider_id: str) -> Provider | None:
    return _REGISTRY.get(provider_id)


def list_providers() -> list[Provider]:
    return list(_REGISTRY.values())


def register_provider(provider: Provider):
    _REGISTRY[provider.id] = provider

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass
class ProviderUser:
    id: UUID
    email: str | None


class AuthProvider(ABC):
    @abstractmethod
    async def verify_token(self, token: str) -> ProviderUser:
        """Verify the token and return a normalized ProviderUser.
        Raise UnauthorizedError if the token is invalid or expired.
        """
        ...

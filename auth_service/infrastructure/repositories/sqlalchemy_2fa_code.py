from datetime import datetime, timezone
from domain.models import TwoFactorCode
from domain.repositories.two_factor_auth import TwoFactorCodeRepository
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from infrastructure.models import TwoFactorCode as TwoFactorCodeModel


class SQLAlchemyTwoFactorCodeRepository(TwoFactorCodeRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(
        self, user_id: int, code: str, expires_at: datetime
    ) -> TwoFactorCode:
        new_code = TwoFactorCodeModel(user_id=user_id, code=code, expires_at=expires_at)
        self.session.add(new_code)
        await self.session.commit()
        await self.session.refresh(new_code)

    async def verify(self, user_id: int, code: str) -> bool:
        stmt = (
            select(TwoFactorCodeModel)
            .where(TwoFactorCodeModel.user_id == user_id)
            .where(TwoFactorCodeModel.code == code)
            .where(TwoFactorCodeModel.expires_at > datetime.now(timezone.utc))
        )

        result = await self.session.execute(stmt)
        code_obj = result.scalar_one_or_none()

        return code_obj is not None

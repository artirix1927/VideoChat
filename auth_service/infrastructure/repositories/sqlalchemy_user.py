from domain.models import User
from domain.repositories.user import UserRepository
from infrastructure.models import User as UserModel

from sqlalchemy.orm import Session

from infrastructure.mappers import user_from_model


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, session):
        self.session: Session = session

    def _user_model_to_entity(self, user_model: UserModel) -> User:
        return User(
            id=user_model.id,
            username=user_model.username,
            hashed_password=user_model.hashed_password,
        )

    def get_by_id(self, user_id: str) -> User:
        user_model = self.session.query(UserModel).get(user_id)
        return self._user_model_to_entity(user_model)

    def get_by_username(self, username: str) -> User:
        user_model = self.session.query(UserModel).filter_by(username=username).first()
        return self._user_model_to_entity(user_model)

    def create_user(self, username: str, hashed_password: str) -> User:
        user_entity = User.create_user(
            username=username, hashed_password=hashed_password
        )
        model = UserModel(
            username=user_entity.username, hashed_password=user_entity.hashed_password
        )
        self.session.add(model)
        self.session.commit()

        return user_from_model(model)

    def save(self, user: User):
        user_orm: UserModel = self.session.query(UserModel).get(user.id)

        if user_orm:
            user_orm.hashed_password = user.hashed_password
            user_orm.username = user.username
            self.session.add(user_orm)
            self.session.commit()
            return user

        return self.create_user()

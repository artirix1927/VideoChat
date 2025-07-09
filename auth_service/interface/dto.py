from pydantic import BaseModel


class RegisterUser(BaseModel):
    username: str
    password: str
    email: str


class LoginUser(BaseModel):
    username: str
    password: str


class VerifyUser(BaseModel):
    user_id: int
    code: str


class GetUser(BaseModel):
    access_token: str

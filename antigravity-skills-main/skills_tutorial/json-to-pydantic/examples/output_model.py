from pydantic import BaseModel


class Preferences(BaseModel):
    theme: str
    notifications: list[str]


class User(BaseModel):
    user_id: int
    username: str
    is_active: bool
    preferences: Preferences
    last_login: str | None = None
    meta_tags: list[str] | None = None

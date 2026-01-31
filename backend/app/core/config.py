from pydantic import BaseSettings, ConfigDict

class Settings(BaseSettings):
    mongo_uri: str = "mongodb://mongo:27017/mydb"
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "CHANGE_ME"
    access_token_expire_minutes: int = 60

    model_config = ConfigDict(env_file = ".env")

settings = Settings()

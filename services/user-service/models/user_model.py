from pydantic import BaseModel

class User(BaseModel):
    name: str
    email: str
    password: str
    role: str = "customer"
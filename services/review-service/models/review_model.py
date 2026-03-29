from pydantic import BaseModel

class ReviewModel(BaseModel):
    user_id: str
    rating: int
    comment: str
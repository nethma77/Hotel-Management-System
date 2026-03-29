from datetime import date

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class BookingBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    user_id: str | None = Field(
        default=None,
        min_length=1,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    room_id: str | None = Field(
        default=None,
        min_length=1,
        validation_alias=AliasChoices("room_id", "roomId"),
    )
    check_in: date | None = Field(
        default=None,
        validation_alias=AliasChoices("check_in", "checkIn"),
    )
    check_out: date | None = Field(
        default=None,
        validation_alias=AliasChoices("check_out", "checkOut"),
    )
    total_price: float | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("total_price", "totalPrice"),
    )


class Booking(BookingBase):
    user_id: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    room_id: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("room_id", "roomId"),
    )
    check_in: date = Field(
        ...,
        validation_alias=AliasChoices("check_in", "checkIn"),
    )
    check_out: date = Field(
        ...,
        validation_alias=AliasChoices("check_out", "checkOut"),
    )
    total_price: float = Field(
        ...,
        ge=0,
        validation_alias=AliasChoices("total_price", "totalPrice"),
    )


class BookingUpdate(BookingBase):
    pass


class BookingDetails(BaseModel):
    _id: str
    user_id: str
    room_id: str
    check_in: date
    check_out: date
    total_price: float


class BookingWriteResponse(BaseModel):
    message: str
    booking: BookingDetails


Booking.model_config = ConfigDict(
    populate_by_name=True,
    extra="forbid",
    json_schema_extra={
        "example": {
            "user_id": "user123",
            "room_id": "room101",
            "check_in": "2026-04-07",
            "check_out": "2026-04-10",
            "total_price": 5000,
        }
    },
)

BookingUpdate.model_config = ConfigDict(
    populate_by_name=True,
    extra="forbid",
    json_schema_extra={
        "example": {
            "user_id": "user123",
            "room_id": "room101",
            "check_in": "2026-04-07",
            "check_out": "2026-04-10",
            "total_price": 5000,
        }
    },
)

BookingDetails.model_config = ConfigDict(
    populate_by_name=True,
    extra="forbid",
    json_schema_extra={
        "example": {
            "_id": "69c7fc56b1235cb0fc652733",
            "user_id": "user123",
            "room_id": "room101",
            "check_in": "2026-04-07",
            "check_out": "2026-04-10",
            "total_price": 5000,
        }
    },
)

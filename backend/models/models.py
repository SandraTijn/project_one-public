from pydantic import BaseModel
import datetime


# class DTOLampStatus(BaseModel):
#     nieuwe_status: int


# class LampStatus(BaseModel):
#     lamp: int
#     status: int

# [{'DeviceID': 3}, {'DeviceID': 4}, {'DeviceID': 5}, {'DeviceID': 6}, {'DeviceID': 8}]
class Device(BaseModel):
    DeviceID:  int
    type: str
    meeteenheid: str | None
    naam: str
    beschrijving: str | None
    triggerwaarde: float | None

class Triggerwaarde(BaseModel):
    deviceID: int
    naam: str
    triggerwaarde: float | None

class User(BaseModel):
    rfidID: int | None
    userID: int
    name: str

class LastUser(BaseModel):
    username: str
    datum_en_tijd: datetime.datetime


class Historiek(BaseModel):
    HistoriekID: int
    deviceID: int
    actieID: int | None
    datum_en_tijd: datetime.datetime
    waarde: float | None
    userID: int | None
    comment: str | None

class IsPost(BaseModel):
    isPost: bool

class LaatsteLevering(BaseModel):
    laatsteLevering: datetime.datetime

class DelayTime(BaseModel):
    DeviceID: int
    naam: str
    delaytime: int



class DTOSensorWaarde(BaseModel):
    DeviceID: int
    waarde: float
    comment: str | None

class DTODelaytime(BaseModel):
    deviceID: int
    delaytime: int

class DTOTriggerwaarde(BaseModel):
    deviceID: int
    triggerwaarde: int

class DTOPassword(BaseModel):
    password: str

class DTOAction(BaseModel):
    deviceID: int
    value: bool

import enum


class Category(str, enum.Enum):
    Finance = "Finance"
    Legal = "Legal"
    Procurement = "Procurement"
    Operations = "Operations"


class Priority(str, enum.Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"


class Status(str, enum.Enum):
    Open = "Open"
    InProgress = "In Progress"
    Closed = "Closed"
    Cancelled = "Cancelled"

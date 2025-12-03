# app/models.py
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

# ВАЖНО: Base объявляем ЗДЕСЬ, без импорта из app.db или app.models
Base = declarative_base()


class League(Base):
    __tablename__ = "league"

    id = Column(Integer, primary_key=True)
    shortcut = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False, default="Germany")
    sport = Column(String, nullable=False, default="Football")

    seasons = relationship("Season", back_populates="league")


class Season(Base):
    __tablename__ = "season"

    id = Column(Integer, primary_key=True)
    league_id = Column(Integer, ForeignKey("league.id"), nullable=False)
    year = Column(Integer, nullable=False)
    is_current = Column(Boolean, nullable=False, default=False)

    league = relationship("League", back_populates="seasons")
    matches = relationship("Match", back_populates="season")


class Match(Base):
    __tablename__ = "match"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    external_match_id = Column(Integer, nullable=False)
    league_id = Column(Integer, ForeignKey("league.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("season.id"), nullable=False)
    group_order_id = Column(Integer, nullable=False)
    kickoff_utc = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False)
    team1_name = Column(String, nullable=False)
    team2_name = Column(String, nullable=False)
    score_team1 = Column(Integer)
    score_team2 = Column(Integer)
    raw_payload = Column(JSON)

    season = relationship("Season", back_populates="matches")

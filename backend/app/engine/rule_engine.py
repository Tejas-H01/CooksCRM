from abc import ABC, abstractmethod
from typing import List
from sqlalchemy.orm import Session
from app.models.models import Event, Action

class BaseRule(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def evaluate(self, db: Session, event: Event) -> List[Action]:
        """
        Evaluate the rule against the incoming event and database state.
        Returns a list of unsaved Action instances.
        """
        pass

class RuleEngine:
    def __init__(self) -> None:
        self.rules: List[BaseRule] = []

    def register_rule(self, rule: BaseRule) -> None:
        self.rules.append(rule)

    async def evaluate_rules(self, db: Session, event: Event) -> List[Action]:
        generated_actions: List[Action] = []
        for rule in self.rules:
            try:
                actions = await rule.evaluate(db, event)
                if actions:
                    generated_actions.extend(actions)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"RuleEngine: Error evaluating rule '{rule.name}': {e}", exc_info=True)
        return generated_actions

rule_engine = RuleEngine()

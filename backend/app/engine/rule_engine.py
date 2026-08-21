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
        import logging
        rule_logger = logging.getLogger(__name__)
        for rule in self.rules:
            try:
                actions = await rule.evaluate(db, event)
                result_str = "MATCH" if actions else "NO_MATCH"
                reason_str = f" reasons={[a.reason for a in actions]}" if actions else ""
                rule_logger.info(f"[RULE] event={event.id} rule={rule.name} result={result_str}{reason_str}")
                if actions:
                    generated_actions.extend(actions)
            except Exception as e:
                rule_logger.error(f"RuleEngine: Error evaluating rule '{rule.name}': {e}", exc_info=True)
        return generated_actions

rule_engine = RuleEngine()

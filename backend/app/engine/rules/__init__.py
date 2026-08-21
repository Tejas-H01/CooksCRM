from app.engine.rule_engine import rule_engine
from app.engine.rules.sla_breach import SLABreachRule
from app.engine.rules.payin_opportunity import PayinOpportunityRule
from app.engine.rules.high_intent import HighIntentRule
from app.engine.rules.target_gap import TargetGapRule
from app.engine.rules.special_achievement import SpecialAchievementRule

from app.engine.rules.opportunity_suggestion import OpportunitySuggestionRule

# Register all rules to the singleton
rule_engine.register_rule(SLABreachRule())
rule_engine.register_rule(PayinOpportunityRule())
rule_engine.register_rule(HighIntentRule())
rule_engine.register_rule(TargetGapRule())
rule_engine.register_rule(SpecialAchievementRule())
rule_engine.register_rule(OpportunitySuggestionRule())

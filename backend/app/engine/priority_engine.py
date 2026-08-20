from typing import Dict, Any, Tuple
from app.core.config import settings

class PriorityEngine:
    @staticmethod
    def calculate_priority(
        urgency: float,
        opportunity_value: float,
        sla_risk: float,
        customer_importance: float,
        intent: float
    ) -> Tuple[str, int, Dict[str, int]]:
        """
        Calculate priority level, score (0-100), and breakdown factors.
        """
        # Clamp inputs to 0-100
        u = max(0.0, min(100.0, urgency))
        ov = max(0.0, min(100.0, opportunity_value))
        sr = max(0.0, min(100.0, sla_risk))
        ci = max(0.0, min(100.0, customer_importance))
        it = max(0.0, min(100.0, intent))

        score = (
            u * settings.WEIGHT_URGENCY +
            ov * settings.WEIGHT_OPPORTUNITY_VALUE +
            sr * settings.WEIGHT_SLA_RISK +
            ci * settings.WEIGHT_CUSTOMER_IMPORTANCE +
            it * settings.WEIGHT_INTENT
        )

        final_score = int(round(score))

        # Map:
        # 90-100 -> CRITICAL
        # 75-89  -> HIGH
        # 50-74  -> MEDIUM
        # 0-49   -> LOW
        if final_score >= 90:
            priority = "CRITICAL"
        elif final_score >= 75:
            priority = "HIGH"
        elif final_score >= 50:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        factors = {
            "urgency": int(round(u)),
            "opportunity_value": int(round(ov)),
            "sla_risk": int(round(sr)),
            "customer_importance": int(round(ci)),
            "intent": int(round(it))
        }

        return priority, final_score, factors

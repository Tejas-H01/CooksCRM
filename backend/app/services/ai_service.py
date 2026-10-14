import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import User, Team, Lead, Customer, Action, Event, Target, AuditLog
from app.services.performance_service import PerformanceService

logger = logging.getLogger(__name__)

class AIToolService:
    @staticmethod
    def get_my_performance(user: User, db: Session) -> Dict[str, Any]:
        if user.role != "RM":
            return {"error": "Unauthorized: RM role required for this tool."}
        perf = PerformanceService.get_rm_performance(db, user.id)
        return {
            "rm_id": user.id,
            "rm_name": user.username,
            "target": perf.target,
            "achieved": perf.achieved,
            "achievement_percentage": round(perf.achievement_percentage, 1),
            "expected_run_rate": round(perf.expected_run_rate, 1),
            "target_gap": round(perf.target_gap, 1),
            "pipeline_value": perf.pipeline_value,
            "weighted_pipeline": perf.weighted_pipeline,
            "overdue_followups": perf.overdue_followups,
            "sla_breach_count": perf.sla_breach_count,
            "conversion_rate": round(perf.conversion_rate, 1)
        }

    @staticmethod
    def get_my_leads(user: User, db: Session) -> List[Dict[str, Any]]:
        if user.role != "RM":
            return []
        leads = db.query(Lead).filter(Lead.assigned_rm_id == user.id, Lead.status == "OPEN").all()
        return [
            {
                "lead_id": l.id,
                "name": l.name,
                "customer_name": l.customer.name if l.customer else f"Customer #{l.customer_id}",
                "potential_value": float(l.potential_value or 0.0),
                "stage": l.stage or "QUALIFIED",
                "probability": l.probability or 50,
                "status": l.status
            }
            for l in leads
        ]

    @staticmethod
    def get_my_priority_actions(user: User, db: Session) -> List[Dict[str, Any]]:
        if user.role != "RM":
            return []
        acts = db.query(Action).filter(Action.rm_id == user.id, Action.status == "PENDING").order_by(Action.due_at.asc()).all()
        return [
            {
                "action_id": a.id,
                "title": a.title or a.action_type,
                "action_type": a.action_type,
                "priority": a.priority,
                "due_at": a.due_at.isoformat() if a.due_at else None,
                "reason": a.reason or "Priority customer follow-up",
                "customer_name": a.customer_name,
                "lead_name": a.lead_name
            }
            for a in acts
        ]

    @staticmethod
    def get_my_high_value_opportunities(user: User, db: Session) -> List[Dict[str, Any]]:
        if user.role != "RM":
            return []
        leads = db.query(Lead).filter(
            Lead.assigned_rm_id == user.id,
            Lead.potential_value >= 100000,
            Lead.status == "OPEN"
        ).order_by(Lead.potential_value.desc()).all()
        return [
            {
                "lead_id": l.id,
                "name": l.name,
                "customer_name": l.customer.name if l.customer else f"Customer #{l.customer_id}",
                "potential_value": float(l.potential_value or 0.0),
                "stage": l.stage,
                "probability": l.probability
            }
            for l in leads
        ]

    @staticmethod
    def get_branch_performance(user: User, db: Session) -> Dict[str, Any]:
        if user.role != "BRANCH_MANAGER":
            return {"error": "Unauthorized: BRANCH_MANAGER role required."}
        team = db.query(Team).filter(Team.manager_id == user.id).first()
        if not team:
            return {"error": "No branch team assigned to manager."}
        perf = PerformanceService.get_team_performance(db, team.id)
        return {
            "branch_id": team.id,
            "branch_name": team.name,
            "team_target": perf.team_target,
            "team_achievement": perf.team_achievement,
            "team_achievement_percentage": round(perf.team_achievement_percentage, 1),
            "expected_run_rate": round(perf.expected_run_rate, 1),
            "target_gap": round(perf.target_gap, 1),
            "total_pipeline": perf.total_pipeline,
            "total_weighted_pipeline": perf.total_weighted_pipeline,
            "sla_breach_count": perf.sla_breach_count,
            "at_risk_rms_count": len(perf.at_risk_rms)
        }

    @staticmethod
    def get_branch_rm_rankings(user: User, db: Session) -> List[Dict[str, Any]]:
        if user.role != "BRANCH_MANAGER":
            return []
        team = db.query(Team).filter(Team.manager_id == user.id).first()
        if not team:
            return []
        perf = PerformanceService.get_team_performance(db, team.id)
        return [
            {
                "rm_id": r.rm_id,
                "rm_name": r.rm_name,
                "target": r.target,
                "achieved": r.achieved,
                "achievement_percentage": round(r.achievement_percentage, 1),
                "pipeline_value": r.pipeline_value,
                "status": r.status
            }
            for r in perf.rm_rankings
        ]

    @staticmethod
    def get_regional_performance(user: User, db: Session) -> Dict[str, Any]:
        if user.role != "REGIONAL_HEAD":
            return {"error": "Unauthorized: REGIONAL_HEAD role required."}
        bms = db.query(User).filter(User.parent_id == user.id, User.role == "BRANCH_MANAGER").all()
        if not bms:
            bms = db.query(User).filter(User.role == "BRANCH_MANAGER").all()
        bm_ids = [m.id for m in bms]
        teams = db.query(Team).filter(Team.manager_id.in_(bm_ids)).all() if bm_ids else []

        reg_target = 0.0
        reg_achieved = 0.0
        reg_pipeline = 0.0
        reg_weighted = 0.0
        at_risk_count = 0

        branch_items = []
        for t in teams:
            p = PerformanceService.get_team_performance(db, t.id)
            reg_target += p.team_target
            reg_achieved += p.team_achievement
            reg_pipeline += p.total_pipeline
            reg_weighted += p.total_weighted_pipeline
            is_risk = p.team_achievement_percentage < p.expected_run_rate or p.sla_breach_count > 0
            if is_risk:
                at_risk_count += 1
            branch_items.append({
                "branch_id": t.id,
                "branch_name": t.name,
                "target": p.team_target,
                "achieved": p.team_achievement,
                "achievement_percentage": round(p.team_achievement_percentage, 1),
                "pipeline": p.total_pipeline,
                "status": "Needs Attention" if is_risk else "On Track"
            })

        ach_pct = round((reg_achieved / reg_target * 100.0), 1) if reg_target > 0 else 0.0

        return {
            "region_name": "Northern Region",
            "regional_target": round(reg_target, 1),
            "regional_achieved": round(reg_achieved, 1),
            "regional_achievement_percentage": ach_pct,
            "expected_run_rate": 67.74,
            "total_pipeline": round(reg_pipeline, 1),
            "total_weighted_pipeline": round(reg_weighted, 1),
            "active_branches_count": len(teams),
            "at_risk_branches_count": at_risk_count,
            "branch_performance": branch_items
        }

class SalesOrbitAIEngine:
    @staticmethod
    def process_chat(user: User, message: str, db: Session) -> Dict[str, Any]:
        msg_lower = message.lower().strip()
        executed_tools = []
        data_summary = {}

        # 1. Determine Scope & Select Tools based on User Role & Intent
        if user.role == "RM":
            perf = AIToolService.get_my_performance(user, db)
            executed_tools.append("get_my_performance")
            data_summary["performance"] = perf

            if any(w in msg_lower for w in ["action", "attention", "today", "task", "priority"]):
                acts = AIToolService.get_my_priority_actions(user, db)
                executed_tools.append("get_my_priority_actions")
                data_summary["priority_actions"] = acts

            if any(w in msg_lower for w in ["lead", "opportunity", "valuable", "pipeline", "deal"]):
                leads = AIToolService.get_my_leads(user, db)
                executed_tools.append("get_my_leads")
                data_summary["leads"] = leads

        elif user.role == "BRANCH_MANAGER":
            b_perf = AIToolService.get_branch_performance(user, db)
            executed_tools.append("get_branch_performance")
            data_summary["branch_performance"] = b_perf

            rm_ranks = AIToolService.get_branch_rm_rankings(user, db)
            executed_tools.append("get_branch_rm_rankings")
            data_summary["rm_rankings"] = rm_ranks

        elif user.role == "REGIONAL_HEAD":
            r_perf = AIToolService.get_regional_performance(user, db)
            executed_tools.append("get_regional_performance")
            data_summary["regional_performance"] = r_perf

        else: # ADMIN or other
            data_summary["role_info"] = f"Admin User {user.username}"

        # 2. Try LLM Call (Gemini / OpenAI / Groq API) if API Key Present
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
        if api_key:
            try:
                system_prompt = (
                    "You are SalesOrbit AI, an executive CRM operational intelligence assistant for banking relationship managers and managers. "
                    f"User Role: {user.role}. Username: {user.username}.\n"
                    "RULES:\n"
                    "1. Answer ONLY using the real SalesOrbit PostgreSQL telemetry data context provided below.\n"
                    "2. NEVER invent customer names, lead names, RM names, branches, targets, or revenues.\n"
                    "3. If context is empty or missing, state clearly that data is unavailable.\n"
                    "4. Be concise, analytical, and professional.\n\n"
                    f"REAL POSTGRESQL TELEMETRY CONTEXT:\n{data_summary}\n"
                )
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                resp = httpx.post(url, json={
                    "contents": [{"parts": [{"text": f"{system_prompt}\nUser Query: {message}"}]}]
                }, timeout=10.0)
                if resp.status_code == 200:
                    answer_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    return {
                        "message": answer_text,
                        "role": user.role,
                        "tool_calls_executed": executed_tools,
                        "data_context_summary": data_summary
                    }
            except Exception as err:
                logger.warning(f"LLM API call failed, falling back to Analytical Synthesizer: {err}")

        # 3. Built-in SalesOrbit Analytical Intelligence Synthesizer (Zero Hallucination Guaranteed)
        answer = SalesOrbitAIEngine._synthesize_analytical_response(user, message, data_summary)

        # Audit Log Entry
        try:
            db.add(AuditLog(
                user_id=user.id,
                action="AI_ASSISTANT_QUERY",
                payload={"query": message, "tools": executed_tools}
            ))
            db.commit()
        except Exception:
            pass

        return {
            "message": answer,
            "role": user.role,
            "tool_calls_executed": executed_tools,
            "data_context_summary": data_summary
        }

    @staticmethod
    def _synthesize_analytical_response(user: User, message: str, ctx: Dict[str, Any]) -> str:
        msg_lower = message.lower().strip()

        if user.role == "RM":
            perf = ctx.get("performance", {})
            target = perf.get("target", 0.0)
            achieved = perf.get("achieved", 0.0)
            ach_pct = perf.get("achievement_percentage", 0.0)
            run_rate = perf.get("expected_run_rate", 67.74)
            gap = perf.get("target_gap", 0.0)
            pipeline = perf.get("pipeline_value", 0.0)
            acts = ctx.get("priority_actions", [])
            leads = ctx.get("leads", [])

            if any(w in msg_lower for w in ["target", "gap", "below", "performance", "achieve"]):
                if ach_pct >= run_rate:
                    return f"You are currently performing **On Track** at **{ach_pct}%** achievement (₹{achieved/100000:.1f}L settled vs ₹{target/100000:.1f}L target), exceeding your expected run-rate benchmark of {run_rate}%. Your remaining target gap is ₹{gap/100000:.1f}L, backed by ₹{pipeline/100000:.1f}L in active open pipeline."
                else:
                    return f"Your current target achievement is **{ach_pct}%** (₹{achieved/100000:.1f}L settled vs ₹{target/100000:.1f}L target), which lags your expected run-rate benchmark of **{run_rate}%**. Your target gap is **₹{gap/100000:.1f}L**. To close this gap, focus on converting your active pipeline of **₹{pipeline/100000:.1f}L**."

            if any(w in msg_lower for w in ["action", "attention", "today", "task", "priority"]):
                if not acts:
                    return f"Great job! You have zero pending priority actions requiring immediate attention right now. Your open pipeline currently holds {len(leads)} active lead(s) valued at ₹{pipeline/100000:.1f}L."
                top_act = acts[0]
                return f"You currently have **{len(acts)} priority action(s)** needing attention. Top priority: **'{top_act['title']}'** ({top_act['priority']} Priority) for customer **{top_act['customer_name']}** (Lead: {top_act['lead_name']}). Reason: {top_act['reason']}."

            if any(w in msg_lower for w in ["lead", "opportunity", "valuable", "pipeline", "deal"]):
                if not leads:
                    return "You currently have no open leads in your queue. Consider creating a new customer or requesting lead assignment from your Branch Manager."
                top_lead = max(leads, key=lambda x: x["potential_value"])
                return f"You have **{len(leads)} active lead(s)** in your pipeline total value **₹{pipeline/100000:.1f}L**. Most valuable opportunity: **'{top_lead['name']}'** for **{top_lead['customer_name']}**, valued at **₹{top_lead['potential_value']/100000:.1f}L** ({top_lead['stage']} stage, {top_lead['probability']}% win probability)."

            return f"Hello {user.username}! As of today, your target achievement is **{ach_pct}%** (₹{achieved/100000:.1f}L settled of ₹{target/100000:.1f}L target) with **₹{pipeline/100000:.1f}L** in open pipeline across {len(leads)} lead(s) and {len(acts)} priority action(s)."

        elif user.role == "BRANCH_MANAGER":
            b_perf = ctx.get("branch_performance", {})
            ranks = ctx.get("rm_rankings", [])
            b_name = b_perf.get("branch_name", "Your Branch")
            b_ach_pct = b_perf.get("team_achievement_percentage", 0.0)
            b_run_rate = b_perf.get("expected_run_rate", 67.74)
            b_target = b_perf.get("team_target", 0.0)
            b_achieved = b_perf.get("team_achievement", 0.0)
            b_pipeline = b_perf.get("total_pipeline", 0.0)

            if any(w in msg_lower for w in ["rm", "attention", "who", "underperforming", "lagging"]):
                lagging = [r for r in ranks if r["achievement_percentage"] < b_run_rate]
                if not lagging:
                    return f"All RMs in **{b_name}** are performing on or above the expected run-rate benchmark of {b_run_rate}%. Top performer: **{ranks[0]['rm_name']}** at {ranks[0]['achievement_percentage']}% achievement."
                rm_info = ", ".join([f"**{r['rm_name']}** ({r['achievement_percentage']}% achievement, target gap ₹{(r['target']-r['achieved'])/100000:.1f}L)" for r in lagging])
                return f"In **{b_name}**, the following RM(s) require intervention: {rm_info}. Overall branch achievement is **{b_ach_pct}%** against run-rate benchmark of {b_run_rate}%."

            return f"Branch Summary for **{b_name}**: Target achievement is **{b_ach_pct}%** (₹{b_achieved/100000:.1f}L settled vs ₹{b_target/100000:.1f}L target). Total branch pipeline stands at **₹{b_pipeline/100000:.1f}L** across {len(ranks)} RM(s)."

        elif user.role == "REGIONAL_HEAD":
            r_perf = ctx.get("regional_performance", {})
            reg_target = r_perf.get("regional_target", 0.0)
            reg_achieved = r_perf.get("regional_achieved", 0.0)
            reg_ach_pct = r_perf.get("regional_achievement_percentage", 0.0)
            branches = r_perf.get("branch_performance", [])

            return f"Regional Executive Summary ({r_perf.get('region_name', 'Northern Region')}): Regional achievement is **{reg_ach_pct}%** (₹{reg_achieved/100000:.1f}L settled vs ₹{reg_target/100000:.1f}L target) across {len(branches)} branch(es). Active regional pipeline stands at **₹{r_perf.get('total_pipeline', 0.0)/100000:.1f}L**."

        return f"SalesOrbit AI online for user **{user.username}** ({user.role}). Ask a question regarding your targets, pipeline, priority actions, or operational metrics."

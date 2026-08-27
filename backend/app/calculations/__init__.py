"""
FeasPro Financial Calculation Engine.

Architecture Rule:
All financial calculations, residual land value calculations, funding models, cash flow scheduling,
and feasibility metric evaluations MUST remain purely deterministic in this calculation layer.
Do NOT put financial calculation formulas directly inside API routes, React components, or Database models.

Modules in this layer:
- revenue.py: Gross Realisation Value (GRV), net revenue, sales phasing (Phase 2+)
- costs.py: Acquisition, statutory fees, professional fees, construction, contingency, escalation (Phase 2+)
- funding.py: Senior debt, mezzanine, equity waterfall, capitalized interest (Phase 3+)
- cashflow.py: Monthly/quarterly cashflow projections, S-curves, peak debt (Phase 3+)
- feasibility.py: Feasibility summary, Development Margin, Return on Cost (RoC), IRR, NPV (Phase 2-3)
"""

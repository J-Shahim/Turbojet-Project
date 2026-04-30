try:
    from .mark4 import diagnostics_from_mk1, operating_line_from_mk1, tbar_vs_me_from_mk1
    from .ideal import ideal_tau_sweeps_from_mk1
    from .strip_model import strip_model_from_mk1
    from .analysis import (
        analysis_operating_line,
        analysis_strip_model,
        analysis_strip_model_equations,
        analysis_tau_sweeps,
        analysis_tbar_vs_me,
        analysis_velocity_ratio,
    )
    from .fuel import fuel_xi_map
    from .fuel_dissociation import fuel_dissociation_sweep, fuel_dissociation_single
except ImportError:
    from plots.mark4 import diagnostics_from_mk1, operating_line_from_mk1, tbar_vs_me_from_mk1
    from plots.ideal import ideal_tau_sweeps_from_mk1
    from plots.strip_model import strip_model_from_mk1
    from plots.analysis import (
        analysis_operating_line,
        analysis_strip_model,
        analysis_strip_model_equations,
        analysis_tau_sweeps,
        analysis_tbar_vs_me,
        analysis_velocity_ratio,
    )
    from plots.fuel import fuel_xi_map
    from plots.fuel_dissociation import fuel_dissociation_sweep, fuel_dissociation_single

__all__ = [
    "diagnostics_from_mk1",
    "operating_line_from_mk1",
    "tbar_vs_me_from_mk1",
    "ideal_tau_sweeps_from_mk1",
    "strip_model_from_mk1",
    "analysis_tau_sweeps",
    "analysis_velocity_ratio",
    "analysis_tbar_vs_me",
    "analysis_operating_line",
    "analysis_strip_model",
    "analysis_strip_model_equations",
    "fuel_xi_map",
    "fuel_dissociation_sweep",
    "fuel_dissociation_single",
]

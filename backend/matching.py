import numpy as np


def f_m2_operating_from_pi_c(pi_c: np.ndarray, a4s_over_a2: float, a4s_over_a8: float, gamma: float) -> np.ndarray:
    pi_c = np.asarray(pi_c, dtype=float)
    expo = 2.0 * (gamma - 1.0) / (gamma + 1.0)
    geom_term = 1.0 - a4s_over_a8 ** expo
    out = np.full_like(pi_c, np.nan, dtype=float)
    if geom_term <= 0.0:
        return out

    pi_term = pi_c ** ((gamma - 1.0) / gamma) - 1.0
    valid = pi_term > 0.0
    out[valid] = a4s_over_a2 * np.sqrt(geom_term) * pi_c[valid] / np.sqrt(pi_term[valid])
    return out

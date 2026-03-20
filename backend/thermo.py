import math


def _is_bad(value):
    try:
        return value is None or not math.isfinite(float(value))
    except Exception:
        return True


def speed_of_sound(gamma, r_value, temperature):
    if _is_bad(gamma) or _is_bad(r_value) or _is_bad(temperature) or temperature <= 0:
        return None
    return math.sqrt(float(gamma) * float(r_value) * float(temperature))


def velocity_from_mach(mach, gamma, r_value, temperature):
    if _is_bad(mach):
        return None
    a_value = speed_of_sound(gamma, r_value, temperature)
    if _is_bad(a_value):
        return None
    return float(mach) * float(a_value)


def enthalpy_ideal(cp_value, temperature):
    if _is_bad(cp_value) or _is_bad(temperature):
        return None
    return float(cp_value) * float(temperature)


def entropy_ideal(cp_value, r_value, temperature, pressure, t_ref, p_ref):
    if (
        _is_bad(cp_value)
        or _is_bad(r_value)
        or _is_bad(temperature)
        or _is_bad(pressure)
        or _is_bad(t_ref)
        or _is_bad(p_ref)
    ):
        return None
    if temperature <= 0 or pressure <= 0 or t_ref <= 0 or p_ref <= 0:
        return None
    return float(cp_value) * math.log(temperature / t_ref) - float(r_value) * math.log(
        pressure / p_ref
    )

from __future__ import annotations

from typing import Dict, List


def plot_pollutants(phi: List[float], pollutants: Dict[str, List[float]], output_path: str) -> None:
    try:
        import matplotlib.pyplot as plt
    except Exception as exc:
        raise RuntimeError("matplotlib required for plotting") from exc

    plt.figure(figsize=(8, 5))
    for name, values in pollutants.items():
        plt.plot(phi, values, label=name)

    plt.xlabel("Equivalence ratio (phi)")
    plt.ylabel("Mole fraction / proxy")
    plt.title("Pollutant trends vs equivalence ratio")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

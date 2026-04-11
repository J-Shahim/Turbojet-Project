from pydantic import BaseModel, Field


class MK1Inputs(BaseModel):
    M0: float = Field(3.0, description="Free-stream Mach number")
    T0: float = Field(216.0725, description="Ambient temperature (K)")
    P0: float = Field(101.325e3, description="Ambient pressure (Pa)")
    gamma: float = Field(1.4, description="Ratio of specific heats")
    R: float = Field(287.0, description="Gas constant (J/kg-K)")
    cp: float = Field(1004.0, description="Specific heat at constant pressure (J/kg-K)")
    pi_d: float = Field(1.0, description="Inlet pressure ratio")
    pi_b: float = Field(1.0, description="Burner pressure ratio")
    pi_n: float = Field(1.0, description="Nozzle pressure ratio")
    Tt4: float = Field(1944.0, description="Turbine inlet total temperature (K)")
    eta_b: float = Field(1.0, description="Burner efficiency")
    lhv: float = Field(43e6, description="Fuel lower heating value (J/kg)")
    f_fuel: float = Field(0.23, description="Fuel-air ratio")
    A1: float = Field(45.0, description="Station 1 area")
    A15: float = Field(12.0, description="Station 1.5 area")
    A2: float = Field(14.0, description="Station 2 area")
    A3: float = Field(2.5, description="Station 3 area")
    A4: float = Field(1.0, description="Station 4 area")
    A5: float = Field(14.0, description="Station 5 area")
    A8: float = Field(4.0, description="Station 8 area")
    Ae: float = Field(0.0, description="Exit area")
    M5: float = Field(0.0, description="Station 5 Mach override")
    nozzle_fully_expanded: bool = Field(True, description="Nozzle fully expanded flag")


class AnalysisTauSweepInputs(BaseModel):
    gamma: float = Field(1.4, description="Ratio of specific heats")
    tau_lambda: float = Field(8.4, description="Combustor temperature ratio")
    tau_f: float = Field(170.0, description="Fuel energy parameter")
    tau_r_ref: float = Field(1.45, description="Reference ram ratio")
    tau_c_ref: float = Field(2.5, description="Reference compressor ratio")
    tau_c_min: float = Field(1.05, description="Tau_c sweep min")
    tau_c_max: float = Field(40.0, description="Tau_c sweep max")
    tau_r_min: float = Field(1.05, description="Tau_r sweep min")
    tau_r_max: float = Field(3.0, description="Tau_r sweep max")
    npts: int = Field(400, description="Number of points per sweep")


class AnalysisVelocityRatioInputs(BaseModel):
    gamma: float = Field(1.4, description="Ratio of specific heats")
    tau_r: float = Field(1.45, description="Ram temperature ratio")
    tau_lambda: float = Field(8.4, description="Combustor temperature ratio")
    tau_f: float = Field(170.0, description="Fuel energy parameter")
    tau_c_min: float = Field(1.05, description="Tau_c sweep min")
    tau_c_max: float = Field(7.0, description="Tau_c sweep max")
    npts: int = Field(400, description="Number of points per sweep")


class AnalysisTbarVsMeInputs(BaseModel):
    gamma: float = Field(1.4, description="Ratio of specific heats")
    M0: float = Field(3.0, description="Flight Mach number")
    Tte_over_T0: float = Field(5.658, description="T_te/T0 ratio")
    Pte_over_P0: float = Field(85.955, description="P_te/P0 ratio")
    A8_over_A0: float = Field(0.143, description="A8/A0 area ratio")
    npts: int = Field(500, description="Number of points in sweep")
    Me_pick: float = Field(2.5, description="Selected exit Mach")


class AnalysisOperatingLineInputs(BaseModel):
    gamma: float = Field(1.4, description="Ratio of specific heats")
    A4s_over_A2: float = Field(1.0 / 14.0, description="A4*/A2 ratio")
    A4s_over_A8: float = Field(1.0 / 4.0, description="A4*/A8 ratio")
    pi_c_min: float = Field(1.01, description="Compressor ratio min")
    pi_c_max: float = Field(60.0, description="Compressor ratio max")
    npts: int = Field(800, description="Number of points in sweep")
    fM2_pick: float = Field(0.20, description="Selected f(M2) point")


class AnalysisStripModelInputs(BaseModel):
    gamma: float = Field(1.4, description="Ratio of specific heats")
    n_stages: float = Field(8.0, description="Number of compressor stages")
    alpha2a_deg: float = Field(10.0, description="Inlet flow angle (deg)")
    beta2b_deg: float = Field(60.0, description="Exit flow angle (deg)")
    tau_r: float = Field(1.0, description="Ram temperature ratio")
    t0: float = Field(288.15, description="Ambient temperature (K)")
    f_m2_min: float = Field(0.15, description="f(M2) min")
    f_m2_max: float = Field(0.95, description="f(M2) max")
    n_f_m2: int = Field(220, description="Number of f(M2) samples")
    mb_corr_min: float = Field(0.50, description="Mb0/sqrt(tau_r) min")
    mb_corr_max: float = Field(1.20, description="Mb0/sqrt(tau_r) max")
    n_speed_lines: int = Field(8, description="Number of speed lines")
    mb_user: float = Field(0.85, description="User Mb0/sqrt(tau_r)")
    a2_over_a4s: float = Field(14.0, description="A2/A4* ratio")
    a4s_over_a8: float = Field(1.0 / 4.0, description="A4*/A8 ratio")
    tau_min: float = Field(3.0, description="Tau_lambda/tau_r min")
    tau_max: float = Field(9.0, description="Tau_lambda/tau_r max")
    n_tau_lines: int = Field(6, description="Number of F1 lines")
    tau_user: float = Field(6.0, description="User tau_lambda/tau_r")
    fuel_to_air: float = Field(0.02, description="Fuel-air ratio")
    pi_b: float = Field(0.95, description="Burner pressure ratio")
    pi_c_operating_min: float = Field(1.01, description="Operating pi_c min")
    pi_c_operating_max: float = Field(40.0, description="Operating pi_c max")
    n_pi_operating: int = Field(300, description="Operating pi_c samples")


class FuelAnalysisInputs(BaseModel):
    fuel_id: str = Field("CH4", description="Fuel identifier")
    f_over_a: float = Field(0.02, description="Fuel-air ratio")
    mode: str = Field("ideal", description="Combustion mode: ideal or dissociation")
    t_k: float = Field(2000.0, description="Combustion temperature (K)")
    t_react_k: float = Field(298.15, description="Reactant enthalpy temperature (K)")
    p_pa: float = Field(101325.0, description="Combustion pressure (Pa)")
    air_model: str = Field("dry_air", description="Air model: dry_air or oxygen")
    fuel_phase: str = Field("vapor", description="Fuel phase: vapor or liquid")
    hv_basis: str = Field("lhv", description="Heating value basis: lhv or hhv")
    hv_ref_t_k: float = Field(298.15, description="Heating value reference temperature (K)")


class FuelXiMapInputs(BaseModel):
    fuel_id: str = Field("CH4", description="Fuel identifier")
    species: list[str] = Field(default_factory=list, description="Species names to compute Xi map")
    air_model: str = Field("dry_air", description="Air model: dry_air or oxygen")
    p_pa: float = Field(101325.0, description="Combustion pressure (Pa)")
    t_k: float = Field(2000.0, description="Combustion temperature (K)")
    phi_min: float = Field(0.0001, description="Equivalence ratio sweep min")
    phi_max: float = Field(2.0, description="Equivalence ratio sweep max")
    phi_step: float = Field(0.05, description="Equivalence ratio sweep step")
    min_mol: float = Field(1.0e-6, description="Minimum mol threshold for products")
    include_ideal: bool = Field(True, description="Include ideal products map")
    include_dissociation: bool = Field(True, description="Include dissociation products map")
    max_points: int = Field(4000, description="Max phi points per sweep")

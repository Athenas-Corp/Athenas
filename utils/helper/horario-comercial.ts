export interface HorarioComercialConfig {
  inicio: number;
  fim: number;
  diasUteis: number[];
}

export const defaultHorariosConfig: HorarioComercialConfig = {
  inicio: 8,
  fim: 18,
  diasUteis: [1, 2, 3, 4, 5],
};

export function isHorarioComercial(
  date: Date,
  config: HorarioComercialConfig = defaultHorariosConfig,
): boolean {
  const diaSemana: number = date.getDay();
  const horaAtual: number = date.getHours();

  const diaUtil: boolean = config.diasUteis.includes(diaSemana);
  const dentroHorario: boolean =
    horaAtual >= config.inicio && horaAtual < config.fim;

  return diaUtil && dentroHorario;
}

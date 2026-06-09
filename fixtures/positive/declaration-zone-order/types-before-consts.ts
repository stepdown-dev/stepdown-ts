interface Settings {
  readonly value: number;
}

type Result = {
  readonly value: number;
};

enum Mode {
  Ready = "ready",
}

const DEFAULT_SETTINGS: Settings = { value: 1 };
const DEFAULT_MODE = Mode.Ready;

export function settings(): Result {
  return { value: DEFAULT_SETTINGS.value };
}

export function mode(): Mode {
  return DEFAULT_MODE;
}

import { strictEqual } from "node:assert";

interface Config {
  readonly value: number;
}

type Result = {
  readonly label: string;
};

const DEFAULT_CONFIG: Config = {
  value: 1,
};

export function buildResult(config: Config = DEFAULT_CONFIG): Result {
  const label = formatLabel(config.value);
  strictEqual(label.length > 0, true);
  return { label };
}

function formatLabel(value: number): string {
  return `value-${value}`;
}

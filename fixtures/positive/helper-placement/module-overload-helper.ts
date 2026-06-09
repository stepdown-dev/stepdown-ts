export function value(): string {
  return formatValue("ready");
}

function formatValue(value: string): string;
function formatValue(value: number): string;
function formatValue(value: string | number): string {
  return String(value);
}

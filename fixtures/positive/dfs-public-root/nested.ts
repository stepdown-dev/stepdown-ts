export function value(): number {
  return firstValue();
}

function firstValue(): number {
  return secondValue();
}

function secondValue(): number {
  return 1;
}

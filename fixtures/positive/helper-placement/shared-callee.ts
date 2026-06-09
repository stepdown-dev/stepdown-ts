export function firstValue(): number {
  return sharedValue();
}

function sharedValue(): number {
  return 1;
}

export function secondValue(): number {
  return sharedValue();
}

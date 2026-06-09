export function value(): number {
  return new LocalValue().value();
}

class LocalValue {
  value(): number {
    return 1;
  }
}

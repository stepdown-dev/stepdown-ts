export class Calculator {
  value(): number {
    return this.firstValue();
  }

  private firstValue(): number {
    return this.secondValue();
  }

  private secondValue(): number {
    return 1;
  }
}

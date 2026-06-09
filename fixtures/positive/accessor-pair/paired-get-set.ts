export class Label {
  private current = "";

  get value(): string {
    return this.current;
  }

  set value(value: string) {
    this.current = value;
  }
}

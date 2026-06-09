interface Settings {
  readonly value: number;
}

export class Counter {
  private readonly settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  value(): number {
    return this.baseValue();
  }

  private baseValue(): number {
    return this.settings.value;
  }

  static create(value: number): Counter {
    return new Counter({ value });
  }
}

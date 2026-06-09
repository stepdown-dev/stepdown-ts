export class Formatter {
  value(): string {
    return this.formatValue("ready");
  }

  private formatValue(value: string): string;
  private formatValue(value: number): string;
  private formatValue(value: string | number): string {
    return String(value);
  }
}

export abstract class DomainException extends Error {
  abstract readonly code: string;
  readonly details?: Readonly<Record<string, string>>;

  constructor(message: string, details?: Record<string, string>) {
    super(message);
    this.name = this.constructor.name;
    if (details) this.details = Object.freeze({ ...details });
  }
}

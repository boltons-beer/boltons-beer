export type Result<OkValue, ErrorValue = Error> = Ok<OkValue> | Err<ErrorValue>;

export class Ok<OkValue> {
    readonly kind = 'ok';

    private constructor(private readonly inner: OkValue) {}

    get value(): OkValue {
        return this.inner;
    }

    unwrap(): OkValue {
        return this.inner;
    }

    static wrap<OkValue>(inner: OkValue): Ok<OkValue> {
        return new Ok(inner);
    }
}

export class Err<ErrorValue = Error> {
    readonly kind = 'err';

    private constructor(private readonly inner: ErrorValue) {}

    get value(): ErrorValue {
        return this.inner;
    }

    unwrap(): never {
        throw this.inner;
    }

    static wrap<ErrorValue>(inner: ErrorValue): Err<ErrorValue> {
        return new Err<ErrorValue>(inner);
    }
}
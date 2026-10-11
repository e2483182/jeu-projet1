export class ErreurHttp extends Error {
    constructor(
      public statusCode: number,
      message: string
    ) {
      super(message);
    }
  }
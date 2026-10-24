export class RoomError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'RoomError';
    this.status = status;
    this.code = code;
  }
}

import { ForbiddenException } from '@nestjs/common';

export class LicenseExpiredException extends ForbiddenException {
  constructor() {
    super({
      code: 'LICENSE_EXPIRED',
      message: 'La suscripción de la tienda no está activa. Modo solo lectura.',
    });
  }
}

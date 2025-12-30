import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }
}

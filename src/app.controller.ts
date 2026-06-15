import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // 🚦 EL SEMÁFORO DE ESTADO (Health Check para despertar a Render)
  @Get('status/ping')
  getPing() {
    return { 
      status: 'online', 
      timestamp: new Date().toISOString() 
    };
  }
}

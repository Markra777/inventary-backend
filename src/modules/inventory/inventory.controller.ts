import { Controller, Get, Post, Body, UseGuards, Request, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Inventario (Sincronización)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // =======================================================
  // 🔥 ÚNICA RUTA DE SINCRONIZACIÓN (APP MÓVIL -> NEON DB)
  // =======================================================
  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincronización masiva de historial y stock desde la App Móvil' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        history: { type: 'array', description: 'Todo el historial de la tabla history local' },
        stock: { type: 'array', description: 'Los IDs y cantidades actuales de la tabla accessories local' },
      },
    },
  })
  async syncMobileData(
    @Req() req: any, 
    @Body() body: { history: any[]; stock: any[] }
  ) {
    const userId = req.user.userId || req.user.id; // Extraemos la identidad de forma segura
    return this.inventoryService.syncFromMobile(userId, body);
  }

  // =======================================================
  // 📊 RUTAS DEL ANALISTA (Cálidda Global)
  // =======================================================
  @Get('technicians-stock')
  @UseGuards(RolesGuard)
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Ver el stock de mochilas de todos los técnicos (Solo Analista)' })
  async getStock() {
    return this.inventoryService.getAllTechniciansStock();
  }

  @Get('history')
  @UseGuards(RolesGuard)
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Ver todos los movimientos y registros de la empresa (Solo Analista)' })
  async getHistory() {
    return this.inventoryService.getGlobalHistory();
  }

  // =======================================================
  // 📱 RUTAS DEL TÉCNICO (Mochila y Catálogo Local)
  // =======================================================
  @Get('my-stock')
  @ApiOperation({ summary: 'Ver mi propio stock (La mochila del Técnico)' })
  async getMyStock(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return this.inventoryService.getMyStock(userId);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Ver mi propio historial de trabajo (Técnico)' })
  async getMyHistory(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return this.inventoryService.getMyHistory(userId);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Descarga el catálogo oficial de accesorios (Para la App Móvil)' })
  async getCatalog() {
    return this.inventoryService.getMasterCatalog();
  }
}
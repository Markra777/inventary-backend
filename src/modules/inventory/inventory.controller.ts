import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HttpCode, HttpStatus, Req } from '@nestjs/common';

@ApiTags('Inventario (Sincronización)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('sync-all')
  @ApiOperation({ summary: 'Sincronización masiva de historial y stock absoluto del técnico' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        history: { type: 'array', description: 'Todo el historial de la tabla history local' },
        stock: { type: 'array', description: 'Los IDs y cantidades actuales de la tabla accessories local' },
      },
    },
  })
  async syncAllData(@Request() req, @Body() body: { history: any[]; stock: any[] }) {
    const userId = req.user.userId; // Seguridad: Identidad extraída del JWT
    return this.inventoryService.syncCompleteTechnicianData(userId, body.history, body.stock);
  }

  // NUEVA RUTA 1: Stock Global
  @Get('technicians-stock')
  @UseGuards(RolesGuard)
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Ver el stock de mochilas de todos los técnicos (Solo Analista)' })
  async getStock() {
    return this.inventoryService.getAllTechniciansStock();
  }

  // NUEVA RUTA 2: Historial Global
  @Get('history')
  @UseGuards(RolesGuard)
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Ver todos los movimientos y registros de la empresa (Solo Analista)' })
  async getHistory() {
    return this.inventoryService.getGlobalHistory();
  }

  // =======================================================
  // 🔥 RUTAS DEL TÉCNICO (Cualquiera con un Token válido entra)
  // =======================================================

  @Get('my-stock')
  @ApiOperation({ summary: 'Ver mi propio stock (La mochila del Técnico)' })
  // No usamos @Roles() aquí, para que el guardia deje pasar al Técnico
  async getMyStock(@Request() req) {
    const userId = req.user.userId; // Sacamos tu ID de forma segura del Token
    return this.inventoryService.getMyStock(userId);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Ver mi propio historial de trabajo (Técnico)' })
  async getMyHistory(@Request() req) {
    const userId = req.user.userId;
    return this.inventoryService.getMyHistory(userId);
  }

  // NUEVA RUTA: Descargar catálogo para el celular
  @Get('catalog')
  @ApiOperation({ summary: 'Descarga el catálogo oficial de accesorios (Para la App Móvil)' })
  async getCatalog() {
    return this.inventoryService.getMasterCatalog();
  }

  // 🔥 NUEVA RUTA: Sincronización
  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincronizar historial y stock desde la App Móvil' })
  async syncMobileData(
    @Req() req: any, // Aquí viene el Token desencriptado (req.user)
    @Body() body: any // Aquí viene el JSON con { history: [], stock: [] }
  ) {
    // Extraemos el ID del técnico que sincronizó
    const userId = req.user.userId; 

    // Se lo mandamos al servicio para que lo guarde
    return this.inventoryService.syncFromMobile(userId, body);
  }
}
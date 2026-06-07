import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AccessoriesService } from './accessories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Catálogo de Accesorios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // Ambos guardias activos
@Controller('v1/accessories')
export class AccessoriesController {
  constructor(private readonly accessoriesService: AccessoriesService) {}

  // 🔒 SOLO ANALISTA: Crear accesorio
  @Post()
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Crear un nuevo accesorio (Solo Analista)' })
  @ApiBody({ schema: { example: { name: 'Tubo de Bronce 1/2', category: 'Bronce' } } })
  create(@Body() body: { name: string; category: string }) {
    return this.accessoriesService.create(body);
  }

  // 🔒 SOLO ANALISTA: Ver todos los accesorios (Incluso los suspendidos)
  @Get('admin')
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Ver catálogo completo incluyendo suspendidos (Solo Analista)' })
  findAllAdmin() {
    return this.accessoriesService.findAllAdmin();
  }

  // 🟢 TODOS (Técnicos y Analistas): Descargar catálogo para trabajar
  @Get()
  // No le ponemos @Roles() para que el guardia deje pasar a cualquiera con un JWT válido
  @ApiOperation({ summary: 'Descargar catálogo de accesorios activos para la app móvil (Todos)' })
  findAllActive() {
    return this.accessoriesService.findAllActive();
  }

  // 🔒 SOLO ANALISTA: Actualizar accesorio
  @Patch(':id')
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Actualizar nombre/categoría de un accesorio (Solo Analista)' })
  update(@Param('id') id: string, @Body() body: { name?: string; category?: string; isActive?: boolean }) {
    return this.accessoriesService.update(id, body);
  }

  // 🔒 SOLO ANALISTA: Suspender accesorio (Soft Delete)
  @Delete(':id/suspend')
  @Roles('ANALISTA')
  @ApiOperation({ summary: 'Suspender un accesorio para ocultarlo de la app (Solo Analista)' })
  suspend(@Param('id') id: string) {
    return this.accessoriesService.suspend(id);
  }
}
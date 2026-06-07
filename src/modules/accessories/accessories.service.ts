import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccessoriesService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear un accesorio
  async create(data: { name: string; category: string }) {
    return this.prisma.accessory.create({ data });
  }

  // 2. Ver TODO (Para el panel web del Analista)
  async findAllAdmin() {
    return this.prisma.accessory.findMany({ 
      orderBy: [{ category: 'asc' }, { name: 'asc' }] 
    });
  }

  // 3. Ver SOLO los activos (Para la app Flutter del Técnico)
  async findAllActive() {
    return this.prisma.accessory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // 4. Actualizar nombre o categoría
  async update(id: string, data: { name?: string; category?: string; isActive?: boolean }) {
    return this.prisma.accessory.update({
      where: { id },
      data,
    });
  }

  // 5. Borrado Lógico (Suspender)
  async suspend(id: string) {
    return this.prisma.accessory.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
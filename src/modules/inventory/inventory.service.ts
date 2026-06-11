import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { validate as isUuid } from 'uuid'; // <-- AQUÍ ESTÁ TU IMPORTACIÓN

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // =======================================================
  // 🔥 RUTA PRINCIPAL DE SINCRONIZACIÓN (APP MÓVIL -> NEON DB)
  // =======================================================
  async syncFromMobile(userId: string, syncData: any) {
    const { history, stock } = syncData;

    console.log(`📦 Recibiendo ${history?.length || 0} registros de historial del usuario ${userId}`);

    let historySaved = 0;

    if (history && history.length > 0) {
      try {
        const mappedHistory = history.map((item: any) => {
          // 🚀 AQUÍ USAMOS LA LIBRERÍA UUID OFICIAL QUE IMPORTASTE
          // isUuid() revisa si el ID es un código real. Si es un "1" o "2", devuelve false.
          const isValid = isUuid(String(item.id));

          return {
            ...(isValid ? { id: String(item.id) } : {}), // Solo manda el ID si es válido
            userId: userId, 
            accessoryId: item.accessory_id, 
            avisoDireccion: item.aviso_direccion,
            actionType: item.action_type,
            quantityChanged: Number(item.quantity_changed),
            observations: item.observations,
            // NOTA: Revisa si en tu schema.prisma esta columna se llama 'date' o 'createdAt'. 
            // Si se llama 'date', cambia 'createdAt' por 'date' en la línea de abajo:
            date: new Date(item.date), 
          };
        });

        // Guardamos en Neon DB
        const result = await this.prisma.history.createMany({
          data: mappedHistory,
          skipDuplicates: true, 
        });
        
        historySaved = result.count;
        console.log(`✅ ¡Se guardaron ${historySaved} registros nuevos en Neon DB!`);

      } catch (error) {
        console.error("❌ Error de Prisma al intentar guardar en Neon DB:", error);
        throw new Error("Fallo en la base de datos al guardar historial."); 
      }
    }

    return {
      message: 'Sincronización completada',
      recordsSaved: historySaved,
    };
  }

  // =======================================================
  // 📊 RUTAS DEL ANALISTA (Dashboard Global)
  // =======================================================
  async getAllTechniciansStock() {
    return this.prisma.technicianStock.findMany({
      include: {
        user: { select: { username: true, role: true } }, 
        accessory: { select: { name: true, category: true, isActive: true } } 
      },
      orderBy: { user: { username: 'asc' } } 
    });
  }

  async getGlobalHistory() {
    return this.prisma.history.findMany({
      include: {
        user: { select: { username: true } },
        accessory: { select: { name: true, category: true } }
      },
      orderBy: { date: 'desc' } // Ojo: Asegúrate de que tu Prisma schema use 'date'
    });
  }

  // =======================================================
  // 📱 RUTAS DEL TÉCNICO (Dashboard Personal)
  // =======================================================
  async getMyStock(userId: string) {
    return this.prisma.technicianStock.findMany({
      where: { userId: userId }, 
      include: {
        accessory: { select: { name: true, category: true } }
      },
      orderBy: { accessory: { name: 'asc' } }
    });
  }

  async getMyHistory(userId: string) {
    return this.prisma.history.findMany({
      where: { userId: userId }, 
      include: {
        accessory: { select: { name: true, category: true } }
      },
      orderBy: { date: 'desc' } // Ojo: Asegúrate de que tu Prisma schema use 'date'
    });
  }

  async getMasterCatalog() {
    return this.prisma.accessory.findMany({
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' }
    });
  }
}
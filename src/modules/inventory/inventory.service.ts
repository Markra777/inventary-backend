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

    // 🔥 MALLA DE SEGURIDAD: Traemos todos los IDs válidos que existen hoy en Neon DB
    const dbAccessories = await this.prisma.accessory.findMany({ select: { id: true } });
    const validIds = new Set(dbAccessories.map(a => a.id));

    let historySaved = 0;

    if (history && history.length > 0) {
      try {
        const mappedHistory = history.map((item: any) => {
          // 1. Validar si el ID es de los nuevos (UUID) o de los viejos (1, 2)
          const isValidId = isUuid(String(item.id));
          
          // 2. Validar que el accesorio realmente exista en la nube
          let finalAccessoryId = item.accessory_id;
          if (finalAccessoryId && !validIds.has(finalAccessoryId)) {
            console.log(`⚠️ Accesorio fantasma detectado: ${finalAccessoryId}. Se pasará a null.`);
            finalAccessoryId = null; 
          }

          return {
            ...(isValidId ? { id: String(item.id) } : {}), 
            userId: userId, 
            accessoryId: finalAccessoryId, 
            avisoDireccion: item.aviso_direccion || 'Sin Aviso',
            actionType: item.action_type || 'VISITA',
            quantityChanged: Number(item.quantity_changed) || 0,
            observations: item.observations || '',
            // IMPORTANTE: Si tu esquema usa createdAt, cambia la palabra 'date' de la izquierda por 'createdAt'
            date: new Date(item.date), 
          };
        });

        // 3. Guardar en Neon DB
        const result = await this.prisma.history.createMany({
          data: mappedHistory,
          skipDuplicates: true, 
        });
        
        historySaved = result.count;
        console.log(`✅ ¡Se guardaron ${historySaved} registros nuevos en Neon DB!`);

      } catch (error) {
        // 🔥 ESTE LOG NOS DIRÁ EXACTAMENTE QUÉ PASÓ SI VUELVE A FALLAR
        console.error("❌ ERROR CRÍTICO DE PRISMA AL GUARDAR:");
        console.error(error.message || error);
        throw new Error("Fallo en la base de datos: " + error.message); 
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
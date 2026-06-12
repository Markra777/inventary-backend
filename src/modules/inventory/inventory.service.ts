import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { validate as isUuid } from 'uuid';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // =======================================================
  // 🔥 RUTA PRINCIPAL DE SINCRONIZACIÓN (APP MÓVIL -> NEON DB)
  // =======================================================
  async syncFromMobile(userId: string, syncData: any) {
    const { history, stock } = syncData;

    console.log(`📦 Recibiendo ${history?.length || 0} operaciones y ${stock?.length || 0} datos de mochila del usuario ${userId}`);

    // 🔥 MALLA DE SEGURIDAD: Traemos todos los IDs válidos que existen hoy en Neon DB
    const dbAccessories = await this.prisma.accessory.findMany({ select: { id: true } });
    const validIds = new Set(dbAccessories.map(a => a.id));

    try {
      // 🚀 MODO DIOS: Iniciamos una Transacción ACID (Todo o Nada)
      const resultado = await this.prisma.$transaction(async (tx) => {
        let historySaved = 0;

        // ==========================================
        // 1. EL ARCHIVADOR (Guardar Historial)
        // ==========================================
        if (history && history.length > 0) {
          for (const item of history) {
            // Buscamos si ya existe para evitar duplicados si el técnico aprieta el botón 2 veces
            const exists = await tx.history.findUnique({ where: { id: String(item.id) } });

            if (!exists) {
              // Validar si el ID que envía Flutter es de los nuevos (UUID) o viejos
              const isValidId = isUuid(String(item.id));
              
              // Validar que el accesorio realmente exista en la nube
              let finalAccessoryId = item.accessory_id || item.accessoryId; // Flutter suele mandar accessory_id
              if (finalAccessoryId && !validIds.has(finalAccessoryId)) {
                console.log(`⚠️ Accesorio fantasma detectado: ${finalAccessoryId}. Se pasará a null.`);
                finalAccessoryId = null; 
              }

              await tx.history.create({
                data: {
                  ...(isValidId ? { id: String(item.id) } : {}), 
                  userId: userId, 
                  accessoryId: finalAccessoryId, 
                  avisoDireccion: item.aviso_direccion || 'Sin Aviso',
                  actionType: item.action_type || 'VISITA',
                  quantityChanged: Number(item.quantity_changed) || 0,
                  observations: item.observations || '',
                  date: new Date(item.date), 
                }
              });
              historySaved++;
            }
          }
        }

        // ==========================================
        // 2. EL CONTADOR (Actualizar la Mochila)
        // ==========================================
        if (stock && stock.length > 0) {
          for (const item of stock) {
            // El celular nos dice exactamente cuánto stock tiene de cada cosa
            // En SQLite lo guardamos en 'accessory_id', o a veces viene directo en 'id' si la consulta es simple
            const accId = item.accessory_id || item.id || item.accessoryId; 
            const nuevaCantidad = Number(item.quantity || item.quantity_changed || 0);

            // Solo actualizamos si el accesorio es real
            if (accId && validIds.has(accId)) {
              // Hacemos upsert: Si la caja no existe en la nube, la crea. Si existe, la actualiza.
              await tx.technicianStock.upsert({
                where: { 
                  userId_accessoryId: { userId: userId, accessoryId: accId } 
                },
                update: { 
                  quantity: nuevaCantidad 
                },
                create: {
                  userId: userId,
                  accessoryId: accId,
                  quantity: nuevaCantidad
                }
              });
            }
          }
        }

        return {
          message: 'Sincronización completada',
          recordsSaved: historySaved,
        };
      });

      console.log(`✅ ¡Transacción exitosa! Se guardó todo en Neon DB.`);
      return resultado;

    } catch (error) {
      // 🔥 RESOLVIENDO LA RAYA ROJA DE TYPESCRIPT
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error("❌ ERROR CRÍTICO DE PRISMA AL GUARDAR:");
      console.error(errorMessage);
      throw new Error("Fallo en la base de datos: " + errorMessage); 
    }
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
      orderBy: { date: 'desc' } 
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
      orderBy: { date: 'desc' } 
    });
  }

  async getMasterCatalog() {
    return this.prisma.accessory.findMany({
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' }
    });
  }
}
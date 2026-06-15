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
            const accId = item.accessory_id || item.id || item.accessoryId; 
            const nuevaCantidad = Number(item.quantity || item.quantity_changed || 0);

            if (accId) {
              // 🔥 EL SALVAVIDAS OFFLINE: Si el ID no existe en Neon DB
              if (!validIds.has(accId)) {
                // Solo lo creamos si Flutter nos mandó el nombre (la cura de la amnesia)
                if (item.name && item.category) {
                  await tx.accessory.create({
                    data: {
                      id: String(accId), // Respetamos el UUID que generó SQLite en el celular
                      name: item.name,
                      category: item.category,
                      isActive: true,
                    }
                  });
                  validIds.add(accId); // Lo validamos para que pase al siguiente paso
                  console.log(`☁️ Accesorio offline recuperado y creado: ${item.name}`);
                } else {
                  console.log(`⚠️ Ignorando accesorio ${accId}: No existe en la Nube y no tiene nombre.`);
                  continue; // Saltamos este registro roto
                }
              }

              // Ahora que estamos seguros de que existe (o lo acabamos de crear), guardamos el stock
              await tx.technicianStock.upsert({
                where: { 
                  userId_accessoryId: { userId: userId, accessoryId: accId } 
                },
                update: { quantity: nuevaCantidad },
                create: { userId: userId, accessoryId: accId, quantity: nuevaCantidad }
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

  // =======================================================
  // 🛠️ CRUD DE ACCESORIOS (Doble Escritura desde Flutter)
  // =======================================================

  async createAccessory(data: { name: string; category: string; quantity?: number }) {
    try {
      // 1. Creamos el accesorio en el Catálogo Maestro de Neon
      const newAccessory = await this.prisma.accessory.create({
        data: {
          name: data.name,
          category: data.category,
          isActive: true,
        }
      });

      console.log(`✅ Nuevo accesorio creado en catálogo: ${newAccessory.name} (${newAccessory.id})`);
      
      return newAccessory; 

    } catch (error) {
      console.error("❌ Error creando accesorio:", error);
      throw new Error("No se pudo crear el accesorio en la base de datos.");
    }
  }

  async updateAccessory(id: string, data: { name?: string; category?: string; quantity?: number }) {
    try {
      // Prisma actualizará solo los campos que vengan definidos en 'data'
      const updated = await this.prisma.accessory.update({
        where: { id },
        data: {
          name: data.name,
          category: data.category,
        }
      });

      console.log(`✅ Accesorio actualizado: ${updated.name}`);
      return updated;

    } catch (error) {
      console.error("❌ Error actualizando accesorio:", error);
      throw new Error("El accesorio no existe o hubo un error al actualizar.");
    }
  }

  async deleteAccessory(id: string) {
    try {
      // ⚠️ ADVERTENCIA DE ARQUITECTO: 
      // En bases de datos relacionales con historial (como la tuya), 
      // NO se deben borrar registros con DELETE (rompería las Foreign Keys del historial pasado).
      // En su lugar, hacemos un "Soft Delete" apagando el campo isActive.
      const deleted = await this.prisma.accessory.update({
        where: { id },
        data: { isActive: false }
      });

      console.log(`✅ Accesorio desactivado (Soft Delete): ${id}`);
      return deleted;

    } catch (error) {
      console.error("❌ Error eliminando accesorio:", error);
      throw new Error("Error al intentar eliminar el accesorio.");
    }
  }
}
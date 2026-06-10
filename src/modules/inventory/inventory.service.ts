import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async syncCompleteTechnicianData(userId: string, historyRecords: any[], stockBalances: any[]) {
    let historySyncedCount = 0;
    let stockSyncedCount = 0;

    // 🔥 Traemos los IDs que realmente existen en Neon DB
    const dbAccessories = await this.prisma.accessory.findMany({ select: { id: true } });
    const validIds = new Set(dbAccessories.map(a => a.id));

    // 1. GUARDAR HISTORIAL (Uno por uno, sin que un error rompa a los demás)
    for (const record of historyRecords) {
      try {
        let finalAccessoryId = record.accessory_id;
        if (finalAccessoryId === 'null') finalAccessoryId = null;

        // Si el ID no es válido, lo pasamos a Visita Genérica
        if (finalAccessoryId && !validIds.has(finalAccessoryId)) {
          finalAccessoryId = null; 
        }

        // Validación de fecha para que PostgreSQL no se queje
        let recordDate = new Date();
        if (record.date) {
          const parsed = new Date(record.date);
          if (!isNaN(parsed.getTime())) recordDate = parsed;
        }

        // Usamos this.prisma directo, sin transacción
        await this.prisma.history.upsert({
          where: { id: record.id?.toString() || 'fantasma' },
          update: {
            avisoDireccion: record.aviso_direccion || 'Sin Dirección',
            quantityChanged: Number(record.quantity_changed) || 0,
            observations: record.observations,
          },
          create: {
            id: record.id?.toString(), // Mantenemos tu ID local ("1", "2" o UUID)
            avisoDireccion: record.aviso_direccion || 'Sin Dirección',
            quantityChanged: Number(record.quantity_changed) || 0,
            actionType: record.action_type || 'DESCONOCIDO',
            observations: record.observations,
            date: recordDate,
            userId: userId, 
            accessoryId: finalAccessoryId, 
          },
        });
        historySyncedCount++;
        
      } catch (error) {
        // Si UN registro falla, nos avisa cuál fue y el por qué exacto, pero CONTINÚA con los demás
        console.error(`❌ Error al guardar historial ID [${record.id}]:`, error.message);
      }
    }

    // 2. GUARDAR MOCHILA (Uno por uno)
    for (const stock of stockBalances) {
      try {
        let finalAccessoryId = stock.accessoryId;
        if (finalAccessoryId === 'null') finalAccessoryId = null;

        if (!finalAccessoryId || !validIds.has(finalAccessoryId)) {
          continue; // Si el accesorio no existe en la nube, lo ignoramos silenciosamente
        }

        await this.prisma.technicianStock.upsert({
          where: {
            userId_accessoryId: { userId: userId, accessoryId: finalAccessoryId },
          },
          update: {
            quantity: Number(stock.quantity) || 0, 
          },
          create: {
            userId: userId,
            accessoryId: finalAccessoryId,
            quantity: Number(stock.quantity) || 0,
          },
        });
        stockSyncedCount++;
      } catch (error) {
        console.error(`❌ Error al guardar stock accesorio [${stock.accessoryId}]:`, error.message);
      }
    }

    return {
      success: true,
      message: 'Sincronización ejecutada. Revisa los stats.',
      stats: { history: historySyncedCount, stock: stockSyncedCount }
    };
  }

  // Rutas del Analista intactas...
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
  // 🔥 RUTAS DEL TÉCNICO (Para que la app vea su propia info)
  // =======================================================

  // Ver SOLO la mochila del usuario que está consultando
  async getMyStock(userId: string) {
    return this.prisma.technicianStock.findMany({
      where: { userId: userId }, // <-- ¡El filtro mágico! Solo trae lo tuyo.
      include: {
        accessory: { select: { name: true, category: true } }
      },
      orderBy: { accessory: { name: 'asc' } }
    });
  }

  // Ver SOLO el historial del usuario que está consultando
  async getMyHistory(userId: string) {
    return this.prisma.history.findMany({
      where: { userId: userId }, // <-- ¡El filtro mágico!
      include: {
        accessory: { select: { name: true, category: true } }
      },
      orderBy: { date: 'desc' }
    });
  }

  // Descargar el catálogo maestro para el celular
  async getMasterCatalog() {
    return this.prisma.accessory.findMany({
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: { name: 'asc' }
    });
  }

  // 🔥 NUEVA FUNCIÓN: Recibir la sincronización del celular
  async syncFromMobile(userId: string, syncData: any) {
    const { history, stock } = syncData;

    let historySaved = 0;

    // 1. Guardar el Historial de Trabajo en Neon DB
    if (history && history.length > 0) {
      // Formateamos los datos que vienen del celular para que encajen en Prisma
      const mappedHistory = history.map((item: any) => ({
        id: item.id, // Usamos el mismo UUID del celular para no duplicar
        userId: userId, // Sabemos qué técnico lo hizo gracias al Token
        accessoryId: item.accessory_id, // Puede ser null si fue solo VISITA
        avisoDireccion: item.aviso_direccion,
        actionType: item.action_type,
        quantityChanged: Number(item.quantity_changed),
        observations: item.observations,
        createdAt: new Date(item.date),
      }));

      // createMany guarda de golpe. skipDuplicates evita errores si el técnico sincroniza 2 veces lo mismo
      const result = await this.prisma.history.createMany({
        data: mappedHistory,
        skipDuplicates: true, 
      });
      historySaved = result.count;
    }

    // 2. (Opcional) Aquí podrías hacer lógica para actualizar el stock general 
    // usando el arreglo "stock" que también envía el celular.
    
    return {
      message: 'Sincronización completada',
      recordsSaved: historySaved,
    };
  }
}
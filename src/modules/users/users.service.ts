import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  // Inyectamos Prisma para poder hablar con Neon DB
  constructor(private prisma: PrismaService) {}

  // Esta es la función que AuthModule estaba buscando ansiosamente
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  // Dejamos esta función lista para el futuro (cuando quieras registrar técnicos)
  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }
}
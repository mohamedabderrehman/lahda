import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(data: { nameAr: string; nameEn?: string; slug: string; iconUrl?: string; sortOrder?: number }) {
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: { nameAr?: string; nameEn?: string; slug?: string; iconUrl?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}

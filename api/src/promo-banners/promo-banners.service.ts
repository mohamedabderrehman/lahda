import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromoBannersService {
  constructor(private prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.promoBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.promoBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(data: { titleAr: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number }) {
    return this.prisma.promoBanner.create({ data });
  }

  async update(id: string, data: { titleAr?: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.promoBanner.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.promoBanner.delete({ where: { id } });
  }
}

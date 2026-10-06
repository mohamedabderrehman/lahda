import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportChannelsService {
  constructor(private prisma: PrismaService) {}

  async findAllPublic() {
    return this.prisma.supportChannel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.supportChannel.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: { type: string; label: string; value: string; iconName?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.supportChannel.create({
      data: {
        type: data.type,
        label: data.label,
        value: data.value,
        iconName: data.iconName,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: { type?: string; label?: string; value?: string; iconName?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = await this.prisma.supportChannel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Support channel not found');
    return this.prisma.supportChannel.update({
      where: { id },
      data: {
        type: data.type,
        label: data.label,
        value: data.value,
        iconName: data.iconName,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.supportChannel.delete({ where: { id } });
    return { success: true };
  }
}

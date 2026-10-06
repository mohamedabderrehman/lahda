import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async getOne(user: User, addressId: string) {
    const addr = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!addr) throw new NotFoundException('Address not found');
    return addr;
  }

  async create(userId: string, data: { label?: string; addressText: string; latitude?: number; longitude?: number; building?: string; floor?: string; extraNotes?: string; isDefault?: boolean }) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({
      data: {
        userId,
        label: data.label,
        addressText: data.addressText,
        latitude: data.latitude,
        longitude: data.longitude,
        building: data.building,
        floor: data.floor,
        extraNotes: data.extraNotes,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async update(user: User, addressId: string, data: Record<string, unknown>) {
    const addr = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!addr) throw new NotFoundException('Address not found');
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    const allowed = ['label', 'addressText', 'latitude', 'longitude', 'building', 'floor', 'extraNotes', 'isDefault'];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];
    return this.prisma.address.update({ where: { id: addressId }, data: update as never });
  }

  async delete(user: User, addressId: string) {
    const addr = await this.prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { success: true };
  }
}

import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!['customer', 'merchant', 'driver'].includes(dto.role)) {
      throw new ForbiddenException('This role cannot self-register');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    if (dto.phone) {
      const byPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (byPhone) throw new ConflictException('Phone already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        role: dto.role,
      },
      select: { id: true, email: true, fullName: true, role: true, phone: true, createdAt: true },
    });
    if (dto.role === 'merchant') {
      const slug = dto.email.split('@')[0].toLowerCase().replace(/\W/g, '-') + '-' + Date.now();
      await this.prisma.merchantProfile.create({
        data: { userId: user.id, storeName: dto.fullName, storeSlug: slug },
      });
    }
    if (dto.role === 'driver') {
      await this.prisma.driverProfile.create({
        data: { userId: user.id },
      });
    }
    const token = this.jwt.sign({ sub: user.id, role: user.role });
    return { user, access_token: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwt.sign({ sub: user.id, role: user.role });
    const { passwordHash: _, ...safe } = user;
    return { user: safe, access_token: token };
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        fcmToken: true,
        createdAt: true,
        merchantProfile: true,
        driverProfile: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async updateFcmToken(userId: string, fcmToken: string | null, platform?: string) {
    // Keep legacy field in sync
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    if (fcmToken) {
      // Upsert into multi-device table; if another user held this token, reassign
      await this.prisma.userDeviceToken.upsert({
        where: { token: fcmToken },
        update: { userId, platform: platform ?? null, updatedAt: new Date() },
        create: { userId, token: fcmToken, platform: platform ?? null },
      });
    }

    return { ok: true };
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string | null }) {
    if (data.phone !== undefined) {
      if (data.phone === null || data.phone === '') {
        await this.prisma.user.update({ where: { id: userId }, data: { phone: null } });
      } else {
        const existing = await this.prisma.user.findFirst({ where: { phone: data.phone, NOT: { id: userId } } });
        if (existing) throw new ConflictException('Phone already used');
        await this.prisma.user.update({ where: { id: userId }, data: { phone: data.phone } });
      }
    }
    if (data.fullName !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { fullName: data.fullName } });
    }
    return this.profile(userId);
  }

  async changeEmail(userId: string, newEmail: string, currentPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('كلمة المرور غير صحيحة');
    const existing = await this.prisma.user.findFirst({ where: { email: newEmail, NOT: { id: userId } } });
    if (existing) throw new ConflictException('البريد مستخدم بالفعل');
    await this.prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
    return this.profile(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  async updateAvatar(userId: string, avatarUrl: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return this.profile(userId);
  }
}

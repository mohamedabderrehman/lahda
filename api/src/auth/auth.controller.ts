import { Body, Controller, Get, Patch, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  profile(@CurrentUser() user: User) {
    return this.auth.profile(user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, { fullName: dto.fullName, phone: dto.phone });
  }

  @Patch('change-email')
  @UseGuards(AuthGuard('jwt'))
  changeEmail(
    @CurrentUser() user: User,
    @Body() body: { newEmail: string; currentPassword?: string; password?: string },
  ) {
    // Support both field names for compatibility
    const currentPassword = body.currentPassword ?? body.password ?? '';
    return this.auth.changeEmail(user.id, body.newEmail, currentPassword);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(@CurrentUser() user: User, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post('fcm-token')
  @UseGuards(AuthGuard('jwt'))
  fcmToken(@CurrentUser() user: User, @Body('fcmToken') fcmToken: string | null) {
    return this.auth.updateFcmToken(user.id, fcmToken ?? null);
  }

  @Patch('avatar')
  @UseGuards(AuthGuard('jwt'))
  updateAvatar(@CurrentUser() user: User, @Body('avatarUrl') avatarUrl: string | null) {
    return this.auth.updateAvatar(user.id, avatarUrl);
  }

  @Post('upload-avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|webp/;
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.test(ext)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
      }
    },
  }))
  async uploadAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${user.id}_${timestamp}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Write file
    fs.writeFileSync(filePath, file.buffer);

    // Generate URL
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update user avatar
    await this.auth.updateAvatar(user.id, avatarUrl);

    return { avatarUrl };
  }
}

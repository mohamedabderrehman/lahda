import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('promo-codes')
export class PromoCodesController {
  constructor(private promoCodes: PromoCodesService) {}

  /**
   * Public endpoint for validating promo codes from the customer app.
   * Accepts subtotal to calculate discount amount server-side.
   */
  @Post('validate')
  validate(@Body() body: { code: string; subtotal: number }) {
    return this.promoCodes.validateForOrder(body.code, { subtotal: body.subtotal });
  }
}

@Controller('admin/promo-codes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminPromoCodesController {
  constructor(private promoCodes: PromoCodesService) {}

  @Get()
  list() {
    return this.promoCodes.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      code: string;
      description?: string;
      percentage: number;
      maxDiscount?: number | null;
      minSubtotal?: number | null;
      expiresAt?: Date | string | null;
      isActive?: boolean;
    },
  ) {
    return this.promoCodes.create(body);
  }
}


import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
@Controller('payment')
export class PaymentController {
    constructor(
        private paymentService: PaymentService,
        private userService: UsersService,
        private authService: AuthService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createPayment(@Body() createPaymentDto: any) {
        return this.paymentService.processPayment(createPaymentDto);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getPayment(@Param('id') id: string) {
        return this.paymentService.getPayment(id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllPayments() {
        return this.paymentService.getAllPayments();
    }

    @Get('by-site/:siteId')
    @UseGuards(JwtAuthGuard)
    async getPaymentBySite(@Param('siteId') siteId: string) {
        return await this.paymentService.getPaymentBySite(siteId);
    }
}

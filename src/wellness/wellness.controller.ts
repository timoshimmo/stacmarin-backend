
import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { WellnessService } from './wellness.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { SyncHealthDataDto } from './dto/sync-health-data.dto';

@UseGuards(JwtAuthGuard)
@Controller('wellness')
export class WellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Post('sync')
  async syncHealthData(@GetUser() user: User, @Body() data: SyncHealthDataDto) {
    return this.wellnessService.syncData(user, data);
  }

  @Get('today')
  async getToday(@GetUser() user: User) {
    return this.wellnessService.getDailySummary(user);
  }

  @Get('history')
  async getHistory(@GetUser() user: User) {
    return this.wellnessService.getWeeklyHistory(user);
  }

  // This endpoint would be the callback for Google OAuth
  // Frontend redirects user to Google -> Google redirects here -> We get code -> Exchange for token
  @Get('google-fit/callback')
  async googleFitCallback(@Query('code') code: string, @GetUser() user: User) {
     // 1. Exchange code for access token using Google APIs
     // 2. Call this.wellnessService.fetchGoogleFitData(token)
     // 3. Save data
     return { message: "Google Fit sync simulation: Success (Requires Cloud Credentials)" };
  }
}

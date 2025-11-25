import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(
    @Body() createSurveyResponseDto: CreateSurveyResponseDto,
    @GetUser() user: User,
  ) {
    return this.surveysService.create(createSurveyResponseDto, user);
  }
}

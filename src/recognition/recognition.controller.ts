import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RecognitionService } from './recognition.service';
import { CreateRecognitionDto } from './dto/create-recognition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('recognitions')
export class RecognitionController {
  constructor(private readonly recognitionService: RecognitionService) {}

  @Post()
  create(
    @Body() createRecognitionDto: CreateRecognitionDto,
    @GetUser() user: User,
  ) {
    return this.recognitionService.create(createRecognitionDto, user);
  }

  @Get()
  findAll() {
    return this.recognitionService.findAll();
  }
}

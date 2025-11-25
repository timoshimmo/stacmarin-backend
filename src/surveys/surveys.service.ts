import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SurveyResponse } from './entities/survey-response.entity';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponse>,
  ) {}

  async create(
    createSurveyResponseDto: CreateSurveyResponseDto,
    user: User,
  ): Promise<SurveyResponse> {
    const response = new this.surveyResponseModel({
      ...createSurveyResponseDto,
      user: user.id,
    });
    return response.save();
  }
}


import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HealthData } from './entities/health-data.entity';
import { SyncHealthDataDto } from './dto/sync-health-data.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WellnessService {
  constructor(
    @InjectModel(HealthData.name) private healthDataModel: Model<HealthData>,
  ) {}

  async syncData(user: User, data: SyncHealthDataDto): Promise<HealthData> {
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0); // Normalize to start of day

    const update = { ...data, user: user.id, date };
    
    // Upsert: Update if exists for this day, otherwise insert
    const healthData = await this.healthDataModel.findOneAndUpdate(
      { user: user.id, date },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();

    return healthData;
  }

  async getDailySummary(user: User): Promise<HealthData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.healthDataModel.findOne({ user: user.id, date: today }).exec();
  }

  async getWeeklyHistory(user: User): Promise<HealthData[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    return this.healthDataModel.find({
      user: user.id,
      date: { $gte: lastWeek, $lte: today }
    }).sort({ date: 'asc' }).exec();
  }

  // Placeholder for real Google Fit API integration
  async fetchGoogleFitData(accessToken: string) {
    // In a real implementation, you would use axios to call:
    // https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate
    // mapping the response to SyncHealthDataDto objects
    throw new Error('Google Fit integration requires valid Google Cloud Credentials');
  }
}

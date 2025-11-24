
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WellnessService } from './wellness.service';
import { WellnessController } from './wellness.controller';
import { HealthData, HealthDataSchema } from './entities/health-data.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: HealthData.name, schema: HealthDataSchema }])],
  controllers: [WellnessController],
  providers: [WellnessService],
})
export class WellnessModule {}

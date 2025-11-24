
import { IsDateString, IsNumber, IsOptional, IsEnum, IsString } from 'class-validator';
import { HealthSource } from '../entities/health-data.entity';

export class SyncHealthDataDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @IsOptional()
  steps?: number;

  @IsNumber()
  @IsOptional()
  caloriesBurned?: number;

  @IsNumber()
  @IsOptional()
  sleepMinutes?: number;

  @IsNumber()
  @IsOptional()
  waterIntakeMl?: number;

  @IsNumber()
  @IsOptional()
  heartRateAvg?: number;

  @IsEnum(['AppleHealth', 'GoogleFit', 'Manual'])
  source: HealthSource;
}

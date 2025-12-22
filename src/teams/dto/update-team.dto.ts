import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamDto } from './create-team.dto';
import { IsOptional, IsArray, IsMongoId } from 'class-validator';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  memberIds?: string[];
}

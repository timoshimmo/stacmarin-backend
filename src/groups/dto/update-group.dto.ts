import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';
import { IsOptional, IsArray, IsMongoId } from 'class-validator';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  memberIds?: string[];
}

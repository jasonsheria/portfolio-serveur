import { IsString, IsOptional, IsEmail, IsMongoId, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CriterionDto {
  @IsString()
  @IsOptional()
  siteName?: string;

  @IsEmail()
  @IsOptional()
  userEmail?: string;
}

export class SearchPostsByCriteriaDto {
  @IsOptional()
  @IsMongoId()
  siteId?: string;

  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsString()
  tagName?: string;

  @IsOptional()
  @IsMongoId()
  tagId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  status?: string; // e.g., 'published', 'draft'

  @IsOptional()
  @IsString() // Assuming date strings for simplicity, can be Date objects with @Type(() => Date)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string; // e.g., 'createdAt', 'title'

  @IsOptional()
  @IsString() // 'asc' or 'desc'
  sortOrder?: string;

  // If you still need to support an array of criteria for some specific endpoint,
  // you could add it here, but the primary usage seems to be flat parameters.
  // @IsOptional()
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => CriterionDto)
  // criteria?: CriterionDto[];
}


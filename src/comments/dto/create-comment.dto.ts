import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  post: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  parentComment?: string;
}

import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  post: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

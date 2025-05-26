import { IsString, IsNotEmpty } from 'class-validator';

export class CreateLikeDto {
  @IsString()
  @IsNotEmpty()
  post: string;
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto, VerifyTotpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.totpCode);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password')
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtUser) {
    return this.auth.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup(@CurrentUser() user: JwtUser) {
    return this.auth.startTwoFactor({ id: user.sub, email: user.email, role: user.role as Role });
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  verify(@CurrentUser() user: JwtUser, @Body() dto: VerifyTotpDto) {
    return this.auth.verifyTwoFactor({ id: user.sub, email: user.email, role: user.role as Role }, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disable(@CurrentUser() user: JwtUser) {
    return this.auth.disableTwoFactor(user.sub);
  }
}

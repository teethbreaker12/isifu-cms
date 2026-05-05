import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

type TokenUser = Pick<User, 'id' | 'email' | 'role'> & Partial<Pick<User, 'name' | 'twoFactorEnabled'>>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, totpCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      const normalizedCode = this.normalizeTotpCode(totpCode);
      if (!normalizedCode) {
        return { requiresTwoFactor: true, email: user.email };
      }
      if (!user.twoFactorSecret || !this.checkTotp(normalizedCode, user.twoFactorSecret)) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user?.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
        throw new ForbiddenException('Invalid refresh token');
      }
      return this.issueTokens(user);
    } catch {
      throw new ForbiddenException('Invalid refresh token');
    }
  }

  async logout(userId: number) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    return { ok: true };
  }

  async me(userId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true },
    });
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Invalid current password');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        refreshTokenHash: null,
      },
    });
    return { ok: true };
  }

  async startTwoFactor(user: TokenUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (dbUser.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    const secret = authenticator.generateSecret();
    const service = this.config.get<string>('CMS_NAME', 'OlMedia CMS');
    const otpauth = authenticator.keyuri(user.email, service, secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    await this.prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
    return { secret, qrCode, otpauth };
  }

  async verifyTwoFactor(user: TokenUser, code: string) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    const normalizedCode = this.normalizeTotpCode(code);
    if (!dbUser?.twoFactorSecret || !normalizedCode || !this.checkTotp(normalizedCode, dbUser.twoFactorSecret)) {
      throw new UnauthorizedException('Invalid two-factor code');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    return { enabled: true };
  }

  async disableTwoFactor(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    return { enabled: false };
  }

  private async issueTokens(user: TokenUser) {
    const payload = { sub: user.id, email: user.email, role: user.role as Role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as never,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d') as never,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: 'name' in user ? user.name : undefined,
        role: user.role,
        twoFactorEnabled: 'twoFactorEnabled' in user ? user.twoFactorEnabled : undefined,
      },
    };
  }

  private normalizeTotpCode(code?: string) {
    const normalized = code?.replace(/[\s-]/g, '') ?? '';
    return normalized.length > 0 ? normalized : undefined;
  }

  private checkTotp(code: string, secret: string) {
    authenticator.options = { window: 1 };
    return authenticator.check(code, secret);
  }
}

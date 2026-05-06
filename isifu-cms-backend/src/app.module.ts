import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContentTypesModule } from './content-types/content-types.module';
import { ContentEntriesModule } from './content-entries/content-entries.module';
import { PagesModule } from './pages/pages.module';
import { MediaModule } from './media/media.module';
import { StatsModule } from './stats/stats.module';
import { FormsModule } from './forms/forms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentTypesModule,
    ContentEntriesModule,
    PagesModule,
    MediaModule,
    FormsModule,
    StatsModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CommonModule } from './common/common.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AgencyModule } from './modules/agency/agency.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { PlansModule } from './modules/plans/plans.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { ActionsModule } from './modules/actions/actions.module';
import { CrmModule } from './modules/crm/crm.module';
import { HealthModule } from './modules/health/health.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SitesModule } from './modules/sites/sites.module';
import { BillingModule } from './modules/billing/billing.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { VoiceModule } from './modules/voice/voice.module';
import { SocialPlannerModule } from './modules/social-planner/social-planner.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),
    CommonModule,
    PermissionsModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'nethylo'),
        password: config.get<string>('DB_PASSWORD', 'nethylo_secret'),
        database: config.get<string>('DB_NAME', 'nethylo'),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        synchronize: config.get<boolean>('DB_SYNCHRONIZE', false),
        migrationsRun: config.get<boolean>('DB_MIGRATIONS_RUN', false),
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TenantsModule,
    UsersModule,
    PlansModule,
    IntegrationsModule,
    ConversationsModule,
    MessagesModule,
    ContactsModule,
    DashboardModule,
    SystemConfigModule,
    ActionsModule,
    CrmModule,
    HealthModule,
    SitesModule,
    BillingModule,
    ReputationModule,
    AffiliatesModule,
    MembershipsModule,
    AgencyModule,
    CampaignsModule,
    AnalyticsModule,
    MobileModule,
    VoiceModule,
    SocialPlannerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}

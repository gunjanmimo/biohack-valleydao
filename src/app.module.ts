import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandModule } from 'nestjs-command';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { BdModule } from './bd/bd.module';
import { TdModule } from './td/td.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantModule } from './assistant/assistant.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'admin',
      database: 'phlo',
      entities: [__dirname + '/**/*.schema{.ts,.js}'],
      synchronize: true,
    }),
    CommandModule,
    ProjectModule,
    BdModule,
    TdModule,
    AssistantModule,
  ],
  providers: [AppService],
})
export class AppModule {}
